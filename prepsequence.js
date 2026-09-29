/* MeatMaster — Prep Order (time-sorted production)
   Orders TODAY's one-pan production by what actually governs a morning: WAITING,
   not volume (see specs/PREP_SEQUENCING.md). Release the waits first (frozen
   dollops, shrimp thaw), marinate early, knife-work during the waits, kits fill
   gaps. Also surfaces cross-workflow overlap: while a marinade/protein is out,
   which SERVICE-CASE / case items share it, so one trip covers both.

   Directional, not exact — the minute constants aren't calibrated yet; trust the
   ORDER, not the numbers. Self-contained: reads the production counts localStorage
   + recipe data. Touches no scan/count/session state. */
(function () {
  var STORE_KEY = 'mm.production.v1';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadTodayCounts() {
    try { var all = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return all[todayKey()] || {}; }
    catch (e) { return {}; }
  }

  /* ---------- facet extraction ---------- */
  // Frozen garlic-butter dollops must be pulled ahead; shrimp must thaw. These
  // waits aren't in the recipe text, so they're named here (from the spec).
  var FRZ = /garlic\s*&?\s*lemon chicken|herb butter (salmon|shrimp)|shrimp scampi/i;
  var THAW = /cajun butter shrimp|firecracker shrimp|herb butter shrimp|shrimp scampi/i;
  var KNIFE = /\b(cut|slice|sliced|dice|diced|quarter|quartered|chop|chopped|cube|cubed|trim|julienne|mince)\b/g;

  function proteinOf(name) {
    var n = String(name || '').toLowerCase();
    if (/salmon/.test(n)) return 'salmon';
    if (/shrimp|scampi/.test(n)) return 'shrimp';
    if (/chicken/.test(n)) return 'chicken';
    if (/tuna|barramundi|\bcod\b|halibut|mahi|tilapia|swordfish|scallop|lobster|trout/.test(n)) return 'seafood';
    if (/sirloin|steak|beef|flap|skewer|kabob|kebob|meatball|carne|rump|chuck|brisket|ribeye|tri.?tip/.test(n)) return 'beef';
    return null;
  }
  // Normalise a marinade name to an id both recipe sets agree on. "Herb & Butter"
  // and "Herb Butter" must collapse; "Roasted Garlic Lemon Pepper" == "RGLP".
  function normMarinade(name) {
    var s = String(name || '').toLowerCase().replace(/marinade/g, '')
      .replace(/&|\band\b/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/roasted garlic lemon pepper|rglp/.test(s)) return 'rglp';
    if (/citrus|lemon citrus|citrus herb/.test(s)) return 'citrus';
    return s;
  }
  function marinadeOf(recipe) {
    var ings = (recipe && recipe.ingredients) || [];
    for (var i = 0; i < ings.length; i++) {
      if (/marinade/i.test(ings[i].name || '')) return { id: normMarinade(ings[i].name), label: String(ings[i].name).replace(/\s*marinade\s*/i, '').trim() };
    }
    return null;
  }
  function facetsOf(recipe) {
    var name = recipe.name || '';
    var steps = ((recipe.steps || []).join(' ')).toLowerCase();
    var knife = (steps.match(KNIFE) || []).length;
    // A KIT is a pre-assembled component kit (veg / stuffed-pepper kit) that
    // collapses several pulls into one grab — NOT the marinade pouch (that's the
    // MARINATE step). Detect only real kits by name / product code.
    var kit = (recipe.ingredients || []).some(function (i) {
      return /\bkit\b|\(#/i.test(i.name || '');
    });
    var mar = marinadeOf(recipe);
    return {
      frz: FRZ.test(name), thaw: THAW.test(name),
      mar: !!mar || /marinate/.test(steps),
      kit: kit, knife: knife,
      marinade: mar, protein: proteinOf(name)
    };
  }

  /* ---------- cross-workflow: what the case shares ---------- */
  // Build once: marinadeId -> [{name, plu}] from the service-case recipes, and
  // keep the case layout tiles for a protein+flavor fallback (seafood salmon etc).
  function caseSharers(f) {
    var out = [];
    var seen = {};
    function add(name, plu) {
      var k = (plu || name);
      if (seen[k]) return; seen[k] = 1;
      out.push({ name: name, plu: plu || '' });
    }
    // 1) service-case recipes sharing the exact marinade (reliable — same field)
    var SC = window.MMServiceCaseRecipes && window.MMServiceCaseRecipes.RECIPES;
    if (SC && f.marinade) {
      SC.forEach(function (r) {
        var m = marinadeOf(r);
        if (m && m.id === f.marinade.id) add(r.name, r.plu);
      });
    }
    // 2) case-layout tiles for the SEAFOOD case only (salmon/shrimp), which the
    //    service-case recipe set doesn't cover — this is the case-fill Kyle named
    //    (salmon one-pan while the case is low on the matching salmon portions).
    //    Conservative on flavour: false negatives beat false positives here.
    var flavour = f.marinade ? f.marinade.id : null;
    if (flavour && (f.protein === 'salmon' || f.protein === 'shrimp' || f.protein === 'seafood')) {
      var pages = (window.MMCaseLayout && window.MMCaseLayout.pages) || [];
      pages.forEach(function (pg) {
        if (pg.type === 'garnish') return;
        [].concat(pg.front || [], pg.back || []).forEach(function (t) {
          if (!t || !t.name) return;
          if (proteinOf(t.name) !== f.protein) return;
          var tn = t.name.toLowerCase();
          var key = flavour.split(' ')[0];
          // 'citrus' must literally say citrus (a "lemon pepper" salmon is a
          // different marinade); other flavours match their leading word.
          var hit = (flavour === 'citrus') ? /citrus/.test(tn) : (key && tn.indexOf(key) !== -1);
          if (hit) add(t.name, t.plu);
        });
      });
    }
    return out;
  }

  /* ---------- the sequence ---------- */
  function recipesById() {
    var map = {};
    var R = (window.MMRecipeData && window.MMRecipeData.RECIPES) || [];
    R.forEach(function (r) { if (!r.subRecipe) map[r.id] = r; });
    return map;
  }
  function build() {
    var counts = loadTodayCounts();
    var byId = recipesById();
    var items = [];
    Object.keys(counts).forEach(function (id) {
      var qty = +counts[id];
      var r = byId[id];
      if (!qty || qty <= 0 || !r) return;
      var f = facetsOf(r);
      items.push({ recipe: r, qty: qty, f: f, shares: caseSharers(f) });
    });
    // Wait-driven order: things that must START first (need a wait or a marinade)
    // come first so the wait overlaps; then knife-heavy during the waits; kits last.
    items.sort(function (a, b) {
      var aw = (a.f.frz || a.f.thaw || a.f.mar) ? 0 : 1;
      var bw = (b.f.frz || b.f.thaw || b.f.mar) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      if (a.f.knife !== b.f.knife) return b.f.knife - a.f.knife;   // knife-heavy earlier
      var ak = a.f.kit ? 1 : 0, bk = b.f.kit ? 1 : 0;
      if (ak !== bk) return ak - bk;                                // kits fill gaps (later)
      return String(a.recipe.name).localeCompare(String(b.recipe.name));
    });
    return items;
  }

  /* ---------- UI ---------- */
  var overlay, bodyEl;
  function ensure() {
    if (overlay) return;
    overlay = el('div', 'ps-overlay');
    overlay.hidden = true;
    var bar = el('div', 'case-bar');
    bar.appendChild(el('span', 'case-title', 'Prep Order'));
    var close = el('button', 'case-close'); close.innerHTML = '&times;';
    close.addEventListener('click', function () { overlay.hidden = true; });
    bar.appendChild(close);
    overlay.appendChild(bar);
    bodyEl = el('div', 'ps-body');
    overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }

  function flagPill(text, cls) { return el('span', 'ps-flag ' + cls, text); }

  function render() {
    ensure();
    bodyEl.innerHTML = '';
    var items = build();
    if (!items.length) {
      bodyEl.appendChild(el('div', 'ps-empty', 'No production entered for today yet. Fill in the One-Pan Meals Production List first.'));
      return;
    }

    // ① Release the waits — the unattended pulls/thaws, gathered up front.
    var frz = items.filter(function (i) { return i.f.frz; });
    var thaw = items.filter(function (i) { return i.f.thaw; });
    if (frz.length || thaw.length) {
      var t0 = el('div', 'ps-tier0');
      t0.appendChild(el('div', 'ps-tier0-head', '① Release the waits — do these first'));
      if (frz.length) t0.appendChild(el('div', 'ps-wait', '🧈 Pull frozen garlic-butter dollops — for: ' + frz.map(function (i) { return i.recipe.name; }).join(', ')));
      if (thaw.length) t0.appendChild(el('div', 'ps-wait', '🦐 Start shrimp thawing — for: ' + thaw.map(function (i) { return i.recipe.name; }).join(', ')));
      bodyEl.appendChild(t0);
    }

    bodyEl.appendChild(el('div', 'ps-tier0-head', '② Make in this order'));
    var list = el('div', 'ps-list');
    items.forEach(function (it, idx) {
      var row = el('div', 'ps-row');
      row.appendChild(el('div', 'ps-num', String(idx + 1)));
      var body = el('div', 'ps-row-body');
      var head = el('div', 'ps-row-head');
      head.appendChild(el('span', 'ps-name', it.recipe.name));
      head.appendChild(el('span', 'ps-qty', '×' + it.qty));
      body.appendChild(head);
      var flags = el('div', 'ps-flags');
      if (it.f.frz) flags.appendChild(flagPill('FROZEN', 'is-frz'));
      if (it.f.thaw) flags.appendChild(flagPill('THAW', 'is-thaw'));
      if (it.f.mar) flags.appendChild(flagPill('MARINATE', 'is-mar'));
      if (it.f.kit) flags.appendChild(flagPill('KIT', 'is-kit'));
      if (it.f.knife) flags.appendChild(flagPill('knife ×' + it.f.knife, 'is-knife'));
      if (flags.children.length) body.appendChild(flags);
      if (it.shares && it.shares.length) {
        var mark = it.f.marinade ? it.f.marinade.label : (it.f.protein || '');
        var cov = el('div', 'ps-covers', '↳ case also uses ' + mark + ': ' +
          it.shares.map(function (s) { return s.name + (s.plu ? (' (' + s.plu + ')') : ''); }).join(' · '));
        body.appendChild(cov);
      }
      row.appendChild(body);
      list.appendChild(row);
    });
    bodyEl.appendChild(list);
    bodyEl.appendChild(el('div', 'ps-note', 'Order is a guide from what waits, not a law. Minutes aren’t calibrated yet — trust the sequence.'));
  }

  function open() { render(); overlay.hidden = false; }

  function wire() {
    var btn = document.getElementById('btn-prep-order');
    if (btn) btn.addEventListener('click', open);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.MMPrepOrder = { open: open };
})();
