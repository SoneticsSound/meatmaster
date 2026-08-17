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

  var worker = null, loading = null, busy = false;

  function loadEngine() {
    if (worker) return Promise.resolve(worker);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var base = (root.location ? root.location.origin : '') + '/vendor/tesseract/';
      function mk() {
        if (!root.Tesseract) { reject(new Error('engine missing')); return; }
        root.Tesseract.createWorker('eng', 1, {
          workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: false
        }).then(function (w) {
          // sparse text (11) so a small date anywhere in the frame is found;
          // digits + date separators only.
          return w.setParameters({ tessedit_char_whitelist: '0123456789/.- ', tessedit_pageseg_mode: '11' })
            .then(function () { worker = w; resolve(w); });
        }).catch(reject);
      }
      if (root.Tesseract) { mk(); return; }
      var s = document.createElement('script');
      s.src = '/vendor/tesseract/tesseract.min.js';
      s.onload = mk;
      s.onerror = function () { reject(new Error('OCR engine unavailable offline')); };
      document.head.appendChild(s);
    });
    return loading;
  }

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

  function readSellBy(source) {
    return new Promise(function (resolve) {
      try {
        if (busy) { resolve(null); return; }          // one read at a time — sample, don't queue
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
            resolve(findDate((r && r.data && r.data.text) || ''));
          });
        }).catch(function () { busy = false; resolve(null); });
      } catch (e) { busy = false; resolve(null); }
    });
  }

  function preload() { loadEngine().catch(function () {}); }
  function ready() { return !!worker; }

  root.MMOcr = { readSellBy: readSellBy, preload: preload, ready: ready };
})(typeof self !== 'undefined' ? self : this);
