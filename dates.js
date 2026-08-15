/* MeatMaster — Sell-By Dates, Markdown & Pull Rules
   ==================================================================
   Kyle's rule, confirmed 2026-08-13:

     "Markdowns happen the day before. If it were today (8/13) we would
      pull sell-bys from 8/12 and mark down 8/13."

   So, against TODAY:
     sell-by  <  today   ->  PULL / SHRINK   flash RED
     sell-by  == today   ->  MARKDOWN        flash YELLOW
     sell-by  >  today   ->  OK              no flag

   The colors are not arbitrary — YELLOW matches the physical markdown
   sticker. The app should look like the thing in your hand.

   ------------------------------------------------------------------
   WHY THIS FILE EXISTS SEPARATELY FROM THE OCR
   ------------------------------------------------------------------
   The date RULE and the date READING are different problems, and
   fusing them is how projects like this stall. This module is pure
   date logic with no camera dependency, which means:

     - the markdown/pull workflow can ship NOW with typed-in dates,
       and get used on shift while OCR is still being proven out
     - when OCR lands, it feeds this same module and nothing else
       changes
     - `isPlausibleSellBy()` below doubles as the OCR VALIDATOR — a
       misread that produces an impossible date gets rejected instead
       of flashing a confident wrong color at you

   That last point matters more than it looks. An OCR system that
   silently reports the wrong date is worse than no OCR at all,
   because you stop checking.
   ================================================================== */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MMDates = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==================================================================
     SECTION 1 — DATE HANDLING WITHOUT TIMEZONE BUGS
     ------------------------------------------------------------------
     A sell-by date is a CALENDAR DAY, not an instant in time. Parsing
     "08/13/26" into a Date object and comparing with < is a classic
     way to be off by one day depending on the phone's timezone and
     the hour of the morning.

     Everything here works on {y, m, d} integer triples and compares
     them as numbers. No UTC, no local-time drift, no 6 AM surprises.
     ================================================================== */

  /* Turn a JS Date (or now) into a plain calendar day. */
  function today(date) {
    var d = date || new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
  }

  /* Comparable integer: 2026-08-13 -> 20260813. Ordering an integer is
     unambiguous in a way that ordering dates is not. */
  function ordinal(day) {
    return day.y * 10000 + day.m * 100 + day.d;
  }

  /* Whole days between two calendar days (b - a). Uses UTC internally
     purely as a stable counting frame — no local timezone touches it. */
  function daysBetween(a, b) {
    var ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
    return Math.round(ms / 86400000);
  }

  /* ==================================================================
     SECTION 2 — PARSING WHAT'S PRINTED ON A LABEL
     ------------------------------------------------------------------
     Sprouts scale labels print the date in a small number of shapes,
     and OCR will mangle some of them. Parse tolerantly, then VALIDATE
     hard in section 3 — permissive parse, strict validate.
     ================================================================== */

  /* Two-digit years: '26' -> 2026. A meat label is never referring to
     1926, and never more than a year or two out, so pivoting on the
     current century is safe here. */
  function expandYear(yy) {
    var n = parseInt(yy, 10);
    if (yy.length === 4) return n;
    return 2000 + n;
  }

  /* parseSellBy('SELL BY 08/13/26') -> { y:2026, m:8, d:13 }

     Handles the shapes that actually turn up:
       08/13/26   08/13/2026   08-13-26   08.13.26   081326
       with or without a "SELL BY" / "USE BY" / "PKG ON" prefix

     Returns null if nothing date-shaped is found — the caller decides
     what to do, rather than this function inventing a date. */
  function parseSellBy(text) {
    if (!text) return null;
    var s = String(text).toUpperCase();

    // Separated forms: 8/13/26, 08-13-2026, 08.13.26
    var m = s.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/);
    if (m) {
      return normalise(parseInt(m[1], 10), parseInt(m[2], 10), expandYear(m[3]));
    }

    // Run-together form: 081326. Only trusted when it's exactly 6
    // digits — anything else is more likely a price or a PLU fragment.
    m = s.match(/\b(\d{2})(\d{2})(\d{2})\b/);
    if (m) {
      return normalise(parseInt(m[1], 10), parseInt(m[2], 10), expandYear(m[3]));
    }

    return null;
  }

  /* US labels are MM/DD/YY. But if the first field is > 12 it CANNOT be
     a month, so the fields are swapped — that's a free correction for a
     common OCR transposition, and it costs nothing to check. */
  function normalise(a, b, year) {
    var month = a, dayOfMonth = b;
    if (a > 12 && b <= 12) { month = b; dayOfMonth = a; }
    return { y: year, m: month, d: dayOfMonth };
  }

  /* ==================================================================
     SECTION 3 — VALIDATION (also the OCR confidence gate)
     ------------------------------------------------------------------
     A date that parsed is not a date that's real. This is the guard
     that keeps a misread from flashing a confident wrong color.
     ================================================================== */

  var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function isRealDate(day) {
    if (!day) return false;
    if (day.m < 1 || day.m > 12) return false;
    if (day.d < 1) return false;
    var max = DAYS_IN_MONTH[day.m - 1];
    // Leap year, because February exists and February is where naive
    // date code goes to die.
    if (day.m === 2 && ((day.y % 4 === 0 && day.y % 100 !== 0) || day.y % 400 === 0)) max = 29;
    return day.d <= max;
  }

  /* A sell-by date on a package in a meat case is within a tight window
     of today. Fresh meat doesn't carry a date 3 years out, and a date
     from last year is a misread, not a very old steak.

     Default window: 45 days back, 120 days forward. Back-window covers
     genuinely missed pulls; forward covers frozen/marinated longer-dated
     product with room to spare.

     Anything outside the window is REJECTED as an OCR error — the app
     should ask for a manual entry rather than act on it. */
  function isPlausibleSellBy(day, opts) {
    opts = opts || {};
    if (!isRealDate(day)) return false;
    var ref = opts.today || today();
    var delta = daysBetween(ref, day);
    var back = opts.maxDaysPast != null ? opts.maxDaysPast : 45;
    var fwd  = opts.maxDaysFuture != null ? opts.maxDaysFuture : 120;
    return delta >= -back && delta <= fwd;
  }

  /* ==================================================================
     SECTION 4 — THE RULE
     ================================================================== */

  var STATUS = {
    PULL: {
      key: 'pull',
      label: 'PULL — SHRINK',
      color: '#e5241b',       // red
      flash: true,
      priority: 3,
      why: 'Sell-by has passed. This comes off the case and goes to shrink.'
    },
    MARKDOWN: {
      key: 'markdown',
      label: 'MARK DOWN',
      color: '#f2c200',       // yellow — matches the physical sticker
      flash: true,
      priority: 2,
      why: 'Sell-by is today. Mark it down now; tomorrow it becomes a pull.'
    },
    OK: {
      key: 'ok',
      label: 'OK',
      color: '#2f9e44',       // green
      flash: false,
      priority: 0,
      why: 'Still in date.'
    },
    UNKNOWN: {
      key: 'unknown',
      label: 'NO DATE',
      color: '#4a90d9',       // blue — "identified, date not read yet"
      flash: false,
      priority: 1,
      why: 'Product identified but the sell-by date has not been read. Enter it or re-scan.'
    }
  };

  /* classify(sellByDay, opts) -> a STATUS object

     opts.today lets tests pin "today" instead of depending on when the
     test happens to run. */
  function classify(sellBy, opts) {
    opts = opts || {};
    if (!sellBy || !isRealDate(sellBy)) return STATUS.UNKNOWN;

    var ref = opts.today || today();
    var delta = daysBetween(ref, sellBy);   // negative = in the past

    if (delta < 0)  return STATUS.PULL;      // 8/12 seen on 8/13
    if (delta === 0) return STATUS.MARKDOWN; // 8/13 seen on 8/13
    return STATUS.OK;
  }

  /* Full evaluation from raw OCR/typed text in one call. Returns
     everything the UI needs, including WHY it decided what it decided —
     so a surprising color can always be explained rather than argued
     with. */
  function evaluate(text, opts) {
    opts = opts || {};
    var parsed = parseSellBy(text);

    if (!parsed) {
      return { status: STATUS.UNKNOWN, sellBy: null, reason: 'no date found in text', raw: text };
    }
    if (!isPlausibleSellBy(parsed, opts)) {
      return {
        status: STATUS.UNKNOWN, sellBy: parsed, rejected: true,
        reason: 'date parsed but is outside the plausible window — treating as a misread',
        raw: text
      };
    }

    var status = classify(parsed, opts);
    return {
      status: status,
      sellBy: parsed,
      daysLeft: daysBetween(opts.today || today(), parsed),
      reason: status.why,
      raw: text
    };
  }

  /* Sort a day's scans so the things that must leave the case first are
     at the top: pulls, then markdowns, then unread dates, then fine. */
  function byUrgency(a, b) {
    var pa = (a.status || STATUS.UNKNOWN).priority;
    var pb = (b.status || STATUS.UNKNOWN).priority;
    if (pa !== pb) return pb - pa;
    return ordinal(a.sellBy || { y: 9999, m: 12, d: 31 }) -
           ordinal(b.sellBy || { y: 9999, m: 12, d: 31 });
  }

  function fmt(day) {
    if (!day) return '—';
    return String(day.m).padStart(2, '0') + '/' +
           String(day.d).padStart(2, '0') + '/' +
           String(day.y).slice(-2);
  }

  return {
    STATUS: STATUS,
    today: today,
    ordinal: ordinal,
    daysBetween: daysBetween,
    parseSellBy: parseSellBy,
    isRealDate: isRealDate,
    isPlausibleSellBy: isPlausibleSellBy,
    classify: classify,
    evaluate: evaluate,
    byUrgency: byUrgency,
    fmt: fmt
  };
});
