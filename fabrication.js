/* MeatMaster — Meat Fabrication (Cutting) production list + guides
   ==================================================================
   The third recipe pair, mirroring One-Pan Meals and Service Case:

     1. MEAT FABRICATION PRODUCTION LIST — punch in how many of each cut
        you're fabricating today (the "cut list"). Saved per day.
     2. RECIPES FOR FABRICATION — the cutting guide for each cut: source
        primal, PRODUCTION (cutting) steps, CHILL/DISPLAY, and TIPS. The
        day's counts show as badges. Tap a cut for its full guide.

   The cut list is the set of guides parsed from the Beef Fabrication
   manual (fabrication_guides.js). Cuts have no PLU, so they're keyed by
   guide id.

   SELF-CONTAINED: owns its overlay + a small view stack; never touches
   scan/count/session state.
   ================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'mm.fabrication.v1';

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadAll() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
  function loadToday() { return loadAll()[todayKey()] || {}; }
  function saveToday(counts) {
    var all = loadAll(); all[todayKey()] = counts;
    var keys = Object.keys(all).sort().slice(-14); var t = {}; keys.forEach(function (k) { t[k] = all[k]; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(t)); } catch (e) {}
  }

  function el(tag, cls, text) { var d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }
  function guides() { var D = window.MMFabricationGuides; return (D && D.GUIDES) ? D.GUIDES.slice() : []; }

  /* --- overlay + view stack (shared chrome with production.js) --- */
  var overlay, titleEl, bodyEl, backBtn, stack = [];
  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay'); overlay.hidden = true;
    var bar = el('div', 'prod-bar');
    backBtn = el('button', 'prod-back', '‹'); backBtn.setAttribute('aria-label', 'Back');
    titleEl = el('span', 'prod-title');
    var close = el('button', 'prod-close', '×'); close.setAttribute('aria-label', 'Close');
    backBtn.addEventListener('click', pop); close.addEventListener('click', closeAll);
    bar.appendChild(backBtn); bar.appendChild(titleEl); bar.appendChild(close);
    bodyEl = el('div', 'prod-body');
    overlay.appendChild(bar); overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }
  function push(v) { stack.push(v); render(); }
  function pop() { if (stack.length <= 1) { closeAll(); return; } stack.pop(); render(); }
  function closeAll() { stack = []; if (overlay) overlay.hidden = true; document.body.classList.remove('prod-open'); }
  function render() {
    ensure(); var v = stack[stack.length - 1]; if (!v) { closeAll(); return; }
    overlay.hidden = false; document.body.classList.add('prod-open');
    titleEl.textContent = v.title;
    backBtn.style.visibility = stack.length > 1 ? 'visible' : 'hidden';
    bodyEl.innerHTML = ''; bodyEl.scrollTop = 0; v.build(bodyEl);
  }

  /* --- VIEW 1: production list (enter counts per cut) --- */
  function productionListView() {
    return {
      title: 'Meat Fabrication Production List',
      build: function (root) {
        var counts = loadToday();
        root.appendChild(el('p', 'prod-note', 'Punch in how many of each cut you’re fabricating today. Saved on this phone for today.'));
        var summary = el('div', 'prod-summary'); root.appendChild(summary);
        function refresh() {
          var n = 0, units = 0;
          Object.keys(counts).forEach(function (k) { if (counts[k] > 0) { n++; units += counts[k]; } });
          summary.innerHTML = '';
          var a = el('div'); a.appendChild(el('strong', null, String(n))); a.appendChild(el('span', null, 'Cuts'));
          var b = el('div'); b.appendChild(el('strong', null, String(units))); b.appendChild(el('span', null, 'To make'));
          summary.appendChild(a); summary.appendChild(b);
        }
        refresh();
        var list = el('ul', 'prod-entry-list');
        guides().slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
          .forEach(function (g) { list.appendChild(entryRow(g, counts, refresh)); });
        root.appendChild(list);
        var actions = el('div', 'prod-actions');
        var go = el('button', 'btn btn-primary btn-block', 'Recipes for Fabrication →');
        go.addEventListener('click', function () { saveToday(counts); push(guidesView()); });
        var clear = el('button', 'btn btn-block', 'Clear today’s list');
        clear.addEventListener('click', function () { Object.keys(counts).forEach(function (k) { delete counts[k]; }); saveToday(counts); render(); });
        actions.appendChild(go); actions.appendChild(clear); root.appendChild(actions);
      }
    };
  }
  function entryRow(g, counts, onChange) {
    var li = el('li', 'prod-entry');
    var main = el('div', 'prod-entry-main');
    main.appendChild(el('div', 'prod-entry-name', g.name));
    if (g.primal) main.appendChild(el('div', 'prod-entry-meta', 'from ' + g.primal));
    li.appendChild(main);
    var stepper = el('div', 'prod-stepper');
    var minus = el('button', 'prod-step-btn', '−');
    var input = el('input', 'prod-step-input'); input.type = 'number'; input.inputMode = 'numeric'; input.min = '0';
    input.value = counts[g.id] ? String(counts[g.id]) : ''; input.placeholder = '0';
    var plus = el('button', 'prod-step-btn', '+');
    function set(v) {
      v = Math.max(0, v | 0);
      if (v === 0) { delete counts[g.id]; input.value = ''; } else { counts[g.id] = v; input.value = String(v); }
      li.classList.toggle('has-count', v > 0); saveToday(counts); onChange();
    }
    minus.addEventListener('click', function () { set((parseInt(input.value, 10) || 0) - 1); });
    plus.addEventListener('click', function () { set((parseInt(input.value, 10) || 0) + 1); });
    input.addEventListener('change', function () { set(parseInt(input.value, 10) || 0); });
    stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);
    li.appendChild(stepper);
    li.classList.toggle('has-count', (counts[g.id] || 0) > 0);
    return li;
  }

  /* --- VIEW 2: guides list (with today's counts as badges) --- */
  function guidesView() {
    return {
      title: 'Recipes for Fabrication',
      build: function (root) {
        var counts = loadToday();
        root.appendChild(el('p', 'prod-note', 'Cutting guide for each cut — source primal, cutting steps, chill/display. Today’s counts show as badges. Tap a cut.'));
        var ul = el('ul', 'prod-recipe-list');
        guides().slice().sort(function (a, b) {
          return ((counts[b.id] || 0) - (counts[a.id] || 0)) || a.name.localeCompare(b.name);
        }).forEach(function (g) {
          var li = el('li', 'prod-recipe'); li.setAttribute('role', 'button'); li.tabIndex = 0;
          var txt = el('div', 'prod-recipe-txt');
          txt.appendChild(el('div', 'prod-recipe-name', g.name));
          txt.appendChild(el('div', 'prod-recipe-meta', (g.primal ? 'from ' + g.primal + ' · ' : '') + g.production.length + ' cutting steps'));
          li.appendChild(txt);
          if (counts[g.id] > 0) li.appendChild(el('div', 'prod-qty-chip', String(counts[g.id])));
          function open() { push(detailView(g)); }
          li.addEventListener('click', open);
          li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
          ul.appendChild(li);
        });
        root.appendChild(ul);
      }
    };
  }

  /* --- VIEW 3: guide detail --- */
  function detailView(g) {
    return {
      title: g.name,
      build: function (root) {
        if (g.primal) {
          var facts = el('div', 'prod-facts');
          facts.appendChild(fact(g.primal, 'Primal'));
          root.appendChild(facts);
        }
        stepsBlock(root, 'Cutting steps', g.production, true);
        stepsBlock(root, 'Chill / Display', g.chillDisplay, false);
        stepsBlock(root, 'Tips', g.tips, false);
        root.appendChild(el('p', 'prod-source', 'Source: Beef Fabrication manual.'));
      }
    };
  }
  function stepsBlock(root, heading, steps, ordered) {
    if (!steps || !steps.length) return;
    root.appendChild(el('h3', 'prod-h', heading));
    var list = el(ordered ? 'ol' : 'ul', 'prod-steps');
    steps.forEach(function (s) {
      s = String(s).replace(/^[\s·•\-*]+/, '');   // drop leftover bullet glyphs
      var li = el('li', 'prod-step');
      if (/^\*?CCP/i.test(s)) li.classList.add('is-ccp');
      li.textContent = s;
      list.appendChild(li);
    });
    root.appendChild(list);
  }
  function fact(value, label) { var d = el('div', 'prod-fact'); d.appendChild(el('strong', null, value)); d.appendChild(el('span', null, label)); return d; }

  function openProductionList() { stack = []; push(productionListView()); }
  function openGuides() { stack = []; push(guidesView()); }
  window.MMFabrication = { openProductionList: openProductionList, openGuides: openGuides, close: closeAll };

  document.addEventListener('DOMContentLoaded', function () {
    var a = document.getElementById('btn-fabrication-list');
    var b = document.getElementById('btn-recipes-fabrication');
    if (a) a.addEventListener('click', openProductionList);
    if (b) b.addEventListener('click', openGuides);
  });
})();
