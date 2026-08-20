/* MeatMaster — OCR (Sell-By date reader)
   ==================================================================
   Shared, side-effect-free engine so the MAIN scanner can read the Sell
   By date on the same frame it decodes the barcode from. No DOM, no
   state beyond a cached worker; every path is guarded and resolves to
   a value (never throws) — so it is safe to call from the live count
   path without any risk to a count.

   readSellBy(source) -> Promise<{y,m,d} | null>
     source: an ImageData or a canvas (a camera frame).
     Returns a plausible sell-by date parsed via dates.js, or null.

   Tesseract is vendored offline in /vendor/tesseract and LAZY-LOADED on
   first use, then runtime-cached by the service worker — so it doesn't
   bloat install; open the app once on Wi-Fi and it works offline after.
   ================================================================== */
(function (root) {
  'use strict';

  var worker = null, loading = null, busy = false, lastErr = '';

  function loadEngine() {
    if (worker) return Promise.resolve(worker);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      // Resolve against the DOCUMENT BASE, not the origin root. On GitHub Pages
      // the app lives under /meatmaster/, so an origin-root path ("/vendor/…")
      // 404s — which is exactly why the engine never loaded on the live site.
      // These must be absolute URLs (blob workers can't resolve relative paths).
      var base = new URL('vendor/tesseract/', document.baseURI).href;
      function mk() {
        if (!root.Tesseract) { reject(new Error('Tesseract global missing after script load')); return; }
        try {
          root.Tesseract.createWorker('eng', 1, {
            workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: false
          }).then(function (w) {
            // DIGITS ONLY — letters corrupt the date (8 reads as B) and add noise.
          // We anchor the date by POSITION instead (rightmost = the Sell By).
          return w.setParameters({ tessedit_char_whitelist: '0123456789/.- ', tessedit_pageseg_mode: '11' })
              .then(function () { worker = w; resolve(w); });
          }).catch(reject);
        } catch (e) { reject(e); }
      }
      if (root.Tesseract) { mk(); return; }
      var s = document.createElement('script');
      s.src = new URL('vendor/tesseract/tesseract.min.js', document.baseURI).href;
      s.onload = mk;
      s.onerror = function () { reject(new Error('tesseract.min.js script failed to load (' + s.src + ')')); };
      document.head.appendChild(s);
    }).catch(function (e) {
      loading = null;                                   // allow a later retry
      lastErr = String((e && (e.message || e.name || e)) || 'unknown').slice(0, 120);
      throw e;
    });
    return loading;
  }
  function lastError() { return lastErr; }

  // Pull the sell-by out of Tesseract's result. The top band also holds NET
  // WEIGHT (1.325) and unit price (8.99/lb). Digits only (no letters), and we
  // anchor by POSITION: the Sell By is top-RIGHT of the band, so among plausible
  // date tokens we take the RIGHTMOST (weight is left, price centre), tie-broken
  // by closest-to-today. `data` is Tesseract's r.data (.words / .text).
  //   parseSellBy already rejects weight/price (they aren't full dates) and
  //   accepts MM/DD/YY, MM.DD.YY, MM-DD-YY and the run-together MMDDYY.
  function findDate(data) {
    var D = root.MMDates; if (!D) return null;
    var ref = D.today();
    var words = (data && data.words) || [];

    // Build the digit-bearing tokens in reading order, with their right-edge x.
    // Blur often turns "08.20.26" into three tokens "08" "20" "26" (dots read as
    // spaces), so we consider 1-, 2- AND 3-token runs joined with "/".
    var toks = [];
    for (var i = 0; i < words.length; i++) {
      var tx = String(words[i].text || '').trim();
      if (/\d/.test(tx)) { var b = words[i].bbox || {}; toks.push({ t: tx, x: (b.x1 != null ? b.x1 : (b.x0 || 0)) }); }
    }

    var dates = [];
    function consider(str, x) {
      var p = D.parseSellBy(str);
      if (p && D.isPlausibleSellBy(p)) dates.push({ p: p, x: x, dist: Math.abs(D.daysBetween(ref, p)) });
    }
    for (var j = 0; j < toks.length; j++) {
      consider(toks[j].t, toks[j].x);                                                        // "08.20.26" / "082026"
      if (j + 1 < toks.length) consider(toks[j].t + '/' + toks[j + 1].t, toks[j + 1].x);      // "08" "20.26"
      if (j + 2 < toks.length) consider(toks[j].t + '/' + toks[j + 1].t + '/' + toks[j + 2].t, toks[j + 2].x); // "08" "20" "26"
    }
    if (dates.length) {
      // The Sell By is top-right, so the RIGHTMOST plausible date wins (weight is
      // left, price centre); tie-break by closest to today.
      dates.sort(function (a, b) { return (b.x - a.x) || (a.dist - b.dist); });
      return dates[0].p;
    }

    // last-ditch: whole text, space-tolerant, closest to today
    var loose = String((data && data.text) || data || '').match(/\d{1,2}[\s.\/-]{1,3}\d{1,2}[\s.\/-]{1,3}\d{2,4}/g) || [];
    var best = null, bd = Infinity;
    for (var k = 0; k < loose.length; k++) {
      var q = D.parseSellBy(loose[k].replace(/[\s.\-]+/g, '/'));
      if (q && D.isPlausibleSellBy(q)) { var d = Math.abs(D.daysBetween(ref, q)); if (d < bd) { bd = d; best = q; } }
    }
    return best;
  }

  function toCanvas(source) {
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
      var cv = document.createElement('canvas');
      cv.width = source.width; cv.height = source.height;
      cv.getContext('2d').putImageData(source, 0, 0);
      return cv;
    }
    return source;
  }

  // Resolves { day, raw, err }. ONE clean digit-only pass (engine whitelist is
  // digits+separators, so no 8→B), then findDate() anchors the date by POSITION —
  // the Sell By is top-right, so the rightmost plausible date wins over the
  // weight (left) and price (centre). Tried an explicit two-pass "find Sell By
  // text → re-crop → re-read"; re-OCRing a sub-region of the already-binarized
  // crop read WORSE than one clean pass, so position-anchoring it is.
  function readSellBy(source) {
    return new Promise(function (resolve) {
      try {
        if (busy) { resolve({ day: null, raw: '', err: null }); return; }   // sample, don't queue
        busy = true;
        loadEngine().then(function (w) {
          return w.recognize(toCanvas(source)).then(function (r) {
            busy = false;
            resolve({ day: findDate(r && r.data), raw: (r && r.data && r.data.text) || '', err: null });
          });
        }).catch(function (e) {
          busy = false;
          resolve({ day: null, raw: '', err: 'engine', errMsg: lastErr || String((e && (e.message || e)) || '').slice(0, 120) });
        });
      } catch (e) { busy = false; resolve({ day: null, raw: '', err: 'engine', errMsg: String((e && (e.message || e)) || '').slice(0, 120) }); }
    });
  }

  function preload() { loadEngine().catch(function () {}); }
  function ready() { return !!worker; }

  root.MMOcr = { readSellBy: readSellBy, preload: preload, ready: ready, lastError: lastError };
})(typeof self !== 'undefined' ? self : this);
