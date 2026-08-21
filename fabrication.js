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

  /* --- yield estimate: "make N cuts" -> "pull X primals" ------------
     The manual gives cutting THICKNESS, not a fixed count, so we estimate
     cuts-per-primal from a typical primal weight and target cut weight
     (~85% usable after trim). These are ESTIMATES — editable per cut in
     the guide detail and stored, so Kyle tunes them to his store. */
  var CPP_KEY = 'mm.fab.cpp.v1';
  function loadCpp() { try { return JSON.parse(localStorage.getItem(CPP_KEY) || '{}'); } catch (e) { return {}; } }
  function saveCpp(m) { try { localStorage.setItem(CPP_KEY, JSON.stringify(m)); } catch (e) {} }
  function fromWeight(primalLb, cutOz) { return Math.max(1, Math.floor(primalLb * 16 * 0.85 / cutOz)); }
  function estCpp(name) {
    var n = (name || '').toLowerCase();
    if (/rib\s*roast|holiday roast/.test(n)) return 2;      // roasts, not steaks
    if (/ribeye/.test(n)) return fromWeight(10, 14);
    if (/striploin|new york|ny\b/.test(n)) return fromWeight(11, 13);
    if (/tenderloin/.test(n)) return fromWeight(5, 7);
    if (/coulotte/.test(n)) return fromWeight(4, 8);
    if (/top sirloin/.test(n)) return fromWeight(9, 9);
    if (/petite sirloin/.test(n)) return fromWeight(5, 8);
    if (/chuck/.test(n)) return fromWeight(15, 40);         // roasts ~2.5 lb
    if (/brisket/.test(n)) return 3;                        // cut into 3 pieces
    if (/bottom round/.test(n)) return fromWeight(18, 24);
    if (/inside round/.test(n)) return fromWeight(18, 20);
    if (/tri-?tip/.test(n)) return 2;
    if (/short rib/.test(n)) return 3;                      // 3 portions per rack
    if (/flap/.test(n)) return 1;                           // whole
    return fromWeight(10, 12);                              // generic steak
  }
  function cutsPerPrimal(g) { var m = loadCpp(); return m[g.id] || estCpp(g.name); }
  function primalsToPull(count, g) { return Math.max(1, Math.ceil(count / cutsPerPrimal(g))); }

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
    var meta = el('div', 'prod-entry-meta');
    main.appendChild(meta);
    li.appendChild(main);
    var stepper = el('div', 'prod-stepper');
    var minus = el('button', 'prod-step-btn', '−');
    var input = el('input', 'prod-step-input'); input.type = 'number'; input.inputMode = 'numeric'; input.min = '0';
    input.value = counts[g.id] ? String(counts[g.id]) : ''; input.placeholder = '0';
    var plus = el('button', 'prod-step-btn', '+');
    function updateMeta() {
      var n = counts[g.id] || 0;
      if (n > 0) {
        var p = primalsToPull(n, g);
        meta.textContent = '≈ ' + p + ' primal' + (p > 1 ? 's' : '') + ' to pull  (~' + cutsPerPrimal(g) + '/primal)';
        meta.classList.add('is-primals');
      } else {
        meta.textContent = g.primal ? ('from ' + g.primal) : '';
        meta.classList.remove('is-primals');
      }
    }
    function set(v) {
      v = Math.max(0, v | 0);
      if (v === 0) { delete counts[g.id]; input.value = ''; } else { counts[g.id] = v; input.value = String(v); }
      li.classList.toggle('has-count', v > 0); saveToday(counts); updateMeta(); onChange();
    }
    minus.addEventListener('click', function () { set((parseInt(input.value, 10) || 0) - 1); });
    plus.addEventListener('click', function () { set((parseInt(input.value, 10) || 0) + 1); });
    input.addEventListener('change', function () { set(parseInt(input.value, 10) || 0); });
    stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);
    li.appendChild(stepper);
    li.classList.toggle('has-count', (counts[g.id] || 0) > 0);
    updateMeta();
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
        var facts = el('div', 'prod-facts');
        if (g.primal) facts.appendChild(fact(g.primal, 'Primal'));
        facts.appendChild(fact('~' + cutsPerPrimal(g), 'Cuts / primal'));
        root.appendChild(facts);

        // editable yield estimate — drives the "primals to pull" math
        root.appendChild(el('h3', 'prod-h', 'Yield estimate'));
        root.appendChild(el('p', 'prod-note',
          'Roughly how many cuts you get from one whole primal — estimated from typical ' +
          'weights. Adjust it to your store; the Production List uses it to tell you how ' +
          'many primals to pull.'));
        var yrow = el('div', 'fab-yield');
        yrow.appendChild(el('span', 'fab-yield-label', 'Cuts per primal'));
        var inp = el('input', 'fab-yield-input');
        inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = '1';
        inp.value = String(cutsPerPrimal(g));
        inp.addEventListener('change', function () {
          var v = parseInt(inp.value, 10), m = loadCpp();
          if (v > 0) m[g.id] = v; else delete m[g.id];
          saveCpp(m); inp.value = String(cutsPerPrimal(g));
        });
        yrow.appendChild(inp);
        root.appendChild(yrow);

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
