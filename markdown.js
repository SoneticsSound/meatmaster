/* MeatMaster — Sell-By / Markdown (daily reference)
   ==================================================================
   Kyle's rule, confirmed 2026-08-15: pull on the Sell By day, mark down
   the day before. So each day the two dates that matter are fixed:

     PULL — SHRINK   = anything whose Sell By is TODAY
     MARK DOWN       = anything whose Sell By is TOMORROW

   No date entry. The screen computes both dates from today and shows
   them big, so Kyle just walks the case and matches the Sell By printed
   on each sticker (top-right, MM.DD.YY) against these two.

   (This supersedes the earlier "type the date" version. When OCR lands
   it can auto-flag scanned labels against these same two dates — the
   dates.js engine stays the home for that logic. NOTE: dates.js
   classify() still encodes the OLD boundary and must be updated to this
   rule when OCR auto-flagging is built.)

   SELF-CONTAINED: owns its own overlay, never touches scan/count/session.
   ================================================================== */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  /* today + n days, as a plain {y,m,d} calendar day (no timezone drift —
     UTC is used only as a stable counting frame, same as dates.js). */
  function addDays(day, n) {
    var ms = Date.UTC(day.y, day.m - 1, day.d) + n * 86400000;
    var d = new Date(ms);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }

  var overlay, bodyEl;

  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay');
    overlay.hidden = true;

    var bar = el('div', 'prod-bar');
    var back = el('button', 'prod-back', '‹');
    back.setAttribute('aria-label', 'Close');
    back.addEventListener('click', close);
    var titleEl = el('span', 'prod-title', 'Sell-By / Markdown');
    var closeB = el('button', 'prod-close', '×');
    closeB.setAttribute('aria-label', 'Close');
    closeB.addEventListener('click', close);

    bar.appendChild(back);
    bar.appendChild(titleEl);
    bar.appendChild(closeB);

    bodyEl = el('div', 'prod-body');
    overlay.appendChild(bar);
    overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }

  function open() { ensure(); overlay.hidden = false; document.body.classList.add('prod-open'); render(); }
  function close() { if (overlay) overlay.hidden = true; document.body.classList.remove('prod-open'); }

  function card(tag, dateStr, sub, color) {
    var c = el('div', 'md-card');
    c.style.setProperty('--vc', color);
    c.appendChild(el('div', 'md-card-tag', tag));
    c.appendChild(el('div', 'md-card-date', dateStr));
    c.appendChild(el('div', 'md-card-sub', sub));
    return c;
  }

  function render() {
    ensure();
    var D = window.MMDates;
    bodyEl.innerHTML = '';
    bodyEl.scrollTop = 0;

    if (!D) { bodyEl.appendChild(el('p', 'prod-note', 'Date engine not loaded.')); return; }

    var t = D.today();
    var tomorrow = addDays(t, 1);

    bodyEl.appendChild(el('p', 'prod-note',
      'Today’s pull and markdown dates. Walk the case and check the Sell By ' +
      'on each sticker (top-right) against these two.'));
    bodyEl.appendChild(el('div', 'md-today', 'Today · ' + D.fmt(t)));

    // PULL red, MARK DOWN yellow — same colours the dates.js engine uses,
    // and the yellow matches the physical markdown sticker.
    bodyEl.appendChild(card('PULL — SHRINK', D.fmt(t),
      'Pull anything with today’s Sell By date.', D.STATUS.PULL.color));
    bodyEl.appendChild(card('MARK DOWN', D.fmt(tomorrow),
      'Mark down anything with tomorrow’s Sell By date.', D.STATUS.MARKDOWN.color));

    bodyEl.appendChild(el('p', 'prod-note',
      'Dates update automatically each day.'));
  }

  window.MMMarkdown = { open: open, close: close };

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-markdown');
    if (b) b.addEventListener('click', open);
  });
})();
