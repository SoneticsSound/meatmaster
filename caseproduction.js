/* MeatMaster — Case Production (refill worksheet)
   ==================================================================
   Kyle wants a Production-List-style screen for the CASE items he
   refills: marinated cuts, wings, kabobs, marinated salmon, etc.

   Unlike production.js (which is the One-Pan-Meals recipe playlist),
   this list's line items come straight from the CASE LAYOUT
   (caselayout.js). That means it is always in sync with the case: fix
   a position or add an item in caselayout.js and it shows up here too,
   with no second list to maintain.

   You punch in how many of each need refilling; it saves per day and
   can be copied out as text (the "paper-speed bridge" — matches what
   you'd write on the sheet, no double entry).

   SELF-CONTAINED, like production.js / markdown.js: owns its own
   overlay, never touches scan / count / session state.
   ================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'mm.caseproduction.v1';

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function loadToday() { return loadAll()[todayKey()] || {}; }
  function saveToday(counts) {
    var all = loadAll();
    all[todayKey()] = counts;
    var keys = Object.keys(all).sort().slice(-14);
    var trimmed = {};
    keys.forEach(function (k) { trimmed[k] = all[k]; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(trimmed)); } catch (e) {}
  }

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  /* Line items = the case contents, deduped per section (a PLU can sit
     in both front and back rows — e.g. Pollo Asado — but it's one item
     to refill). The garnish reference page is skipped. */
  function caseSections() {
    var pages = (window.MMCaseLayout && window.MMCaseLayout.pages) || [];
    var sections = [];
    pages.forEach(function (p) {
      if (p.type === 'garnish') return;
      var items = [], seen = {};
      (p.front || []).concat(p.back || []).forEach(function (t) {
        if (!t || !t.plu || seen[t.plu]) return;
        seen[t.plu] = true;
        items.push({ plu: t.plu, name: t.name });
      });
      if (items.length) sections.push({ title: p.title, items: items });
    });
    return sections;
  }

  /* --- overlay shell (same chrome classes as production.js) --- */
  var overlay, titleEl, bodyEl;

  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay');
    overlay.hidden = true;

    var bar = el('div', 'prod-bar');
    var back = el('button', 'prod-back', '‹');
    back.setAttribute('aria-label', 'Close');
    back.addEventListener('click', close);
    titleEl = el('span', 'prod-title', 'Service Case Production List');
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

  function entryRow(it, counts, onChange) {
    var li = el('li', 'prod-entry');

    var main = el('div', 'prod-entry-main');
    main.appendChild(el('div', 'prod-entry-name', it.name));
    main.appendChild(el('div', 'prod-entry-meta', 'PLU ' + it.plu));
    li.appendChild(main);

    var stepper = el('div', 'prod-stepper');
    var minus = el('button', 'prod-step-btn', '−');
    var input = el('input', 'prod-step-input');
    input.type = 'number'; input.inputMode = 'numeric'; input.min = '0';
    input.value = counts[it.plu] ? String(counts[it.plu]) : '';
    input.placeholder = '0';
    var plus = el('button', 'prod-step-btn', '+');

    function set(v) {
      v = Math.max(0, v | 0);
      if (v === 0) { delete counts[it.plu]; input.value = ''; }
      else { counts[it.plu] = v; input.value = String(v); }
      li.classList.toggle('has-count', v > 0);
      saveToday(counts);
      onChange();
    }

    minus.addEventListener('click', function () { set((parseInt(input.value, 10) || 0) - 1); });
    plus.addEventListener('click',  function () { set((parseInt(input.value, 10) || 0) + 1); });
    input.addEventListener('change', function () { set(parseInt(input.value, 10) || 0); });

    stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);
    li.appendChild(stepper);
    li.classList.toggle('has-count', (counts[it.plu] || 0) > 0);
    return li;
  }

  function buildText(counts) {
    var lines = [];
    caseSections().forEach(function (sec) {
      var picked = sec.items.filter(function (it) { return counts[it.plu] > 0; });
      if (!picked.length) return;
      lines.push(sec.title + ':');
      picked.forEach(function (it) { lines.push('  ' + counts[it.plu] + '  ' + it.name + ' (' + it.plu + ')'); });
    });
    return lines.join('\n');
  }

  function render() {
    ensure();
    bodyEl.innerHTML = '';
    bodyEl.scrollTop = 0;

    var counts = loadToday();

    bodyEl.appendChild(el('p', 'prod-note',
      'Punch in what needs refilling from the case — marinated cuts, wings, ' +
      'kabobs, salmon. Saved on this phone for today.'));

    var summary = el('div', 'prod-summary');
    bodyEl.appendChild(summary);
    function refreshSummary() {
      var n = 0, units = 0;
      Object.keys(counts).forEach(function (k) { if (counts[k] > 0) { n++; units += counts[k]; } });
      summary.innerHTML = '';
      var a = el('div'); a.appendChild(el('strong', null, String(n))); a.appendChild(el('span', null, 'Items'));
      var b = el('div'); b.appendChild(el('strong', null, String(units))); b.appendChild(el('span', null, 'To make'));
      summary.appendChild(a); summary.appendChild(b);
    }
    refreshSummary();

    var sections = caseSections();
    if (!sections.length) {
      bodyEl.appendChild(el('p', 'prod-note', 'No case items found. Add them in the Case Layout first.'));
      return;
    }

    var list = el('ul', 'prod-entry-list');
    sections.forEach(function (sec) {
      list.appendChild(el('li', 'prod-group', sec.title));
      sec.items.forEach(function (it) { list.appendChild(entryRow(it, counts, refreshSummary)); });
    });
    bodyEl.appendChild(list);

    var actions = el('div', 'prod-actions');
    var copy = el('button', 'btn btn-primary btn-block', 'Copy refill list');
    copy.addEventListener('click', function () {
      var text = buildText(counts) || 'Nothing entered.';
      if (navigator.clipboard) { try { navigator.clipboard.writeText(text); } catch (e) {} }
      if (window.MMHaptic) MMHaptic.buzz('ok');
      var was = copy.textContent;
      copy.textContent = 'Copied!';
      setTimeout(function () { copy.textContent = was; }, 1200);
    });
    var clear = el('button', 'btn btn-block', 'Clear today’s list');
    clear.addEventListener('click', function () {
      Object.keys(counts).forEach(function (k) { delete counts[k]; });
      saveToday(counts);
      render();
    });
    actions.appendChild(copy);
    actions.appendChild(clear);
    bodyEl.appendChild(actions);
  }

  window.MMCaseProduction = { open: open, close: close, todayCounts: loadToday };

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-case-production');
    if (b) b.addEventListener('click', open);
  });
})();
