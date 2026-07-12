/* MeatMaster — camera barcode scanner (Session 2)
   Engine: zbar (WebAssembly, in vendor/zbar/). Chosen after testing real
   store photos: zbar reads GS1 DataBar (the barcode type on variable-weight
   meat/deli labels), reads any rotation, and is more robust than ZXing on
   real, curved, glare-y packages.

   Per frame: scan the framed box raw first (fast; gets DataBar + clean codes),
   and on a miss scan an Otsu-thresholded copy (rescues glare/low contrast).
   Both proven against real photos. Plain vanilla JS, no build step.

   Flow: tap Start -> camera opens -> recognized barcodes auto-record.
   Unknown products pause on a card so the user can save or dismiss. */

(function () {
  'use strict';

  var el = function (id) { return document.getElementById(id); };

  var scanner   = el('scanner');
  var video     = el('cam');
  var idle      = el('cam-idle');
  var errBox    = el('cam-error');
  var errMsg    = el('cam-error-msg');
  var card      = el('result-card');
  var resFmt    = el('result-fmt');
  var resName   = el('result-name');
  var resCode   = el('result-code');
  var resNote   = el('result-note');
  var saveBtn   = el('btn-save-product');
  var controls  = el('scan-controls');
  var recentBox = el('recent');
  var recentList= el('recent-list');
  var recentNum = el('recent-count');
  var scanSub   = el('scan-sub');

  var running = false;   // camera on + decode loop active
  var paused = false;    // a result is showing; ignore new reads
  var stream = null;     // MediaStream (so we can turn the camera off)
  var scanTimer = null;  // decode-loop timer
  var blurSkips = 0;     // consecutive blurry frames skipped (anti-starvation)
  var lastCode = null, lastTime = 0;
  var recent = [];       // this-session scans (in memory)
  var toastTimer = null;

  // reusable work canvases (avoid per-frame allocation)
  var cropCanvas = null, cropCtx = null;   // the framed box, at full res
  var otsuCanvas = null, otsuCtx = null;    // thresholded copy for hard reads

  function show(node, on) { if (node) node.hidden = !on; }

  function toast(kind, title, sheetName, note) {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    resFmt.textContent = kind === 'dupe' ? 'POSSIBLE DUPLICATE' : 'RECORDED';
    resName.textContent = title;
    resCode.textContent = sheetName || '';
    resNote.textContent = note || '';
    card.classList.add('is-toast');
    card.classList.toggle('is-ok', kind !== 'dupe');
    card.classList.toggle('is-dupe', kind === 'dupe');
    show(saveBtn, false);
    show(card, true);
    toastTimer = setTimeout(function () {
      show(card, false);
      card.classList.remove('is-ok', 'is-dupe', 'is-toast');
    }, kind === 'dupe' ? 1600 : 1000);
  }

  /* ---------- decode engine (zbar) ---------- */
  // Turn zbar's symbol name (e.g. "ZBAR_EAN13") into a friendly label.
  function prettyType(t) {
    if (!t) return 'BARCODE';
    var s = String(t).replace(/^ZBAR_/, '');
    var map = {
      EAN13: 'EAN-13', EAN8: 'EAN-8', UPCA: 'UPC-A', UPCE: 'UPC-E',
      ISBN13: 'ISBN-13', ISBN10: 'ISBN-10', CODE128: 'Code 128',
      CODE39: 'Code 39', CODE93: 'Code 93', CODABAR: 'Codabar',
      I25: 'ITF', DATABAR: 'DataBar', DATABAR_EXP: 'DataBar', QRCODE: 'QR'
    };
    return map[s] || s.replace(/_/g, ' ');
  }

  // Rank barcode symbols so we pick a real *product* barcode, never a QR/2D
  // marketing code (e.g. a SmartLabel QR sitting next to the UPC on a chip bag).
  function symRank(typeName) {
    var t = String(typeName || '');
    if (/EAN13|UPCA|UPCE|EAN8|ISBN/.test(t)) return 3;              // retail linear
    if (/DATABAR/.test(t)) return 3;                                // meat/deli variable-weight
    if (/CODE128|CODE39|CODE93|CODABAR|I25|ITF/.test(t)) return 2;  // other linear
    return 1;  // QR / PDF417 / DataMatrix — only if nothing better (shown as a tappable link)
  }
  function pickBest(syms) {
    if (!syms || !syms.length) return null;
    var best = null, bestRank = 0;
    for (var i = 0; i < syms.length; i++) {
      var r = symRank(syms[i].typeName);
      if (r > bestRank) { bestRank = r; best = syms[i]; }
    }
    return best;   // null when only QR/2D codes were present → keep scanning
  }

  // Run zbar on a canvas. Returns { text, type } or null.
  function zbarScan(cnv) {
    if (!window.zbarWasm) { diag.zbar = 'not loaded'; return Promise.resolve(null); }
    var id = cnv.getContext('2d', { willReadFrequently: true })
               .getImageData(0, 0, cnv.width, cnv.height);
    return window.zbarWasm.scanImageData(id).then(function (syms) {
      diag.zbar = 'ready'; diag.err = '';
      var s = pickBest(syms);
      if (s) {
        var text = (typeof s.decode === 'function') ? s.decode() : String(s.data || '');
        return { text: text, type: s.typeName };
      }
      return null;
    }).catch(function (e) {
      diag.zbar = 'error';
      diag.err = (e && e.message ? e.message : String(e)).slice(0, 44);
      return null;
    });
  }

  // Write an Otsu (auto-threshold) black/white version of src into dst.
  // This rescues barcodes lost to glare / low contrast (verified on real photos).
  function otsuInto(src, dst) {
    var w = src.width, h = src.height;
    dst.width = w; dst.height = h;
    var sd = src.getContext('2d', { willReadFrequently: true })
               .getImageData(0, 0, w, h).data;
    var n = w * h, gray = new Uint8Array(n), hist = new Uint32Array(256);
    for (var i = 0, p = 0; p < n; i += 4, p++) {
      var v = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) | 0;
      gray[p] = v; hist[v]++;
    }
    var sum = 0, k;
    for (k = 0; k < 256; k++) sum += k * hist[k];
    var sumB = 0, wB = 0, max = 0, thr = 127;
    for (k = 0; k < 256; k++) {
      wB += hist[k]; if (!wB) continue;
      var wF = n - wB; if (!wF) break;
      sumB += k * hist[k];
      var mB = sumB / wB, mF = (sum - sumB) / wF;
      var between = wB * wF * (mB - mF) * (mB - mF);
      if (between > max) { max = between; thr = k; }
    }
    var out = otsuCtx.createImageData(w, h), od = out.data;
    for (var q = 0, j = 0; q < n; q++, j += 4) {
      var b = gray[q] > thr ? 255 : 0;
      od[j] = od[j + 1] = od[j + 2] = b; od[j + 3] = 255;
    }
    otsuCtx.putImageData(out, 0, 0);
    return dst;
  }

  // Decode one framed-box canvas: raw first, Otsu on a miss.
  function decodeFrame(cnv) {
    return zbarScan(cnv).then(function (r) {
      if (r) return r;
      otsuInto(cnv, otsuCanvas);
      return zbarScan(otsuCanvas);
    });
  }

  // Cheap frame probe: average edge gradient ("sharp") and mean brightness.
  // Readable barcodes score sharp ~11+; a black/blank capture shows near-zero
  // brightness (a key on-device clue). Subsampled for speed.
  function frameStats(cnv) {
    var w = cnv.width, h = cnv.height;
    var d = cnv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    var step = 4, sum = 0, n = 0, bright = 0;
    for (var y = 0; y < h - step; y += step) {
      for (var x = 0; x < w - step; x += step) {
        var i = (y * w + x) * 4;
        var g  = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        var ix = (y * w + (x + step)) * 4;
        var iy = ((y + step) * w + x) * 4;
        var gx = d[ix] * 0.299 + d[ix + 1] * 0.587 + d[ix + 2] * 0.114;
        var gy = d[iy] * 0.299 + d[iy + 1] * 0.587 + d[iy + 2] * 0.114;
        sum += Math.abs(g - gx) + Math.abs(g - gy); bright += g; n++;
      }
    }
    return { sharp: n ? sum / n : 0, mean: n ? bright / n : 0 };
  }

  /* ---------- live on-device diagnostics (tap the version number to toggle) ---------- */
  var diagEl = null;
  var diagEnabled = false;
  var diag = { zbar: 'init', vid: '-', frame: '-', tries: 0, hits: 0, last: '-', err: '', fps: 0 };
  var fpsMark = 0, fpsCount = 0;
  function ensureDiag() {
    if (diagEl) return;
    diagEl = document.createElement('div');
    diagEl.className = 'diag';
    document.body.appendChild(diagEl);
  }
  function renderDiag() {
    if (!diagEl) return;
    diagEl.textContent =
      'engine: ' + diag.zbar + (diag.err ? ('  [' + diag.err + ']') : '') + '\n' +
      'camera: ' + diag.vid + '\n' +
      'frame:  ' + diag.frame + '\n' +
      'tries ' + diag.tries + '  hits ' + diag.hits + '  fps ' + diag.fps + '\n' +
      'last:   ' + diag.last;
  }

  // Ask the camera for continuous autofocus (macro-ish), so close-up barcodes
  // come in sharp. Support varies by device; failing is harmless.
  function applyFocus() {
    try {
      var track = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
      if (!track || !track.applyConstraints) return;
      track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
        .catch(function () {});
    } catch (e) {}
  }

  /* ---------- feedback ---------- */
  function feedback() {
    try {
      var ac = feedback._ac || (feedback._ac =
        new (window.AudioContext || window.webkitAudioContext)());
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.06;
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.08);
    } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate([35, 35, 35]); } catch (e) {} }
  }

  function friendlyError(err) {
    var name = (err && err.name) || '';
    if (!window.isSecureContext) {
      return 'The camera only works over a secure connection. On this computer ' +
             'use http://localhost. On the phone we’ll host it over https.';
    }
    if (name === 'NotAllowedError')  return 'Camera permission was blocked. Allow camera access for this site, then try again.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
    if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
    return 'Could not start the camera. ' + ((err && err.message) || '');
  }

  /* ---------- camera + decode loop ---------- */
  function start() {
    show(idle, false); show(errBox, false); show(card, false);
    paused = false;

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1920 },   // sharper feed = thinner bars resolved
        height: { ideal: 1080 }
      }
    }).then(function (s) {
      stream = s;
      video.srcObject = s;
      return video.play();
    }).then(function () {
      running = true;
      scanner.classList.add('is-live');
      show(controls, true);
      scanSub.textContent = 'Fill the box · hold steady · good light helps';
      applyFocus();   // nudge the camera toward sharp close-up frames
      ensureDiag(); diagEl.hidden = !diagEnabled;
      diag.tries = 0; diag.hits = 0; diag.last = '-'; fpsMark = Date.now(); fpsCount = 0;
      renderDiag();
      loop();
    }).catch(function (e) {
      errMsg.textContent = friendlyError(e);
      show(errBox, true); show(controls, false);
      scanner.classList.remove('is-live');
    });
  }

  function loop() {
    if (!running) return;
    if (paused || video.readyState < 2 || !video.videoWidth) {
      diag.vid = 'not ready (rs ' + video.readyState + ')'; renderDiag();
      scanTimer = setTimeout(loop, 90);
      return;
    }
    try {
      cropCanvas = cropCanvas || document.createElement('canvas');
      cropCtx = cropCtx || cropCanvas.getContext('2d', { willReadFrequently: true });
      if (!otsuCanvas) { otsuCanvas = document.createElement('canvas'); otsuCtx = otsuCanvas.getContext('2d', { willReadFrequently: true }); }

      // Grab nearly the whole frame (small edge trim only), at high resolution.
      // zbar finds a barcode anywhere in the image, so this is robust to exactly
      // how the barcode is framed and to the video's aspect/orientation.
      var vw = video.videoWidth, vh = video.videoHeight;
      var trim = 0.04;
      var sx = vw * trim, sy = vh * trim, sw = vw * (1 - 2 * trim), sh = vh * (1 - 2 * trim);
      var cap = 1200, scale = Math.min(1, cap / Math.max(sw, sh));
      cropCanvas.width = Math.round(sw * scale);
      cropCanvas.height = Math.round(sh * scale);
      cropCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);

      var st = frameStats(cropCanvas);
      diag.vid = vw + 'x' + vh + ' rs' + video.readyState;
      diag.frame = 'bright ' + st.mean.toFixed(0) + '  sharp ' + st.sharp.toFixed(1) +
                   '  ' + cropCanvas.width + 'x' + cropCanvas.height;

      // Only skip genuinely dead frames (near-black/blank); never starve.
      if (st.sharp < 3 && blurSkips < 3) {
        blurSkips++; renderDiag();
        scanTimer = setTimeout(loop, 45);
        return;
      }
      blurSkips = 0;

      decodeFrame(cropCanvas).then(function (res) {
        diag.tries++;
        fpsCount++;
        var nowT = Date.now();
        if (nowT - fpsMark >= 1000) { diag.fps = fpsCount; fpsCount = 0; fpsMark = nowT; }
        if (res && res.text) { diag.hits++; diag.last = res.text + ' (' + prettyType(res.type) + ')'; }
        renderDiag();
        if (res && res.text && running && !paused) {
          // require two consecutive identical, plausible reads before counting —
          // a single misdecode of a blurry/curved barcode won't survive this
          if (!isPlausibleCode(res.text, res.type)) {
            confirmCode = null; confirmHits = 0;
          } else if (res.text === confirmCode) {
            if (++confirmHits >= 2) { confirmCode = null; confirmHits = 0; onDecodeAuto(res); }
          } else {
            confirmCode = res.text; confirmHits = 1;
          }
        }
        if (running) scanTimer = setTimeout(loop, 60);
      });
    } catch (e) {
      diag.err = ('loop ' + (e && e.message ? e.message : e)).slice(0, 44);
      renderDiag();
      if (running) scanTimer = setTimeout(loop, 120);
    }
  }

  /* ---------- turning a scan into a result card ---------- */
  var scanToken = 0;
  var currentScan = null;
  var confirmCode = null, confirmHits = 0;   // require 2 consecutive identical reads

  // Reject implausible reads: formats prone to short misreads (I25/Code39) and
  // codes that aren't a valid retail length. Stops garbage (e.g. "561127") or a
  // one-off misdecode from being counted.
  function isPlausibleCode(text, type) {
    if (isUrl(text)) return true;
    var t = String(type || '');
    if (/I25|ITF|CODE39|CODABAR/.test(t)) return false;         // logistics / misread-prone
    var digits = String(text || '').replace(/\D/g, '');
    if (/DATABAR|CODE128/.test(t)) return digits.length >= 8;   // GS1 / variable length
    return digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14;
  }

  function isUrl(s) { return /^https?:\/\//i.test(s); }
  // GS1 Digital Link URLs carry the GTIN after "/01/" — pull it for a lookup.
  function gtinFromUrl(s) { var m = String(s).match(/\/01\/(\d{8,14})/); return m ? m[1] : null; }

  // Sprouts weighed barcodes embed the total price in a 4-digit field.
  // 13-digit "02…" -> digits 8-11; 12-digit "2…" -> digits 7-10. Returns "12.99" or null.
  function inferPrice(code) {
    var d = String(code || '').replace(/\D/g, ''), p = null;
    if (d.length === 13 && d.slice(0, 2) === '02') p = d.slice(8, 12);
    else if (d.length === 12 && d.charAt(0) === '2') p = d.slice(7, 11);
    if (p === null) return null;
    var cents = parseInt(p, 10);
    return cents ? (cents / 100).toFixed(2) : null;    // 0000 = reference, no price
  }

  function setCode(code) {
    if (isUrl(code)) {
      resCode.textContent = '';
      var a = document.createElement('a');
      a.href = code; a.textContent = code; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'result-link';
      resCode.appendChild(a);
    } else {
      resCode.textContent = code;
    }
  }

  // Ask a free public database (Open Food Facts) to name an unknown barcode.
  // Online-only, best-effort: offline or no-match simply leaves it "unknown".
  function enrichOnline(lookupCode, token, price) {
    if (!navigator.onLine) return;
    var gtin = String(lookupCode).replace(/\D/g, '');
    if (gtin.length < 8) return;
    fetch('https://world.openfoodfacts.org/api/v2/product/' + gtin + '.json?fields=product_name,brands')
      .then(function (r) { return r.json(); })
      .then(function (dat) {
        if (token !== scanToken) return;             // a newer scan replaced this one
        if (!dat || dat.status !== 1 || !dat.product) return;
        var nm = (dat.product.product_name || '').trim();
        var br = (dat.product.brands || '').split(',')[0].trim();
        var label = (br && nm && nm.toLowerCase().indexOf(br.toLowerCase()) < 0) ? (br + ' ' + nm) : (nm || br);
        if (!label) return;
        resName.textContent = label;
        resNote.textContent = 'Found online - Save product to keep name' + (price ? (' - ~$' + price) : '');
        // reflect the found name in the scan-tab log too (not just the card)
        var changed = false;
        recent.forEach(function (r) {
          if (r.code === lookupCode && (!r.name || r.name === 'Unknown product')) { r.name = label; changed = true; }
        });
        if (changed) renderRecent();
      })
      .catch(function () {});
  }

  function onDecode(result) {
    var code = result.text;
    var now = Date.now();
    if (code === lastCode && (now - lastTime) < 10000) return; // suppress same-package repeats
    lastCode = code; lastTime = now;
    var token = ++scanToken;

    paused = true;
    feedback();
    card.classList.remove('is-toast');
    resFmt.textContent = prettyType(result.type);
    setCode(code);

    var price = inferPrice(code);
    var product = window.MMProducts && window.MMProducts.findByCode(code);
    if (product) {
      currentScan = { code: code, product: product, price: price };
      resName.textContent = product.name;
      resNote.textContent = 'PLU ' + product.plu + (price ? (' · ~$' + price) : '');
      show(saveBtn, false);
    } else {
      currentScan = { code: code, product: null, price: price };
      resName.textContent = isUrl(code) ? 'Scanned link' : 'Unknown product';
      var bits = [];
      if (price) bits.push('reads ~$' + price);
      bits.push(isUrl(code) ? 'tap the link above' : 'not in the list yet');
      resNote.textContent = bits.join(' · ');
      show(saveBtn, !isUrl(code));
      // best-effort web identification (national brands); needs a connection
      var lookupCode = isUrl(code) ? gtinFromUrl(code) : code;
      if (lookupCode) enrichOnline(lookupCode, token, price);
    }
    show(card, true);
  }

  function onDecodeAuto(result) {
    var code = result.text;
    var now = Date.now();
    if (code === lastCode && (now - lastTime) < 2500) return; // debounce repeats
    lastCode = code; lastTime = now;
    var token = ++scanToken;

    paused = false;
    feedback();
    resFmt.textContent = prettyType(result.type);
    setCode(code);

    var price = inferPrice(code);
    var product = window.MMProducts && window.MMProducts.findByCode(code);
    if (product) {
      currentScan = { code: code, product: product, price: price };
      var scan = window.MMSession && window.MMSession.addScan({
        code: code,
        format: prettyType(result.type),
        product: product,
        price: price
      });
      var scanAt = new Date();
      recent.unshift({
        id: scan && scan.id,
        code: code,
        fmt: prettyType(result.type),
        at: scanAt,
        name: product.name,
        sheetName: product.sheetName || '',
        duplicate: scan && scan.duplicate
      });
      renderRecent();
      var scanTime = scanAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var scanMeta = code + ' · ' + scanTime + ' · ' + (scan && scan.duplicate ? 'Duplicate scan' : 'Counted +1');
      toast(scan && scan.duplicate ? 'dupe' : 'ok', product.name, product.sheetName || '', scanMeta);
      return;
    }

    if (isUrl(code)) {
      currentScan = { code: code, product: null, price: price };
      paused = true;
      resName.textContent = 'Scanned link';
      var linkBits = [];
      if (price) linkBits.push('reads ~$' + price);
      linkBits.push('tap the link above');
      resNote.textContent = linkBits.join(' - ');
      show(saveBtn, false);
      show(card, true);
      return;
    }

    currentScan = { code: code, product: null, price: price };
    var unknownScan = window.MMSession && window.MMSession.addScan({
      code: code,
      format: prettyType(result.type),
      product: null,
      name: 'Unknown product',
      price: price
    });
    recent.unshift({
      id: unknownScan && unknownScan.id,
      code: code,
      fmt: prettyType(result.type),
      at: new Date(),
      name: 'Unknown product',
      sheetName: '',
      duplicate: unknownScan && unknownScan.duplicate
    });
    renderRecent();
    paused = true;
    resName.textContent = 'Unknown product';
    var bits = [];
    if (price) bits.push('reads ~$' + price);
    if (unknownScan && unknownScan.duplicate) bits.push('possible duplicate');
    bits.push('counted +1');
    resNote.textContent = bits.join(' - ');
    show(saveBtn, true);
    enrichOnline(code, token, price);
    show(card, true);
  }

  function confirmScan() {
    show(card, false);
    card.classList.remove('is-toast');
    paused = false;
    if (running && !scanTimer) loop();
  }

  function saveProduct() {
    if (!currentScan || !window.MMProducts) return;
    card.classList.remove('is-toast');
    var code = currentScan.code;
    var plu = window.MMProducts.extractPlu ? window.MMProducts.extractPlu(code) : null;
    var suggested = resName.textContent === 'Unknown product' ? '' : resName.textContent;
    var name = window.prompt('Product name', suggested);
    if (!name) return;
    var defaultCategory = /chicken|truffle|saute|meal|marry/i.test(name) ? 'Ready-Made' : (plu ? 'Beef' : 'Unknown');
    var category = window.prompt('Category', defaultCategory);
    var saved = window.MMProducts.save({
      plu: plu || '',
      upc: code,
      name: name.trim(),
      sheetName: 'Saved from scan',
      category: category && category.trim() ? category.trim() : defaultCategory,
      casePosition: 9999
    });
    if (saved) {
      currentScan.product = saved;
      resName.textContent = saved.name;
      resNote.textContent = (saved.plu ? ('PLU ' + saved.plu) : 'Saved on phone') + (currentScan.price ? (' · ~$' + currentScan.price) : '');
      show(saveBtn, false);
      // update the scan-tab log entries for this code, then re-render everything
      recent.forEach(function (r) { if (r.code === code) r.name = saved.name; });
      renderRecent();
      if (window.MMRenderProducts) window.MMRenderProducts();
      if (window.MMSession && window.MMSession.applyProductToCode) window.MMSession.applyProductToCode(code, saved);
      if (window.MMSession) window.MMSession.render();
    }
  }

  function rescan() {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    show(card, false);
    card.classList.remove('is-ok', 'is-dupe');
    card.classList.remove('is-toast');
    paused = false;
    lastCode = null;
    lastTime = 0;
    if (running && !scanTimer) loop();
    if (!running && stream) {
      running = true;
      scanner.classList.add('is-live');
      show(controls, true);
      loop();
    }
  }

  function renderRecentLegacy() {
    recentNum.textContent = recent.length;
    show(recentBox, recent.length > 0);
    recentList.innerHTML = '';
    recent.slice(0, 40).forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'recent-item';
      if (r.duplicate) li.className += ' is-duplicate';
      var t = r.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var product = (!r.name && window.MMProducts) ? window.MMProducts.findByCode(r.code) : null;
      var code = document.createElement('span');
      code.className = 'ri-code'; code.textContent = r.name || (product && product.name) || r.code;
      var meta = document.createElement('span');
      if (r.duplicate) meta.dataset.duplicate = '1';
      meta.className = 'ri-meta'; meta.textContent = r.fmt + ' · ' + t;
      if (r.duplicate) meta.textContent = 'Duplicate Scan - ' + r.fmt + ' - ' + t;
      li.appendChild(code); li.appendChild(meta);
      recentList.appendChild(li);
    });
  }

  function renderRecent() {
    recentNum.textContent = recent.length;
    show(recentBox, recent.length > 0);
    recentList.innerHTML = '';
    recent.slice(0, 40).forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'scan-swipe recent-swipe' + (r.duplicate ? ' is-duplicate' : '') + (r.confirmed ? ' is-confirmed' : '');
      var actions = document.createElement('div');
      actions.className = 'scan-actions';
      if (r.duplicate) {
        var keep = document.createElement('button');
        keep.className = 'scan-action scan-keep';
        keep.type = 'button';
        keep.textContent = 'Confirm';
        keep.addEventListener('click', function () { confirmRecent(r.id); });
        actions.appendChild(keep);
      }
      var edit = document.createElement('button');
      edit.className = 'scan-action scan-edit';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function () {
        if (window.MMEditProductByCode) window.MMEditProductByCode(r.code);
      });
      actions.appendChild(edit);
      var remove = document.createElement('button');
      remove.className = 'scan-action scan-delete';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () { removeRecent(r.id); });
      actions.appendChild(remove);

      var row = document.createElement('div');
      row.className = 'recent-item' + (r.duplicate ? ' is-duplicate' : '') + (r.confirmed ? ' is-confirmed' : '');
      var t = r.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var product = window.MMProducts ? window.MMProducts.findByCode(r.code) : null;
      var code = document.createElement('span');
      code.className = 'ri-code';
      // prefer the live product name so entries re-resolve once an item becomes
      // known (a stored "Unknown product" must not stick forever)
      var known = product && product.name;
      code.textContent = known || (r.name && r.name !== 'Unknown product' ? r.name : null) || r.name || r.code;
      if (r.duplicate) {
        var badge = document.createElement('span');
        badge.className = 'dupe-badge';
        badge.textContent = 'Duplicate Scan';
        code.appendChild(badge);
      } else if (r.confirmed) {
        var confirmed = document.createElement('span');
        confirmed.className = 'confirmed-badge';
        confirmed.textContent = 'Confirmed';
        code.appendChild(confirmed);
      }
      var sheet = document.createElement('span');
      sheet.className = 'ri-sheet';
      sheet.textContent = r.sheetName || (product && product.sheetName) || '—';
      var meta = document.createElement('span');
      meta.className = 'ri-meta';
      meta.textContent = r.code + ' · ' + t;
      row.appendChild(code);
      row.appendChild(sheet);
      row.appendChild(meta);
      li.appendChild(actions);
      li.appendChild(row);
      wireRecentSwipe(li, row);
      recentList.appendChild(li);
    });
  }

  function confirmRecent(scanId) {
    if (!scanId) return;
    recent = recent.map(function (r) {
      if (r.id === scanId && r.duplicate) {
        var copy = {};
        Object.keys(r).forEach(function (k) { copy[k] = r[k]; });
        copy.duplicate = false;
        copy.confirmed = true;
        return copy;
      }
      return r;
    });
    if (window.MMSession && window.MMSession.confirmNotDuplicate) window.MMSession.confirmNotDuplicate(scanId);
    renderRecent();
  }

  function removeRecent(scanId) {
    recent = recent.filter(function (r) { return r.id !== scanId; });
    if (window.MMSession && window.MMSession.removeScan) window.MMSession.removeScan(scanId);
    renderRecent();
  }

  function wireRecentSwipe(li, row) {
    var startX = 0, startY = 0, startOffsetX = 0, currentX = 0, dragging = false, swiping = false;
    function setX(x) {
      currentX = Math.max(-228, Math.min(0, x));
      row.style.transform = 'translateX(' + currentX + 'px)';
      li.classList.toggle('is-open', currentX < -48);
    }
    row.addEventListener('pointerdown', function (e) {
      startX = e.clientX;
      startY = e.clientY;
      startOffsetX = currentX;
      dragging = true;
      swiping = false;
    });
    row.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!swiping) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          dragging = false;
          return;
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        swiping = true;
        row.setPointerCapture(e.pointerId);
      }
      var next = startOffsetX + dx;
      if (next < 0 || startOffsetX < 0) {
        e.preventDefault();
        setX(next);
      }
    });
    row.addEventListener('pointerup', function () {
      if (!swiping) {
        dragging = false;
        return;
      }
      dragging = false;
      swiping = false;
      setX(currentX < -56 ? -228 : 0);
    });
    row.addEventListener('pointercancel', function () {
      dragging = false;
      swiping = false;
      setX(0);
    });
  }

  function stop() {
    running = false; paused = false;
    if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    try { video.srcObject = null; } catch (e) {}
    scanner.classList.remove('is-live');
    show(controls, false); show(card, false); show(errBox, false);
    show(idle, true);
    if (diagEl) diagEl.hidden = true;
    scanSub.textContent = 'Walk the case · scan each package';
  }

  /* ---------- wiring ---------- */
  el('btn-start').addEventListener('click', start);
  el('btn-retry').addEventListener('click', start);
  el('btn-stop').addEventListener('click', stop);
  el('btn-confirm').addEventListener('click', confirmScan);
  el('btn-rescan').addEventListener('click', rescan);
  if (saveBtn) saveBtn.addEventListener('click', saveProduct);

  // turn the camera off when navigating away from the Scan tab
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.goto !== 'scan' && running) stop();
    });
  });

  // tap the version number to show/hide the tech diagnostics
  var stamp = el('build-stamp');
  if (stamp) stamp.addEventListener('click', function () {
    diagEnabled = !diagEnabled;
    ensureDiag();
    diagEl.hidden = !(diagEnabled && running);
  });

  // exposed so we can verify the decode path without a physical camera
  window.MMScanner = {
    start: start,
    stop: stop,
    getRecent: function () { return recent.slice(); },
    decodeImage: function (url) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
          if (!otsuCanvas) { otsuCanvas = document.createElement('canvas'); otsuCtx = otsuCanvas.getContext('2d', { willReadFrequently: true }); }
          decodeFrame(c).then(function (r) {
            if (r && r.text) resolve({ text: r.text, format: prettyType(r.type) });
            else reject(new Error('not detected'));
          });
        };
        img.onerror = function () { reject(new Error('image failed to load')); };
        img.src = url;
      });
    }
  };
})();
