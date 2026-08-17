/* MeatMaster — Sell-By Scanner (BETA)
   ==================================================================
   Kyle's agreed design: barcode locks FIRST (fast, reliable), then OCR
   reads the Sell By date on later frames as a best-effort. The barcode
   decode (~10ms) and the OCR (~hundreds of ms) are kept decoupled so the
   working scanner is never slowed down.

     1. Point at the label. zbar decodes the barcode -> product identified
        (blue lock). This part works today.
     2. OCR takes a best-effort read of the Sell By (top-right, MM.DD.YY),
        using the barcode's position to know where to look.
     3. You CONFIRM or type the date — manual entry is always there, so the
        screen is useful even when OCR misses.
     4. dates.js turns the date into PULL (today) / MARK DOWN (tomorrow) /
        OK, and it's added to today's list.

   HONEST STATUS: the OCR read is unproven on real hardware — it needs
   tuning against your actual scan frames. The barcode ID + manual confirm
   are solid. Treat the auto-read as a helper, not gospel.

   The OCR engine (Tesseract, vendored in /vendor/tesseract) is LAZY-LOADED
   on first open and cached by the service worker — so open this once on
   Wi-Fi and it works offline after that.

   SELF-CONTAINED: owns its overlay + camera, never touches the count.
   ================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'mm.sellby.v1';

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadAll() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function loadToday() { return loadAll()[todayKey()] || []; }
  function saveToday(list) {
    var all = loadAll(); all[todayKey()] = list;
    var keys = Object.keys(all).sort().slice(-14); var t = {}; keys.forEach(function (k) { t[k] = all[k]; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(t)); } catch (e) {}
  }

  function el(tag, cls, text) { var d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }

  /* ---- lazy OCR engine ---- */
  var tessWorker = null, tessLoading = null;
  function loadTesseract() {
    if (tessWorker) return Promise.resolve(tessWorker);
    if (tessLoading) return tessLoading;
    tessLoading = new Promise(function (resolve, reject) {
      var base = location.origin + '/vendor/tesseract/';
      function mk() {
        if (!window.Tesseract) { reject(new Error('engine missing')); return; }
        window.Tesseract.createWorker('eng', 1, {
          workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: false
        }).then(function (w) {
          return w.setParameters({ tessedit_char_whitelist: '0123456789/.- ', tessedit_pageseg_mode: '6' })
            .then(function () { tessWorker = w; resolve(w); });
        }).catch(reject);
      }
      if (window.Tesseract) { mk(); return; }
      var s = document.createElement('script');
      s.src = '/vendor/tesseract/tesseract.min.js';
      s.onload = mk;
      s.onerror = function () { reject(new Error('OCR engine unavailable offline — open once on Wi-Fi')); };
      document.head.appendChild(s);
    });
    return tessLoading;
  }

  /* ---- product identification from a decoded barcode ---- */
  function identify(code) {
    try {
      if (window.MMProducts && typeof window.MMProducts.findByCode === 'function') {
        var p = window.MMProducts.findByCode(code);
        if (p) return { name: p.name || p.sheetName || ('PLU ' + (p.plu || code)), plu: p.plu || null };
      }
    } catch (e) {}
    // Fallback: pull a 4-digit PLU out of the 20+PLU+00000 or 02+PLU weighed forms.
    var plu = null;
    var m = String(code).match(/^20(\d{4})00000$/);            // corporate item code
    if (m) plu = m[1];
    if (!plu) { m = String(code).match(/^0?2\d(\d{4})/); if (m) plu = m[1]; }  // weighed EAN-13
    return { name: plu ? ('PLU ' + plu) : code, plu: plu };
  }

  /* ---- overlay ---- */
  var overlay, bodyEl, video, canvas, stream, running = false, rafId = null;
  var statusEl, lockEl, dateEl, listWrap;
  var locked = null;     // { code, name, plu }
  var lastDate = null;   // parsed {y,m,d} from OCR or manual
  var ocrBusy = false, ocrTried = false;

  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay');
    overlay.hidden = true;
    var bar = el('div', 'prod-bar');
    var back = el('button', 'prod-back', '‹'); back.setAttribute('aria-label', 'Close'); back.addEventListener('click', close);
    var title = el('span', 'prod-title', 'Sell-By Scanner (beta)');
    var closeB = el('button', 'prod-close', '×'); closeB.setAttribute('aria-label', 'Close'); closeB.addEventListener('click', close);
    bar.appendChild(back); bar.appendChild(title); bar.appendChild(closeB);
    bodyEl = el('div', 'prod-body');
    overlay.appendChild(bar); overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }

  function open() {
    ensure();
    overlay.hidden = false;
    document.body.classList.add('prod-open');
    render();
    startCamera();
    loadTesseract().catch(function () {});   // warm the engine
  }

  function close() {
    stopCamera();
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('prod-open');
  }

  function render() {
    bodyEl.innerHTML = ''; bodyEl.scrollTop = 0;

    bodyEl.appendChild(el('p', 'prod-note',
      'Point at the label’s barcode. It locks the product, then reads the Sell By. ' +
      'Confirm or type the date if the read is off.'));

    var stage = el('div', 'sb-stage');
    video = document.createElement('video');
    video.setAttribute('playsinline', ''); video.muted = true; video.className = 'sb-video';
    canvas = document.createElement('canvas');
    stage.appendChild(video);
    bodyEl.appendChild(stage);

    statusEl = el('div', 'sb-status', 'Starting camera…');
    bodyEl.appendChild(statusEl);

    lockEl = el('div', 'sb-lock'); lockEl.hidden = true;
    bodyEl.appendChild(lockEl);

    dateEl = el('div', 'sb-date'); dateEl.hidden = true;
    bodyEl.appendChild(dateEl);

    // manual entry (always available)
    var man = el('div', 'sb-manual');
    var mi = el('input', 'md-name'); mi.type = 'text'; mi.inputMode = 'numeric'; mi.placeholder = 'Type Sell By (MM/DD/YY)';
    mi.setAttribute('autocomplete', 'off');
    var mb = el('button', 'btn btn-block', 'Use this date');
    mb.addEventListener('click', function () {
      var d = parseTyped(mi.value);
      if (d) { lastDate = d; showDate('typed'); mi.value = ''; }
      else { statusEl.textContent = 'Couldn’t read that date — try MM/DD/YY.'; }
    });
    man.appendChild(mi); man.appendChild(mb);
    bodyEl.appendChild(man);

    listWrap = el('div', 'md-list-wrap');
    bodyEl.appendChild(listWrap);
    renderList();
  }

  function parseTyped(text) {
    var D = window.MMDates; if (!D || !text) return null;
    var p = D.parseSellBy(text);
    if (p && D.isRealDate(p)) return p;
    var m = String(text).match(/^\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*$/);
    if (m) { var d = { y: D.today().y, m: +m[1], d: +m[2] }; if (D.isRealDate(d)) return d; }
    return null;
  }

  /* ---- camera + decode loop ---- */
  function startCamera() {
    running = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (s) {
        stream = s; video.srcObject = s;
        return video.play();
      })
      .then(function () { statusEl.textContent = 'Point at the barcode…'; loop(); })
      .catch(function (e) { statusEl.textContent = 'Camera blocked. Allow camera access, or type the date below.'; });
  }
  function stopCamera() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    stream = null;
  }

  function loop() {
    if (!running) return;
    try {
      if (video.readyState >= 2 && window.zbarWasm) {
        var w = video.videoWidth, h = video.videoHeight;
        if (w && h) {
          var scale = 900 / Math.max(w, h);
          canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
          var ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          var id = ctx.getImageData(0, 0, canvas.width, canvas.height);
          window.zbarWasm.scanImageData(id).then(function (syms) {
            if (syms && syms.length) {
              var s = syms[0];
              var text = (typeof s.decode === 'function') ? s.decode() : String(s.data || '');
              onBarcode(text, s.points, id, canvas.width, canvas.height);
            }
          }).catch(function () {});
        }
      }
    } catch (e) {}
    rafId = requestAnimationFrame(loop);
  }

  function onBarcode(code, points, imageData, cw, ch) {
    if (!locked || locked.code !== code) {
      locked = identify(code); locked.code = code;
      ocrTried = false; lastDate = null;
      if (window.MMHaptic) MMHaptic.buzz('tick');
      lockEl.hidden = false;
      lockEl.innerHTML = '';
      lockEl.appendChild(el('div', 'sb-lock-name', locked.name));
      lockEl.appendChild(el('div', 'sb-lock-meta', 'Barcode locked' + (locked.plu ? ' · PLU ' + locked.plu : '')));
      statusEl.textContent = 'Reading the Sell By date…';
    }
    // best-effort OCR once per lock (don't hammer it every frame)
    if (!ocrTried && !ocrBusy) { ocrTried = true; tryOcr(points, imageData, cw, ch); }
  }

  function tryOcr(points, imageData, cw, ch) {
    ocrBusy = true;
    loadTesseract().then(function (worker) {
      // Crop a generous region around the barcode (the date sits near it),
      // clamped to the frame. v1 = no deskew; real frames are near-upright.
      var box = pointsBox(points, cw, ch);
      var pad = box ? Math.max(box.w, box.h) : Math.max(cw, ch);
      var x0 = box ? Math.max(0, box.x - pad) : 0;
      var y0 = box ? Math.max(0, box.y - pad) : 0;
      var x1 = box ? Math.min(cw, box.x + box.w + pad) : cw;
      var y1 = box ? Math.min(ch, box.y + box.h + pad) : ch;
      var cw2 = Math.max(1, x1 - x0), ch2 = Math.max(1, y1 - y0);

      var crop = document.createElement('canvas'); crop.width = cw2; crop.height = ch2;
      var cctx = crop.getContext('2d');
      var src = document.createElement('canvas'); src.width = cw; src.height = ch;
      src.getContext('2d').putImageData(imageData, 0, 0);
      cctx.drawImage(src, x0, y0, cw2, ch2, 0, 0, cw2, ch2);

      return worker.recognize(crop).then(function (r) {
        ocrBusy = false;
        var txt = (r.data.text || '');
        var d = findDate(txt);
        if (d) { lastDate = d; showDate('read'); }
        else { statusEl.textContent = 'Couldn’t read the date — type it below.'; }
      });
    }).catch(function (e) {
      ocrBusy = false;
      statusEl.textContent = (String(e && e.message || e).indexOf('Wi-Fi') >= 0)
        ? 'OCR engine not cached yet — open once on Wi-Fi. Type the date for now.'
        : 'OCR unavailable — type the date below.';
    });
  }

  function pointsBox(points, cw, ch) {
    if (!points || !points.length) return null;
    var xs = points.map(function (p) { return p.x; }), ys = points.map(function (p) { return p.y; });
    var x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
    return { x: x, y: y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
  }

  // Pull the first plausible sell-by out of OCR text.
  function findDate(text) {
    var D = window.MMDates; if (!D) return null;
    var cands = String(text).match(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/g) || [];
    for (var i = 0; i < cands.length; i++) {
      var p = D.parseSellBy(cands[i]);
      if (p && D.isPlausibleSellBy(p)) return p;
    }
    return null;
  }

  function showDate(sourceLabel) {
    var D = window.MMDates; if (!D || !lastDate) return;
    var st = D.classify(lastDate);
    dateEl.hidden = false;
    dateEl.innerHTML = '';
    dateEl.style.setProperty('--vc', st.color);
    dateEl.className = 'sb-date is-' + st.key;
    dateEl.appendChild(el('div', 'sb-date-read', 'Sell By ' + D.fmt(lastDate) + (sourceLabel === 'read' ? '  (read)' : '')));
    dateEl.appendChild(el('div', 'sb-date-verdict', st.label));
    var save = el('button', 'btn btn-primary btn-block', 'Confirm — add to list');
    save.addEventListener('click', addCurrent);
    dateEl.appendChild(save);
    if (st.flash && window.MMHaptic) MMHaptic.buzz(st.key);
  }

  function addCurrent() {
    if (!lastDate) return;
    var list = loadToday();
    list.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: (locked && locked.name) || 'Item', plu: (locked && locked.plu) || null,
      sellBy: lastDate, ts: Date.now()
    });
    saveToday(list);
    if (window.MMHaptic) MMHaptic.buzz('ok');
    dateEl.hidden = true; lockEl.hidden = true; locked = null; lastDate = null; ocrTried = false;
    statusEl.textContent = 'Added. Point at the next label…';
    renderList();
  }

  function renderList() {
    var D = window.MMDates; if (!D) return;
    listWrap.innerHTML = '';
    var list = loadToday();
    var head = el('div', 'md-list-head');
    head.appendChild(el('span', null, 'Scanned today'));
    if (list.length) { var c = el('button', 'md-clear', 'Clear'); c.addEventListener('click', function () { saveToday([]); renderList(); }); head.appendChild(c); }
    listWrap.appendChild(head);
    if (!list.length) { listWrap.appendChild(el('p', 'md-empty', 'Nothing scanned yet.')); return; }
    var rows = list.map(function (e) { return { e: e, status: D.classify(e.sellBy), sellBy: e.sellBy }; });
    rows.sort(D.byUrgency);
    var ul = el('ul', 'md-list');
    rows.forEach(function (r) {
      var st = r.status;
      var li = el('li', 'md-row is-' + st.key); li.style.setProperty('--vc', st.color);
      var main = el('div', 'md-row-main');
      main.appendChild(el('div', 'md-row-date', D.fmt(r.sellBy)));
      main.appendChild(el('div', 'md-row-name', r.e.name + (r.e.plu ? ' · ' + r.e.plu : '')));
      li.appendChild(main);
      li.appendChild(el('div', 'md-row-tag', st.label));
      var x = el('button', 'md-row-x', '×'); x.setAttribute('aria-label', 'Remove');
      x.addEventListener('click', function () { saveToday(loadToday().filter(function (e) { return e.id !== r.e.id; })); renderList(); });
      li.appendChild(x);
      ul.appendChild(li);
    });
    listWrap.appendChild(ul);
  }

  window.MMSellByScanner = { open: open, close: close };

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-sellby-scan');
    if (b) b.addEventListener('click', open);
  });
})();
