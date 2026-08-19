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
      var base = (root.location ? root.location.origin : '') + '/vendor/tesseract/';
      function mk() {
        if (!root.Tesseract) { reject(new Error('Tesseract global missing after script load')); return; }
        try {
          root.Tesseract.createWorker('eng', 1, {
            workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: false
          }).then(function (w) {
            return w.setParameters({ tessedit_char_whitelist: '0123456789/.- ', tessedit_pageseg_mode: '11' })
              .then(function () { worker = w; resolve(w); });
          }).catch(reject);
        } catch (e) { reject(e); }
      }
      if (root.Tesseract) { mk(); return; }
      var s = document.createElement('script');
      s.src = '/vendor/tesseract/tesseract.min.js';
      s.onload = mk;
      s.onerror = function () { reject(new Error('tesseract.min.js script failed to load')); };
      document.head.appendChild(s);
    }).catch(function (e) {
      loading = null;                                   // allow a later retry
      lastErr = String((e && (e.message || e.name || e)) || 'unknown').slice(0, 120);
      throw e;
    });
    return loading;
  }
  function lastError() { return lastErr; }

  // Pull the first plausible sell-by date out of OCR text via dates.js.
  function findDate(text) {
    var D = root.MMDates; if (!D) return null;
    var cands = String(text).match(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/g) || [];
    for (var i = 0; i < cands.length; i++) {
      var p = D.parseSellBy(cands[i]);
      if (p && D.isPlausibleSellBy(p)) return p;
    }
    return null;
  }

  // Resolves { day: {y,m,d}|null, raw: '<ocr text>' } — the raw text lets the
  // UI show what it actually saw on a miss, which is the tuning signal.
  function readSellBy(source) {
    return new Promise(function (resolve) {
      try {
        if (busy) { resolve({ day: null, raw: '' }); return; }   // one read at a time — sample, don't queue
        busy = true;
        loadEngine().then(function (w) {
          var cv = source;
          if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
            cv = document.createElement('canvas');
            cv.width = source.width; cv.height = source.height;
            cv.getContext('2d').putImageData(source, 0, 0);
          }
          return w.recognize(cv).then(function (r) {
            busy = false;
            var raw = (r && r.data && r.data.text) || '';
            resolve({ day: findDate(raw), raw: raw, err: null });
          });
        }).catch(function (e) {
          busy = false;
          // engine failed to load — surface the real reason for on-device debug
          resolve({ day: null, raw: '', err: 'engine', errMsg: lastErr || String((e && (e.message || e)) || '').slice(0, 120) });
        });
      } catch (e) { busy = false; resolve({ day: null, raw: '', err: 'engine', errMsg: String((e && (e.message || e)) || '').slice(0, 120) }); }
    });
  }

  function preload() { loadEngine().catch(function () {}); }
  function ready() { return !!worker; }

  root.MMOcr = { readSellBy: readSellBy, preload: preload, ready: ready, lastError: lastError };
})(typeof self !== 'undefined' ? self : this);
