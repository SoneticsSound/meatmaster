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
  var resPlu    = el('result-plu');
  var resName   = el('result-name');
  var resCode   = el('result-code');
  var resPrice  = el('result-price');
  var resSellby = el('result-sellby');
  var resNote   = el('result-note');
  var saveBtn   = el('btn-save-product');
  var unitBtn   = el('btn-unit-scan');
  var controls  = el('scan-controls');
  var recentBox = el('recent');
  var recentList= el('recent-list');
  var recentNum = el('recent-count');
  var scanSub   = el('scan-sub');
  var sellbyEl  = el('sellby-readout');

  var running = false;   // camera on + decode loop active
  var paused = false;    // a result is showing; ignore new reads
  var stream = null;     // MediaStream (so we can turn the camera off)
  var scanTimer = null;  // decode-loop timer
  var blurSkips = 0;     // consecutive blurry frames skipped (anti-starvation)
  var lastCode = null, lastTime = 0;
  var recent = [];       // this-session scans (in memory)
  var toastTimer = null;
  var toastScanId = null;

  // reusable work canvases (avoid per-frame allocation)
  var cropCanvas = null, cropCtx = null;   // the framed box, at full res
  var otsuCanvas = null, otsuCtx = null;    // thresholded copy for hard reads
  var rotCanvas = null, rotCtx = null;      // 90°-rotated copy for angled labels

  function show(node, on) { if (node) node.hidden = !on; }

  function toast(kind, title, sheetName, note, scanId) {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastScanId = kind === 'dupe' ? scanId : null;
    // Lock this barcode for as long as ANY result card is showing — the same
    // item can't silently re-count while you're reading its pull/markdown card.
    // Cleared when the card dismisses (below), on a different item, or on a tap.
    heldStuck = true;
    resFmt.textContent = kind === 'dupe' ? 'POSSIBLE DUPLICATE' : 'RECORDED';
    setResName(title);
    resCode.textContent = sheetName || '';
    resNote.textContent = note || '';
    card.classList.add('is-toast');
    card.classList.toggle('is-ok', kind !== 'dupe');
    card.classList.toggle('is-dupe', kind === 'dupe');
    show(saveBtn, false);
    show(unitBtn, kind === 'dupe' && !!scanId);
    show(card, true);
    // Both cards auto-dismiss: a RECORDED confirmation after 1s, a POSSIBLE
    // DUPLICATE hangs a bit longer (2.5s) so there's time to hit "Count Unit",
    // then clears itself — dupes can still be removed from the log later. The
    // dupe barcode stays "stuck" (heldStuck) after the card goes, so it never
    // silently re-counts; only a different item or a tap re-enables it.
    // Hold the card until the sell-by OCR for this scan has LOCKED a date or
    // GIVEN UP (pendingSellBy cleared), so the reader can finish while the same
    // barcode stays locked — the OCR window can no longer produce a phantom
    // re-count. Minimum on-screen time is `base`; a hard cap stops a stuck
    // reader from pinning the card forever.
    var base = kind === 'dupe' ? 2500 : 1000;
    var cap = 6000, start = Date.now();
    function maybeDismiss() {
      var elapsed = Date.now() - start;
      if (elapsed < cap && (elapsed < base || pendingSellBy)) {
        toastTimer = setTimeout(maybeDismiss, 150);
        return;
      }
      show(card, false);
      card.classList.remove('is-ok', 'is-dupe', 'is-toast');
      show(unitBtn, false);
      toastScanId = null;
      heldStuck = false;   // card gone → back to presence-based release (re-count only after it leaves view)
    }
    toastTimer = setTimeout(maybeDismiss, base);
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
        return { text: text, type: s.typeName, points: s.points || null };
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
  // Rotate src 90° clockwise into dst. zbar reads bars along horizontal scan
  // lines, so a label held "sideways" can fail on the upright frame but read
  // cleanly once rotated — this is what lets a barcode decode at any angle
  // instead of only when it happens to line up.
  function rotate90(src, dst) {
    dst.width = src.height; dst.height = src.width;
    var c = dst.getContext('2d', { willReadFrequently: true });
    c.save();
    c.translate(dst.width, 0);       // dst.width === src.height
    c.rotate(Math.PI / 2);
    c.drawImage(src, 0, 0);
    c.restore();
  }
  // A hit found on the rotated canvas has rotated corner points; map them back
  // to the original frame so the sell-by OCR still anchors correctly.
  // Forward map was (ox,oy) -> (srcH - oy, ox); inverse: ox = ry, oy = srcH - rx.
  function unrotatePoints(points, srcH) {
    if (!points) return points;
    return points.map(function (p) { return { x: p.y, y: srcH - p.x }; });
  }

  function decodeFrame(cnv) {
    return zbarScan(cnv).then(function (r) {
      if (r) return r;
      otsuInto(cnv, otsuCanvas);
      return zbarScan(otsuCanvas);
    }).then(function (r) {
      if (r) return r;
      // Still nothing — the label may be at an angle. Try a 90°-rotated frame
      // (raw, then thresholded) and un-rotate any hit's points back to source.
      if (!rotCanvas) { rotCanvas = document.createElement('canvas'); rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true }); }
      var srcH = cnv.height;
      rotate90(cnv, rotCanvas);
      return zbarScan(rotCanvas).then(function (r2) {
        if (r2) { r2.points = unrotatePoints(r2.points, srcH); return r2; }
        otsuInto(rotCanvas, otsuCanvas);
        return zbarScan(otsuCanvas).then(function (r3) {
          if (r3) r3.points = unrotatePoints(r3.points, srcH);
          return r3;
        });
      });
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
    if (window.MMHaptic) { MMHaptic.buzz('tick'); }
    else if (navigator.vibrate) { try { navigator.vibrate([35, 35, 35]); } catch (e) {} }
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
        // Release the held barcode once it's been out of view for the pad, so a
        // genuine re-scan (or the next package) can count again.
        if (res && res.text === heldCode) heldLastSeen = Date.now();
        else if (heldCode && !heldStuck && (Date.now() - heldLastSeen) > HOLD_RELEASE_MS) heldCode = null;

        // Sell-by OCR: keep trying on SHARP frames while the item is still in
        // view; stop the instant a date reads (attemptSellByOcr clears pending),
        // or give up if the label leaves the frame or after OCR_MAX_TRIES.
        if (pendingSellBy) {
          if (res && res.text === pendingSellBy.code) {
            if (st.sharp >= OCR_MIN_SHARP && !sbBusy && pendingSellBy.tries < OCR_MAX_TRIES) {
              pendingSellBy.tries++;
              attemptSellByOcr(res.points, pendingSellBy.entry);
            } else if (pendingSellBy.tries >= OCR_MAX_TRIES) {
              if (pendingSellBy.entry && pendingSellBy.entry.sellByStatus === 'scanning') { pendingSellBy.entry.sellByStatus = 'miss'; renderRecent(); }
              pendingSellBy = null;
            }
          } else if (!heldCode) {
            if (pendingSellBy.entry && pendingSellBy.entry.sellByStatus === 'scanning') { pendingSellBy.entry.sellByStatus = 'miss'; renderRecent(); }
            pendingSellBy = null;
          }
        }
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
  // A barcode counts once PER PRESENTATION: after it counts it becomes the
  // "held" code and is suppressed until it's been out of view ~250ms (released
  // in the loop). Stops silent duplicate ticking when you linger on a barcode.
  var heldCode = null, heldLastSeen = 0;
  // The same barcode can't re-count until it has genuinely LEFT the frame for
  // this long. 250ms was short enough that a single dropped-decode frame (label
  // still physically there) looked like it left, so it re-counted the instant
  // the card auto-dismissed. ~0.9s means the label has to actually move out of
  // view before it counts again — you can't linger your way into a phantom dupe.
  var HOLD_RELEASE_MS = 900;
  // Sell-by OCR keeps retrying across frames while the item is still in view,
  // and only on SHARP frames — the one frame captured at decode is often the
  // blurry one as you move, but a sharp frame comes along a moment later.
  var pendingSellBy = null;           // { entry, code, tries }
  var OCR_MIN_SHARP = 5;              // skip only clearly-blurry frames (lower = reads sooner)
  var OCR_MAX_TRIES = 16;             // give up after this many sharp attempts (headroom for weighted voting to reach a confident, corroborated read)
  // While a "possible duplicate" card is up, the held code is STUCK — it won't
  // release on a brief flicker, so a wobbling label can't silently re-count.
  // Only a different barcode or a tap (Done/Rescan) clears it.
  var heldStuck = false;

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

  /* ---------- sell-by OCR on the scanned frame (best-effort) ----------
     Reads the label's Sell By off the SAME frame the barcode came from and
     shows it inline, so Kyle can keep an eye on dates while counting. It is
     fully isolated from the count: guarded, throttled (one read at a time),
     and it never blocks or affects the scan/count if it fails or is slow. */
  var sbBusy = false, sbPending = null;
  function attemptSellByOcr(points, entry) {
    try {
      if (!window.MMOcr || !cropCanvas || !cropCanvas.width) return;
      var id = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
      var job = { crop: buildOcrCrop(id, points, cropCanvas.width, cropCanvas.height), entry: entry || null };
      if (sbBusy) {
        // One read at a time; keep only the latest waiting job. A superseded
        // row resolves to a neutral dash rather than hanging on "scanning".
        if (sbPending && sbPending.entry && sbPending.entry !== entry) sbPending.entry.sellByStatus = 'skip';
        sbPending = job;
        renderRecent();
        return;
      }
      runSbJob(job);
    } catch (e) { sbBusy = false; }
  }
  function runSbJob(job) {
    sbBusy = true;
    setSellByStatus('Sell By: reading…', null);
    window.MMOcr.readSellBy(job.crop).then(function (res) {
      sbBusy = false;
      if (res && res.day) {
        // Confidence-weighted voting across frames. An intermittent misread
        // (e.g. 8<->9) usually comes in LOW-confidence, so it barely moves the
        // tally; a crisp read lands high-confidence and is worth more. We confirm
        // only when the leader has real weight AND a clear margin over any rival,
        // which is what stops a single confident-looking misread from sticking.
        var day = res.day;
        var conf = (typeof res.conf === 'number') ? res.conf : 0;
        var weight = conf >= 70 ? 2 : (conf >= 45 ? 1 : 0.4);
        if (pendingSellBy && pendingSellBy.entry === job.entry) {
          var key = day.y + '-' + day.m + '-' + day.d;
          var v = pendingSellBy.votes; v[key] = (v[key] || 0) + weight;
          var leadKey = key, lead = 0, runnerUp = 0;
          for (var kk in v) {
            if (v[kk] > lead) { runnerUp = lead; lead = v[kk]; leadKey = kk; }
            else if (v[kk] > runnerUp) { runnerUp = v[kk]; }
          }
          var pp = leadKey.split('-'); day = { y: +pp[0], m: +pp[1], d: +pp[2] };
          // Confirmed: leader carries weight AND clearly beats the runner-up.
          if (lead >= 3 && (lead - runnerUp) >= 1.5) pendingSellBy = null;
        }
        showSellBy(day);
        if (job.entry) { job.entry.sellBy = day; job.entry.sellByStatus = 'read'; }
      } else {
        var raw = res && res.raw, msg, engineDown = !!(res && res.err === 'engine');
        if (engineDown) { msg = 'OCR engine didn’t load'; raw = null; }
        else if (!raw) { msg = 'Sell By: nothing in crop'; }   // crop landed blank
        else { msg = 'Sell By: couldn’t read'; }               // shows "(saw: …)"
        setSellByStatus(msg, raw);
        if (job.entry) {
          // keep "Expiry scanning…" while we're still retrying on sharper frames;
          // only mark "No date read" when we give up (not the pending item, or the
          // engine itself is down so retrying is pointless).
          var retrying = pendingSellBy && pendingSellBy.entry === job.entry && !engineDown;
          if (!retrying) {
            job.entry.sellByStatus = 'miss';
            if (engineDown && pendingSellBy && pendingSellBy.entry === job.entry) pendingSellBy = null;
          }
        }
      }
      renderRecent();
      var next = sbPending; sbPending = null; if (next) runSbJob(next);
    }).catch(function () {
      sbBusy = false;
      if (job.entry) job.entry.sellByStatus = 'miss';
      renderRecent();
      var next = sbPending; sbPending = null; if (next) runSbJob(next);
    });
  }

  // Build an upscaled, binarized crop for OCR. On the Sprouts scale label the
  // Sell By sits in the TOP band (above the barcode, toward the right), so we
  // crop the whole band from the top of the frame down past the barcode and
  // from a little left of it to the right edge — generous on purpose, since the
  // date regex will find the date among the extra text. Then upscale and Otsu-
  // binarize, which helps a lot on wet/faded labels.
  function buildOcrCrop(imageData, points, w, h) {
    var out = document.createElement('canvas');
    var src = document.createElement('canvas'); src.width = w; src.height = h;
    src.getContext('2d').putImageData(imageData, 0, 0);
    var x0 = 0, y0 = 0, cw = w, ch = h;
    if (points && points.length) {
      var xs = points.map(function (p) { return p.x; }), ys = points.map(function (p) { return p.y; });
      var bx = Math.min.apply(null, xs), by = Math.min.apply(null, ys);
      var bh = Math.max.apply(null, ys) - by, bw = Math.max.apply(null, xs) - bx;
      // The Sell By sits just ABOVE the barcode (same scale label), toward the
      // right. Crop a TIGHT band around the barcode — NOT the whole frame above
      // it (that dragged in the nutrition panel / cooking text and fragmented
      // the read). Right-biased since the date is top-right.
      var padUp = Math.max(bh * 4, bw * 0.5);
      x0 = Math.max(0, bx - bw * 0.15);
      y0 = Math.max(0, by - padUp);
      cw = w - x0;                              // out to the right edge (date is top-right)
      ch = Math.min(h, by + bh * 1.2) - y0;     // down to just past the barcode
    }
    var up = Math.min(3, 1800 / Math.max(cw, ch)); if (up < 1) up = 1;
    out.width = Math.max(1, Math.round(cw * up)); out.height = Math.max(1, Math.round(ch * up));
    var octx = out.getContext('2d');
    octx.imageSmoothingEnabled = true;
    octx.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
    otsuBinarizeCanvas(out);
    return out;
  }

  // In-place Otsu threshold: turns the crop into clean black-on-white, which is
  // what OCR wants. Same method as the barcode decoder's glare rescue.
  function otsuBinarizeCanvas(cv) {
    try {
      var ctx = cv.getContext('2d');
      var img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
      var n = cv.width * cv.height, gray = new Uint8Array(n), hist = new Uint32Array(256);
      for (var i = 0, p = 0; p < n; i += 4, p++) {
        var v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; gray[p] = v; hist[v]++;
      }
      var sum = 0, k; for (k = 0; k < 256; k++) sum += k * hist[k];
      var sumB = 0, wB = 0, max = 0, thr = 127;
      for (k = 0; k < 256; k++) {
        wB += hist[k]; if (!wB) continue; var wF = n - wB; if (!wF) break;
        sumB += k * hist[k]; var mB = sumB / wB, mF = (sum - sumB) / wF;
        var bt = wB * wF * (mB - mF) * (mB - mF); if (bt > max) { max = bt; thr = k; }
      }
      for (var q = 0, j = 0; q < n; q++, j += 4) { var b = gray[q] > thr ? 255 : 0; d[j] = d[j + 1] = d[j + 2] = b; }
      ctx.putImageData(img, 0, 0);
    } catch (e) {}
  }

  function setSellByStatus(text, raw) {
    try {
      if (!sellbyEl) return;
      sellbyEl.hidden = false;
      sellbyEl.className = 'sellby-readout is-status';
      sellbyEl.style.removeProperty('--vc');
      var seen = raw ? String(raw).replace(/\s+/g, ' ').trim().slice(0, 24) : '';
      sellbyEl.textContent = seen ? (text + ' (saw: ' + seen + ')') : text;
    } catch (e) {}
  }

  function showSellBy(day) {
    try {
      if (!window.MMDates) return;
      var st = window.MMDates.classify(day);
      var txt = 'Sell By ' + window.MMDates.fmt(day) + ' · ' + st.label;
      if (sellbyEl) {
        sellbyEl.hidden = false;
        sellbyEl.style.setProperty('--vc', st.color);
        sellbyEl.className = 'sellby-readout is-' + st.key;
        sellbyEl.textContent = txt;
      }
      // Mirror onto the result card too — Kyle wanted the date inline, and the
      // card now stays up until the read resolves, so it lands before dismiss.
      if (resSellby) {
        resSellby.hidden = false;
        resSellby.style.setProperty('--vc', st.color);
        resSellby.className = 'result-sellby is-' + st.key;
        resSellby.textContent = txt;
      }
    } catch (e) {}
  }
  // Big red product name with the cut word highlighted (London Broil, Rump…).
  function setResName(name) {
    if (window.MMCutWords) resName.innerHTML = window.MMCutWords.markup(name);
    else resName.textContent = name;
  }

  // Big red PLU on the result card — easy to eyeball against the paper checklist.
  function showPlu(plu) {
    if (!resPlu) return;
    if (plu) { resPlu.textContent = 'PLU ' + plu; resPlu.hidden = false; }
    else { resPlu.hidden = true; resPlu.textContent = ''; }
  }

  // The barcode's embedded price on the card. Two packages with different
  // prices are different packages — seeing the price makes a "possible
  // duplicate" prompt trustworthy (same price) or obviously wrong (different).
  function showPrice(price) {
    if (!resPrice) return;
    if (price) { resPrice.textContent = '$' + price; resPrice.hidden = false; }
    else { resPrice.hidden = true; resPrice.textContent = ''; }
  }

  function onDecode(result) {
    var code = result.text;
    var now = Date.now();
    if (code === lastCode && (now - lastTime) < 1500) { lastTime = now; return; } // held barcode: keep suppressing until it leaves the frame
    lastCode = code; lastTime = now;
    var token = ++scanToken;

    paused = true;
    feedback();
    card.classList.remove('is-toast');
    show(unitBtn, false);
    resFmt.textContent = prettyType(result.type);
    setCode(code);

    var price = inferPrice(code);
    var product = window.MMProducts && window.MMProducts.findByCode(code);
    if (product) {
      currentScan = { code: code, product: product, price: price };
      showPlu(product.plu);
      showPrice(price);
      setResName(product.name);
      resNote.textContent = 'PLU ' + product.plu + (price ? (' · ~$' + price) : '');
      show(saveBtn, false);
    } else {
      showPlu(null);
      showPrice(price);
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
    // Count once per presentation: while this is still the held code, suppress
    // (the loop releases the hold once the barcode is out of view ~250ms). This
    // is what stops the silent "possible dupe" ticking when you linger.
    if (code === heldCode) { heldLastSeen = now; return; }
    heldCode = code; heldLastSeen = now; heldStuck = false;   // new code — not stuck (yet)
    if (resSellby) resSellby.hidden = true;   // clear the previous item's date off the card
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
      showPlu(product.plu);
      showPrice(price);
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
        duplicate: scan && scan.duplicate,
        sellByStatus: 'scanning'
      });
      renderRecent();
      pendingSellBy = { entry: recent[0], code: code, tries: 0, votes: {} };
      attemptSellByOcr(result.points, recent[0]);   // fire an immediate first read on THIS frame (loop retries on sharper frames)
      var scanTime = scanAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var scanMeta = code + ' · ' + scanTime + ' · ' + (scan && scan.duplicate ? 'Duplicate scan' : 'Counted +1');
      toast(scan && scan.duplicate ? 'dupe' : 'ok', product.name, product.sheetName || '', scanMeta, scan && scan.id);
      return;
    }

    if (isUrl(code)) {
      currentScan = { code: code, product: null, price: price };
      showPlu(null);
      showPrice(price);
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
    showPlu(null);
    showPrice(price);
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
      duplicate: unknownScan && unknownScan.duplicate,
      sellByStatus: 'scanning'
    });
    renderRecent();
    attemptSellByOcr(result.points, recent[0]);   // reads the date off this frame → updates this row
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
    show(unitBtn, false);
    toastScanId = null;
    heldStuck = false; heldCode = null;   // tapped away — re-presenting counts again
    paused = false;
    if (running && !scanTimer) loop();
  }

  function saveProduct() {
    if (!currentScan || !window.MMProducts) return;
    card.classList.remove('is-toast');
    show(unitBtn, false);
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
      recent.forEach(function (r) {
        if (r.code === code) {
          r.name = saved.name;
          r.sheetName = saved.sheetName || r.sheetName || '';
        }
      });
      renderRecent();
      if (window.MMRenderProducts) window.MMRenderProducts();
      if (window.MMSession && window.MMSession.applyProductToCode) window.MMSession.applyProductToCode(code, saved);
      if (window.MMSession) window.MMSession.render();
      show(card, false);
      paused = false;
      lastCode = null;
      lastTime = 0;
      if (running && !scanTimer) loop();
    }
  }

  function rescan() {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    show(card, false);
    card.classList.remove('is-ok', 'is-dupe');
    card.classList.remove('is-toast');
    show(unitBtn, false);
    toastScanId = null;
    heldStuck = false; heldCode = null;   // explicit rescan — allow the same barcode again
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

  // Per-row expiry chip: placeholder while OCR reads, then the dated verdict.
  function applyExpiryChip(elc, r) {
    var D = window.MMDates;
    elc.hidden = false;
    if (r.sellBy && D) {
      var st = D.classify(r.sellBy);
      elc.className = 'ri-expiry is-' + st.key;
      elc.style.setProperty('--vc', st.color);
      elc.textContent = 'Sell By ' + D.fmt(r.sellBy) + ' · ' + st.label;
    } else if (r.sellByStatus === 'scanning') {
      elc.className = 'ri-expiry is-scanning';
      elc.textContent = 'Expiry scanning…';
    } else if (r.sellByStatus === 'miss') {
      elc.className = 'ri-expiry is-miss';
      elc.textContent = 'No date read';
    } else {
      elc.hidden = true;   // skipped / not attempted
    }
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
        keep.textContent = 'Count Unit';
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
        confirmed.textContent = 'Counted Unit';
        code.appendChild(confirmed);
      }
      var sheet = document.createElement('span');
      sheet.className = 'ri-sheet';
      sheet.textContent = r.sheetName || (product && product.sheetName) || '—';
      var meta = document.createElement('span');
      meta.className = 'ri-meta';
      meta.textContent = r.code + ' · ' + t;
      var expiry = document.createElement('span');
      applyExpiryChip(expiry, r);
      row.appendChild(code);
      row.appendChild(sheet);
      row.appendChild(meta);
      if (!expiry.hidden) row.appendChild(expiry);
      li.appendChild(actions);
      li.appendChild(row);
      wireRecentSwipe(li, row);
      recentList.appendChild(li);
    });
  }

  function confirmRecent(scanId) {
    if (!scanId) return;
    markRecentCounted(scanId);
    if (window.MMSession && window.MMSession.confirmNotDuplicate) window.MMSession.confirmNotDuplicate(scanId);
  }

  function markRecentCounted(scanId) {
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
    renderRecent();
  }

  function countToastAsUnit() {
    if (!toastScanId) return;
    var scanId = toastScanId;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    confirmRecent(scanId);
    toastScanId = null;
    show(unitBtn, false);
    show(card, false);
    card.classList.remove('is-ok', 'is-dupe', 'is-toast');
    heldStuck = false; heldCode = null;   // counted as a unit — clear the lock
    paused = false;
    lastCode = null;
    lastTime = 0;
    if (running && !scanTimer) loop();
  }

  function forgetRecent(scanId) {
    recent = recent.filter(function (r) { return r.id !== scanId; });
    renderRecent();
  }

  function removeRecent(scanId) {
    forgetRecent(scanId);
    if (window.MMSession && window.MMSession.removeScan) window.MMSession.removeScan(scanId);
  }

  function forgetDuplicateRecent() {
    var before = recent.length;
    recent = recent.filter(function (r) { return !r.duplicate; });
    if (recent.length !== before) renderRecent();
  }

  function markDuplicatesCounted() {
    var changed = false;
    recent = recent.map(function (r) {
      if (!r.duplicate) return r;
      var copy = {};
      Object.keys(r).forEach(function (k) { copy[k] = r[k]; });
      copy.duplicate = false;
      copy.confirmed = true;
      changed = true;
      return copy;
    });
    if (changed) renderRecent();
  }

  function clearRecent() {
    recent = [];
    renderRecent();
  }

  // Rebuild the Scan-tab log from the persisted session after a reload/crash, so
  // the visible scan list survives like the counts do. The session is the source
  // of truth; this only mirrors it into the in-memory `recent` list once, on load.
  function hydrateRecentFromSession() {
    if (recent.length) return;
    if (!window.MMSession || !window.MMSession.activeScans) return;
    var scans;
    try { scans = window.MMSession.activeScans() || []; } catch (e) { return; }
    recent = scans.map(function (s) {
      return {
        id: s.id,
        code: s.code,
        fmt: s.format || '',
        at: s.at ? new Date(s.at) : new Date(),
        name: s.productName || '',
        sheetName: s.sheetName || '',
        duplicate: !!s.duplicate,
        confirmed: !!s.confirmedAt
      };
    });
    if (recent.length) renderRecent();
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
  if (unitBtn) unitBtn.addEventListener('click', countToastAsUnit);
  if (saveBtn) saveBtn.addEventListener('click', saveProduct);

  // turn the camera off when navigating away from the Scan tab
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.goto !== 'scan' && running) stop();
    });
  });

  // restore the Scan-tab log from the persisted session on load
  hydrateRecentFromSession();

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
    clearRecent: clearRecent,
    forgetRecent: forgetRecent,
    forgetDuplicateRecent: forgetDuplicateRecent,
    markRecentCounted: markRecentCounted,
    markDuplicatesCounted: markDuplicatesCounted,
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
