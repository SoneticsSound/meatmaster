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
            // digits + separators for the date, PLUS the letters of "Sell By" so
          // we can find that label and anchor the date to it.
          return w.setParameters({ tessedit_char_whitelist: 'SsEeLlBbYy0123456789/.- ', tessedit_pageseg_mode: '11' })
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

  var DATE_RE = /\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/;

  function ctr(b) { b = b || {}; return { x: ((b.x0 || 0) + (b.x1 != null ? b.x1 : b.x0 || 0)) / 2, y: ((b.y0 || 0) + (b.y1 != null ? b.y1 : b.y0 || 0)) / 2 }; }

  // Pull the sell-by out of Tesseract's result. The top band also holds NET
  // WEIGHT (1.325) and unit price (8.99/lb) — that's what confuses a naive read.
  // Strategy, best → fallback:
  //   1) ANCHOR ON "Sell By": find the By/Sell label word and take the plausible
  //      date token nearest it (the date sits right under "Sell By").
  //   2) RIGHTMOST plausible date (Sell By is top-right; weight left, price centre).
  //   3) plausible date CLOSEST TO TODAY from the raw text.
  // `data` is Tesseract's r.data (has .words / .text).
  function findDate(data) {
    var D = root.MMDates; if (!D) return null;
    var ref = D.today();
    var words = (data && data.words) || [];

    // gather plausible date tokens with positions
    var dates = [];
    for (var i = 0; i < words.length; i++) {
      var m = String(words[i].text || '').match(DATE_RE);
      if (!m) continue;
      var p = D.parseSellBy(m[0]);
      if (p && D.isPlausibleSellBy(p)) {
        var c = ctr(words[i].bbox);
        dates.push({ p: p, cx: c.x, cy: c.y, x1: (words[i].bbox && words[i].bbox.x1) || c.x, dist: Math.abs(D.daysBetween(ref, p)) });
      }
    }

    if (dates.length) {
      // 1) anchor on the "Sell By" label if it was legible
      var anchor = null;
      for (var j = 0; j < words.length; j++) {
        var t = String(words[j].text || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!t) continue;
        if (t === 'by' || t === 'sell' || t === 'sellby' || (t.length >= 3 && t.indexOf('ell') >= 0)) {
          anchor = ctr(words[j].bbox);
          if (t.indexOf('by') >= 0) break;   // "By" is closest to the date
        }
      }
      if (anchor) {
        dates.sort(function (a, b) {
          return Math.hypot(a.cx - anchor.x, a.cy - anchor.y) - Math.hypot(b.cx - anchor.x, b.cy - anchor.y);
        });
        return dates[0].p;
      }
      // 2) no readable anchor — rightmost, then nearest today
      dates.sort(function (a, b) { return (b.x1 - a.x1) || (a.dist - b.dist); });
      return dates[0].p;
    }

    // 3) fallback: whole text, plausible date closest to today
    var cands = String((data && data.text) || data || '').match(new RegExp(DATE_RE.source, 'g')) || [];
    var best = null, bd = Infinity;
    for (var k = 0; k < cands.length; k++) {
      var q = D.parseSellBy(cands[k]);
      if (q && D.isPlausibleSellBy(q)) { var d = Math.abs(D.daysBetween(ref, q)); if (d < bd) { bd = d; best = q; } }
    }
    return best;
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
            resolve({ day: findDate(r && r.data), raw: raw, err: null });
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
