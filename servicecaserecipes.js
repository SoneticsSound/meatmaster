/* MeatMaster — Recipes for Service Case
   ==================================================================
   The recipe companion to the Service Case Production List, mirroring
   "Recipes for One-Pan Meals". Browsable list of every service-case
   recipe (from service_case_recipes.js), grouped by protein, with the
   day's refill count (from caseproduction) shown as a badge. Tap a
   recipe for its ingredients + production steps.

   Display names are resolved from caselayout.js by PLU (the curated,
   confirmed names) so they read the way the case does, falling back to
   the manual's parsed name.

   Self-contained: owns its overlay + a small view stack; never touches
   scan/count/session state.
   ================================================================== */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  function recipes() {
    var D = window.MMServiceCaseRecipes;
    return (D && D.RECIPES) ? D.RECIPES.slice() : [];
  }

  // Confirmed display name for a PLU, from the case layout; else the manual name.
  function caseNameFor(plu, fallback) {
    try {
      var pages = (window.MMCaseLayout && window.MMCaseLayout.pages) || [];
      for (var i = 0; i < pages.length; i++) {
        var rows = (pages[i].front || []).concat(pages[i].back || []);
        for (var j = 0; j < rows.length; j++) {
          if (rows[j] && String(rows[j].plu) === String(plu)) return rows[j].name;
        }
      }
    } catch (e) {}
    return fallback;
  }

  function todayCount(plu) {
    try {
      var c = window.MMCaseProduction && window.MMCaseProduction.todayCounts();
      return (c && c[String(plu)]) || 0;
    } catch (e) { return 0; }
  }

  /* --- overlay shell + view stack (same chrome as production.js) --- */
  var overlay, titleEl, bodyEl, backBtn, stack = [];

  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay'); overlay.hidden = true;
    var bar = el('div', 'prod-bar');
    backBtn = el('button', 'prod-back', '‹'); backBtn.setAttribute('aria-label', 'Back');
    titleEl = el('span', 'prod-title');
    var close = el('button', 'prod-close', '×'); close.setAttribute('aria-label', 'Close');
    backBtn.addEventListener('click', pop);
    close.addEventListener('click', closeAll);
    bar.appendChild(backBtn); bar.appendChild(titleEl); bar.appendChild(close);
    bodyEl = el('div', 'prod-body');
    overlay.appendChild(bar); overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }
  function push(v) { stack.push(v); render(); }
  function pop() { if (stack.length <= 1) { closeAll(); return; } stack.pop(); render(); }
  function closeAll() { stack = []; if (overlay) overlay.hidden = true; document.body.classList.remove('prod-open'); }
  function render() {
    ensure();
    var v = stack[stack.length - 1];
    if (!v) { closeAll(); return; }
    overlay.hidden = false; document.body.classList.add('prod-open');
    titleEl.textContent = v.title;
    backBtn.style.visibility = stack.length > 1 ? 'visible' : 'hidden';
    bodyEl.innerHTML = ''; bodyEl.scrollTop = 0;
    v.build(bodyEl);
  }

  /* --- list view --- */
  function listView() {
    return {
      title: 'Recipes for Service Case',
      build: function (root) {
        var all = recipes();
        if (!all.length) { root.appendChild(el('p', 'prod-note', 'No service-case recipes loaded.')); return; }
        root.appendChild(el('p', 'prod-note',
          'Every service-case recipe. Counts from the Service Case Production List ' +
          'show as badges. Tap for ingredients + steps.'));

        var order = ['Beef', 'Pork', 'Chicken', 'Turkey'];
        var groups = {};
        all.forEach(function (r) { (groups[r.category] = groups[r.category] || []).push(r); });
        order.concat(Object.keys(groups).filter(function (c) { return order.indexOf(c) < 0; }))
          .forEach(function (cat) {
            var members = groups[cat]; if (!members || !members.length) return;
            members.sort(function (a, b) {
              return (todayCount(b.plu) - todayCount(a.plu)) ||
                     caseNameFor(a.plu, a.name).localeCompare(caseNameFor(b.plu, b.name));
            });
            root.appendChild(el('h3', 'prod-h', cat));
            var ul = el('ul', 'prod-recipe-list');
            members.forEach(function (r) { ul.appendChild(row(r)); });
            root.appendChild(ul);
          });
      }
    };
  }

  function row(r) {
    var li = el('li', 'prod-recipe'); li.setAttribute('role', 'button'); li.tabIndex = 0;
    var txt = el('div', 'prod-recipe-txt');
    txt.appendChild(el('div', 'prod-recipe-name', caseNameFor(r.plu, r.name)));
    var meta = 'PLU ' + (r.plu || '—') + (r.shelfLifeDays ? ' · ' + r.shelfLifeDays + '-day' : '');
    if (r.yieldText) meta += ' · yields ' + r.yieldText;
    txt.appendChild(el('div', 'prod-recipe-meta', meta));
    li.appendChild(txt);
    var n = todayCount(r.plu);
    if (n > 0) li.appendChild(el('div', 'prod-qty-chip', String(n)));
    function open() { push(detailView(r)); }
    li.addEventListener('click', open);
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return li;
  }

  /* --- detail view --- */
  function detailView(r) {
    return {
      title: caseNameFor(r.plu, r.name),
      build: function (root) {
        var facts = el('div', 'prod-facts');
        if (r.yieldText) facts.appendChild(fact(r.yieldText, 'Yield'));
        if (r.shelfLifeDays) facts.appendChild(fact(r.shelfLifeDays + ' days', 'Shelf life'));
        facts.appendChild(fact(r.plu || '—', 'PLU'));
        root.appendChild(facts);

        // all supplier PLUs (JBS / National etc.)
        var sup = Object.keys(r.pluBySupplier || {});
        if (sup.length > 1) {
          var pl = el('div', 'prod-plus');
          pl.appendChild(el('span', 'prod-plus-label', 'PLU by supplier'));
          sup.forEach(function (k) {
            var t = el('span', 'prod-plu-chip', k.toUpperCase() + ' ' + r.pluBySupplier[k]);
            if (r.pluBySupplier[k] === r.plu) t.classList.add('is-store');
            pl.appendChild(t);
          });
          root.appendChild(pl);
        }

        root.appendChild(el('h3', 'prod-h', 'Ingredients'));
        var ul = el('ul', 'prod-ing-list');
        (r.ingredients || []).forEach(function (ing) {
          var li = el('li', 'prod-ing');
          li.appendChild(el('span', 'prod-ing-amt', ing.measure || '—'));
          li.appendChild(el('span', 'prod-ing-name', ing.name));
          ul.appendChild(li);
        });
        root.appendChild(ul);

        if (r.steps && r.steps.length) {
          root.appendChild(el('h3', 'prod-h', 'Production'));
          var ol = el('ol', 'prod-steps');
          r.steps.forEach(function (s) {
            var li = el('li', 'prod-step');
            if (/^\*?CCP/i.test(s)) li.classList.add('is-ccp');
            li.textContent = s;
            ol.appendChild(li);
          });
          root.appendChild(ol);
        }
        root.appendChild(el('p', 'prod-source', 'Source: Meat Service Case production manual.'));
      }
    };
  }
  function fact(value, label) {
    var d = el('div', 'prod-fact');
    d.appendChild(el('strong', null, value)); d.appendChild(el('span', null, label));
    return d;
  }

  function open() { stack = []; push(listView()); }
  window.MMServiceCaseRecipesUI = { open: open, close: closeAll };

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-recipes-service-case');
    if (b) b.addEventListener('click', open);
  });
})();
