/* MeatMaster — Production List → Recipes For Production
   ==================================================================
   Kyle's flow, in his words (2026-08-13):

     "You input the numbers from the actual printout from Periscope,
      and then that would feed your 'Recipes For Production' button
      which would have the recipes listed, then tap into them for the
      individual steps/recipes."

   So there are exactly three screens, and they are strictly linear:

     1. PRODUCTION LIST  — type in the counts off the paper printout
     2. RECIPES FOR PRODUCTION — every recipe with a count, pre-scaled
     3. RECIPE DETAIL    — scaled ingredients + production steps + photo

   ------------------------------------------------------------------
   DESIGN NOTES
   ------------------------------------------------------------------
   * SELF-CONTAINED. Like caselayout.js, this module owns its own
     overlay and never touches scan / count / session state. It cannot
     break a live inventory count. That property is worth more than any
     feature in here and must not be traded away.

   * The production list PERSISTS to localStorage under one key per
     day. You type it once in the morning and it is still there after
     the phone locks, the app reloads, or you drop it in a cooler.

   * NUMBERS ARE ENTERED, NOT COUNTED. This screen is deliberately dumb
     data entry — it mirrors the paper in your hand. Anything cleverer
     (pre-filling from yesterday, predicting) belongs on top of a log
     that does not exist yet.

   * Recipes are matched by PLU across ALL supplier variants, so a
     Perdue delivery still finds the Pitman recipe.
   ================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'mm.production.v1';

  /* ---------------------------------------------------------------
     Storage — one saved list per calendar day.
     --------------------------------------------------------------- */
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

  function loadToday() {
    var all = loadAll();
    return all[todayKey()] || {};
  }

  function saveToday(counts) {
    var all = loadAll();
    all[todayKey()] = counts;
    // Keep only the last 14 days so storage can't grow without bound.
    var keys = Object.keys(all).sort().slice(-14);
    var trimmed = {};
    keys.forEach(function (k) { trimmed[k] = all[k]; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(trimmed)); } catch (e) {}
  }

  /* ---------------------------------------------------------------
     Data access
     --------------------------------------------------------------- */
  function recipes() {
    var D = window.MMRecipeData;
    if (!D) return [];
    // Sub-recipes (vegetable blends) are not produced to a count of
    // their own — they scale with whatever parent needs them, so they
    // never appear on the production list.
    return D.RECIPES.filter(function (r) { return !r.subRecipe; });
  }

  function scaleFor(recipe, qty) {
    var MM = window.MMRecipes;
    if (!MM) return null;
    return MM.scaleRecipe(recipe, { qty: qty, unit: 'item' });
  }

  /* ---------------------------------------------------------------
     Overlay shell — one overlay, three views, a back stack.
     --------------------------------------------------------------- */
  var overlay, titleEl, bodyEl, backBtn;
  var stack = [];

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay');
    overlay.hidden = true;

    var bar = el('div', 'prod-bar');
    backBtn = el('button', 'prod-back', '‹');
    backBtn.setAttribute('aria-label', 'Back');
    titleEl = el('span', 'prod-title');
    var close = el('button', 'prod-close', '×');
    close.setAttribute('aria-label', 'Close');

    backBtn.addEventListener('click', pop);
    close.addEventListener('click', closeAll);

    bar.appendChild(backBtn);
    bar.appendChild(titleEl);
    bar.appendChild(close);

    bodyEl = el('div', 'prod-body');
    overlay.appendChild(bar);
    overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }

  function push(view) {
    stack.push(view);
    render();
  }

  function pop() {
    if (stack.length <= 1) { closeAll(); return; }
    stack.pop();
    render();
  }

  function closeAll() {
    stack = [];
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('prod-open');
  }

  function render() {
    ensure();
    var view = stack[stack.length - 1];
    if (!view) { closeAll(); return; }
    overlay.hidden = false;
    document.body.classList.add('prod-open');
    titleEl.textContent = view.title;
    backBtn.style.visibility = stack.length > 1 ? 'visible' : 'hidden';
    bodyEl.innerHTML = '';
    bodyEl.scrollTop = 0;
    view.build(bodyEl);
  }

  /* ===============================================================
     VIEW 1 — PRODUCTION LIST (data entry off the paper printout)
     =============================================================== */
  function productionListView() {
    return {
      title: 'Production List',
      build: function (root) {
        var counts = loadToday();

        var note = el('p', 'prod-note',
          'Type the numbers from this morning’s Periscope printout. ' +
          'Saved on this phone for today.');
        root.appendChild(note);

        var summary = el('div', 'prod-summary');
        root.appendChild(summary);

        function refreshSummary() {
          var n = 0, items = 0;
          Object.keys(counts).forEach(function (k) {
            if (counts[k] > 0) { n++; items += counts[k]; }
          });
          summary.innerHTML = '';
          var a = el('div'); a.appendChild(el('strong', null, String(n)));
          a.appendChild(el('span', null, 'Recipes'));
          var b = el('div'); b.appendChild(el('strong', null, String(items)));
          b.appendChild(el('span', null, 'Units'));
          summary.appendChild(a); summary.appendChild(b);
        }
        refreshSummary();

        var list = el('ul', 'prod-entry-list');

        // Group by protein so the screen reads like the printed sheet
        // instead of one long undifferentiated column.
        var groups = [
          { key: 'beef',    label: 'Beef',    test: function (r) { return /sirloin|steak|beef|meatball/i.test(r.name); } },
          { key: 'chicken', label: 'Chicken', test: function (r) { return /chicken/i.test(r.name); } },
          { key: 'seafood', label: 'Seafood', test: function (r) { return /salmon|shrimp|scampi/i.test(r.name); } }
        ];
        var all = recipes(), placed = {};

        groups.forEach(function (g) {
          var members = all.filter(function (r) { return !placed[r.id] && g.test(r); });
          if (!members.length) return;
          members.forEach(function (r) { placed[r.id] = true; });

          var h = el('li', 'prod-group', g.label);
          list.appendChild(h);

          members.forEach(function (r) {
            list.appendChild(entryRow(r, counts, refreshSummary));
          });
        });

        // Anything the grouping missed still gets shown — never silently drop.
        var rest = all.filter(function (r) { return !placed[r.id]; });
        if (rest.length) {
          list.appendChild(el('li', 'prod-group', 'Other'));
          rest.forEach(function (r) { list.appendChild(entryRow(r, counts, refreshSummary)); });
        }

        root.appendChild(list);

        var actions = el('div', 'prod-actions');
        var go = el('button', 'btn btn-primary btn-block', 'Recipes For Production →');
        go.addEventListener('click', function () {
          saveToday(counts);
          push(recipeListView(counts));
        });
        var clear = el('button', 'btn btn-block', 'Clear today’s list');
        clear.addEventListener('click', function () {
          Object.keys(counts).forEach(function (k) { delete counts[k]; });
          saveToday(counts);
          render();
        });
        actions.appendChild(go);
        actions.appendChild(clear);
        root.appendChild(actions);
      }
    };
  }

  function entryRow(r, counts, onChange) {
    var li = el('li', 'prod-entry');

    var main = el('div', 'prod-entry-main');
    main.appendChild(el('div', 'prod-entry-name', r.name));
    var meta = el('div', 'prod-entry-meta');
    meta.textContent = 'PLU ' + (r.plu || '—') + ' · yields ' + r.yield.qty + ' ' + r.yield.unit;
    main.appendChild(meta);
    li.appendChild(main);

    var stepper = el('div', 'prod-stepper');
    var minus = el('button', 'prod-step-btn', '−');
    var input = el('input', 'prod-step-input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '0';
    input.value = counts[r.id] ? String(counts[r.id]) : '';
    input.placeholder = '0';
    var plus = el('button', 'prod-step-btn', '+');

    function set(v) {
      v = Math.max(0, v | 0);
      if (v === 0) { delete counts[r.id]; input.value = ''; }
      else { counts[r.id] = v; input.value = String(v); }
      li.classList.toggle('has-count', v > 0);
      saveToday(counts);
      onChange();
    }

    minus.addEventListener('click', function () { set((parseInt(input.value, 10) || 0) - 1); });
    plus.addEventListener('click',  function () { set((parseInt(input.value, 10) || 0) + 1); });
    input.addEventListener('change', function () { set(parseInt(input.value, 10) || 0); });

    stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus);
    li.appendChild(stepper);
    li.classList.toggle('has-count', (counts[r.id] || 0) > 0);
    return li;
  }

  /* ===============================================================
     VIEW 2 — RECIPES FOR PRODUCTION (the day's playlist)
     =============================================================== */
  function recipeListView(counts) {
    return {
      title: 'Recipes For Production',
      build: function (root) {
        var wanted = recipes().filter(function (r) { return (counts[r.id] || 0) > 0; });

        if (!wanted.length) {
          var empty = el('div', 'prod-empty');
          empty.appendChild(el('div', 'prod-empty-ico', '📋'));
          empty.appendChild(el('p', null, 'Nothing on the production list yet.'));
          empty.appendChild(el('p', 'prod-note', 'Go back and enter the numbers from the printout.'));
          root.appendChild(empty);
          return;
        }

        root.appendChild(el('p', 'prod-note',
          'Tap a recipe for scaled amounts and the production steps.'));

        var ul = el('ul', 'prod-recipe-list');
        wanted.forEach(function (r) {
          var qty = counts[r.id];
          var s = scaleFor(r, qty);

          var li = el('li', 'prod-recipe');
          li.setAttribute('role', 'button');
          li.tabIndex = 0;

          if (r.image) {
            var img = el('img', 'prod-thumb');
            img.src = r.image;
            img.alt = '';
            img.loading = 'lazy';
            li.appendChild(img);
          }

          var txt = el('div', 'prod-recipe-txt');
          txt.appendChild(el('div', 'prod-recipe-name', r.name));

          var line = el('div', 'prod-recipe-meta');
          line.textContent = 'Make ' + qty + ' · recipe yields ' + r.yield.qty +
                             ' · scale ' + (s ? s.scaleLabel : '—');
          txt.appendChild(line);

          var tw = el('div', 'prod-recipe-sub');
          tw.textContent = (r.targetWeightLb ? r.targetWeightLb.toFixed(2) + ' lb per pan · ' : '') +
                           r.shelfLifeDays + '-day shelf life';
          txt.appendChild(tw);
          li.appendChild(txt);

          var chip = el('div', 'prod-qty-chip', String(qty));
          li.appendChild(chip);

          function open() { push(recipeDetailView(r, qty)); }
          li.addEventListener('click', open);
          li.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
          });

          ul.appendChild(li);
        });
        root.appendChild(ul);
      }
    };
  }

  /* ===============================================================
     VIEW 3 — RECIPE DETAIL (scaled amounts + steps)
     =============================================================== */
  function recipeDetailView(r, qty) {
    return {
      title: r.name,
      build: function (root) {
        var s = scaleFor(r, qty);

        if (r.image) {
          var img = el('img', 'prod-hero');
          img.src = r.image; img.alt = r.name; img.loading = 'lazy';
          root.appendChild(img);
        }

        // The headline: what was asked for vs what the recipe makes.
        var head = el('div', 'prod-detail-head');
        head.appendChild(el('div', 'prod-detail-scale', s ? s.scaleLabel : '—'));
        var hm = el('div', 'prod-detail-meta');
        hm.textContent = 'Make ' + qty + ' · recipe yields ' + r.yield.qty + ' ' + r.yield.unit;
        head.appendChild(hm);
        root.appendChild(head);

        var facts = el('div', 'prod-facts');
        if (r.targetWeightLb) {
          facts.appendChild(fact(r.targetWeightLb.toFixed(2) + ' lb', 'Target / pan'));
        }
        facts.appendChild(fact(r.shelfLifeDays + ' days', 'Shelf life'));
        facts.appendChild(fact(r.plu || '—', 'PLU'));
        root.appendChild(facts);

        // All supplier PLUs — Kyle: "List all three PLU variants for safety."
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

        // Ingredients, scaled.
        root.appendChild(el('h3', 'prod-h', 'Ingredients'));
        var ul = el('ul', 'prod-ing-list');
        (s ? s.ingredients : []).forEach(function (i, idx) {
          var src = r.ingredients[idx] || {};
          var li = el('li', 'prod-ing');
          if (src.child) li.classList.add('is-child');

          // "1" next to an ingredient whose NAME starts with a digit
          // ("3 Onion Concentrate") reads as a typo — "1 3 Onion
          // Concentrate". Append the unit in that case only, so the
          // common rows ("4 Lime") stay clean.
          var amtText = i.text;
          if (/^\d+$/.test(amtText) && /^\d/.test(i.name)) amtText += ' ea';
          li.appendChild(el('span', 'prod-ing-amt', amtText));

          var nm = el('span', 'prod-ing-name', i.name);
          li.appendChild(nm);

          if (i.scaleText) li.appendChild(el('span', 'prod-ing-echo', i.scaleText));
          if (src.note)    li.appendChild(el('span', 'prod-ing-note', src.note));
          ul.appendChild(li);
        });
        root.appendChild(ul);

        // Production steps, straight off the back of the card.
        if (r.steps && r.steps.length) {
          root.appendChild(el('h3', 'prod-h', 'Production'));
          var ol = el('ol', 'prod-steps');
          r.steps.forEach(function (t) {
            var li = el('li', 'prod-step');
            if (/^\*?CCP/i.test(t)) li.classList.add('is-ccp');
            li.textContent = t;
            ol.appendChild(li);
          });
          root.appendChild(ol);
        }

        root.appendChild(el('p', 'prod-source',
          'Source: One Pan Meals production manual, card p.' + r.page +
          ' · shelf life per ' + r.shelfLifeSource));
      }
    };
  }

  function fact(value, label) {
    var d = el('div', 'prod-fact');
    d.appendChild(el('strong', null, value));
    d.appendChild(el('span', null, label));
    return d;
  }

  /* ===============================================================
     REFERENCE — ONE PAN MEALS (placement / count aid)
     ---------------------------------------------------------------
     Every One Pan Meal with its photo and PLU, grouped by protein to
     mirror the case sections. This is the digital version of the
     corporate "One Pan Meals" label sheet (reference.js DECK 2), but
     with the color hero photos and the 4-digit PLUs the case tags and
     the scanner actually use. Tapping a meal opens its recipe detail.

     Kyle: placing the ready-pan meals in the right spot is what keeps
     the counts honest — same reason the case layout exists.
     =============================================================== */
  function onePanRefView() {
    return {
      title: 'One Pan Meals',
      build: function (root) {
        root.appendChild(el('p', 'prod-note',
          'Every One Pan Meal with its PLU and photo — for placing pans in the ' +
          'right case spot so the counts line up. Tap a meal for its recipe.'));

        var groups = [
          { label: 'Beef',    test: function (r) { return /sirloin|steak|beef|meatball/i.test(r.name); } },
          { label: 'Chicken', test: function (r) { return /chicken/i.test(r.name); } },
          { label: 'Seafood', test: function (r) { return /salmon|shrimp|scampi/i.test(r.name); } }
        ];
        var all = recipes(), placed = {};

        function card(r) {
          var li = el('li', 'prod-recipe');
          li.setAttribute('role', 'button');
          li.tabIndex = 0;
          if (r.image) {
            var img = el('img', 'prod-thumb');
            img.src = r.image; img.alt = ''; img.loading = 'lazy';
            li.appendChild(img);
          }
          var txt = el('div', 'prod-recipe-txt');
          txt.appendChild(el('div', 'prod-recipe-name', r.name));
          txt.appendChild(el('div', 'prod-recipe-meta', 'PLU ' + (r.plu || '—')));
          li.appendChild(txt);
          if (r.plu) li.appendChild(el('div', 'prod-qty-chip', r.plu));

          function openDetail() { push(recipeDetailView(r, 1)); }
          li.addEventListener('click', openDetail);
          li.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(); }
          });
          return li;
        }

        function section(label, members) {
          if (!members.length) return;
          root.appendChild(el('h3', 'prod-h', label));
          var ul = el('ul', 'prod-recipe-list');
          members.forEach(function (r) { ul.appendChild(card(r)); });
          root.appendChild(ul);
        }

        groups.forEach(function (g) {
          var members = all.filter(function (r) { return !placed[r.id] && g.test(r); });
          members.forEach(function (r) { placed[r.id] = true; });
          section(g.label, members);
        });
        // Anything the grouping missed still shows — never silently dropped.
        section('Other', all.filter(function (r) { return !placed[r.id]; }));
      }
    };
  }

  /* ---------------------------------------------------------------
     Public entry points (wired to the Products-tab buttons)
     --------------------------------------------------------------- */
  function openProductionList() { stack = []; push(productionListView()); }
  function openRecipeList()     { stack = []; push(recipeListView(loadToday())); }
  function openOnePanRef()      { stack = []; push(onePanRefView()); }

  window.MMProduction = {
    openProductionList: openProductionList,
    openRecipeList: openRecipeList,
    openOnePanRef: openOnePanRef,
    close: closeAll,
    todayCounts: loadToday
  };

  document.addEventListener('DOMContentLoaded', function () {
    var a = document.getElementById('btn-production-list');
    var b = document.getElementById('btn-recipes-production');
    var c = document.getElementById('btn-onepan-ref');
    if (a) a.addEventListener('click', openProductionList);
    if (b) b.addEventListener('click', openRecipeList);
    if (c) c.addEventListener('click', openOnePanRef);
  });
})();
