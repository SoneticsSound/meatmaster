/* MeatMaster — Case Layout reference
   A paged, swipeable diagram of where each PLU lives in the physical cases,
   opened from a "View Case Layout" button on the Products tab.

   This is a REFERENCE ONLY module — it is fully self-contained and never
   touches the scan/count/session logic, so it cannot affect a live count.

   The layout below is transcribed from Kyle's case photos (best-effort).
   Treat it as an editable draft: the manager's physical case is the source
   of truth. To fix a tile, edit its { plu, name } here. To reorder, move it.
*/
(function () {
  'use strict';

  // Each page is one case/section. `tiles` render as PLU-forward window cards.
  // A page with `type:'garnish'` renders item -> garnish rows instead.
  var PAGES = [
    {
      title: 'Beef — Fresh Cuts',
      note: 'Left to right, as they sit in the case.',
      front: [
        { plu: '98010', name: 'Grassfed NY Strip Steak' },
        { plu: '73320', name: 'Boneless Tenderloin Steak' },
        { plu: '73260', name: 'Boneless NY Steak' }
      ],
      back: [
        { plu: '73160', name: 'Boneless Ribeye Steak' },
        { plu: '98050', name: 'Grassfed Filet Mignon' },
        { plu: '7290',  name: 'Uncured Smokey Bacon' }
      ]
    },
    {
      title: 'Beef — Ground & Burgers',
      front: [
        { plu: '9800', name: '100% Grassfed Ground Beef' },
        { plu: '7071', name: 'Chuck & Brisket Burgers' }
      ],
      back: [
        { plu: '7072', name: 'Chuck & Brisket Ground' },
        { plu: '7070', name: 'Cowboy Beef Burgers' }
      ]
    },
    {
      title: 'Beef — Marinated',
      front: [
        { plu: '7539', name: 'Org 85% Lean Grassfed' },
        { plu: '7879', name: 'Chimichurri Steak' },
        { plu: '7635', name: 'Black Garlic Steak Kabobs' },
        { plu: '7073', name: 'Korean BBQ Beef Skewers' }
      ],
      back: [
        { plu: '7010', name: 'Cowboy Beef Burgers' },
        { plu: '7659', name: 'Carne Asada' },
        { plu: '7547', name: 'Angus Grassfed Beef' },
        { plu: '7074', name: 'Black Truffle Beef Skewers' }
      ]
    },
    {
      title: 'Marinated Chicken',
      note: 'Wings & thighs, then stuffed breasts & skewers.',
      front: [
        { plu: '8246', name: 'Korean BBQ Chicken Skewers' },
        { plu: '8162', name: 'Citrus Lemon Chicken Kabob' },
        { plu: '8354', name: 'Pesto Fontina Stuffed Breast' },
        { plu: '8355', name: 'Parmesan Stuffed Breast' },
        { plu: '8718', name: 'Citrus Herb B/L Chicken' },
        { plu: '8157', name: 'Pollo Asado' },
        { plu: '8346', name: 'Korean BBQ Wings' },
        { plu: '8343', name: 'Cajun Butter Wings' },
        { plu: '8363', name: 'Red Chimichurri Wings' },
        { plu: '8197', name: 'Black Garlic Wings' }
      ],
      back: [
        { plu: '8235', name: 'Black Garlic Chicken Skewers' },
        { plu: '8352', name: 'Mushroom Stuffed Breast' },
        { plu: '8353', name: 'Mediterranean Stuffed Breast' },
        { plu: '8351', name: 'Herb Butter Breast' },
        { plu: '8328', name: 'Hot Honey Chipotle Breast' },
        { plu: '8157', name: 'Pollo Asado' },
        { plu: '8325', name: 'Hot Honey Chipotle Wings' },
        { plu: '8058', name: 'Jamaican Jerk Wings' },
        { plu: '8248', name: 'Roasted Garlic Lemon Pepper Wings' }
      ]
    },
    {
      title: 'Seafood — Fresh Fish',
      front: [
        { plu: '9145', name: 'Wild Sockeye Salmon' },
        { plu: '9180', name: 'Tilapia Fillet' },
        { plu: '9132', name: 'Wild Sea Scallops' },
        { plu: '9109', name: 'Wild Halibut Portions' },
        { plu: '9413', name: 'Black Garlic Barramundi' },
        { plu: '9367', name: 'Raw Wild Shrimp' }
      ],
      back: [
        { plu: '9144', name: 'Atlantic Salmon Fillet' },
        { plu: '9460', name: 'Atlantic Salmon Farmed' },
        { plu: '9567', name: 'Steelhead Trout Fillet' },
        { plu: '9056', name: 'Wild Cod Fillet' },
        { plu: '9043', name: 'Wild Swordfish Steak' },
        { plu: '9053', name: 'Wild Ahi Tuna' }
      ]
    },
    {
      title: 'Seafood — Shrimp, Poke & Marinated',
      front: [
        { plu: '9367', name: 'Raw Wild Shrimp' },
        { plu: '9504', name: 'Poke Ahi Tuna Marinated' },
        { plu: '9165', name: 'Red Chimichurri Salmon' },
        { plu: '9105', name: 'Lemon Pepper Garlic Salmon' },
        { plu: '9532', name: 'Black Garlic Salmon Portion' }
      ],
      back: [
        { plu: '9310', name: 'Raw Shrimp 16/20' },
        { plu: '9040', name: 'Black Garlic Ahi Tuna' },
        { plu: '9038', name: 'Black Garlic Wild Salmon' },
        { plu: '9128', name: 'Hot Honey Chipotle Salmon' },
        { plu: '9587', name: 'Lemon Pepper Steelhead' }
      ]
    },
    {
      title: 'Garnish Guide',
      note: 'Prep garnish per item. From the service-case sheets.',
      type: 'garnish',
      groups: [
        {
          heading: 'Seafood Service Case',
          rows: [
            { item: 'Black Garlic Barramundi', garnish: 'Chopped Italian parsley' },
            { item: 'Cilantro Lime Salmon (Atlantic & Sockeye)', garnish: 'Sliced lime half-moons & chopped cilantro' },
            { item: 'Citrus & Lemon Colossal Shrimp', garnish: 'Chopped Italian parsley' }
          ]
        },
        {
          heading: 'Meat Service Case',
          rows: [
            { item: 'Black Truffle Beef Skewers', garnish: 'Chopped Italian parsley' },
            { item: 'Carne Asada', garnish: 'Chopped green onion, diced red onion' },
            { item: 'Korean BBQ Beef Skewers', garnish: 'Chopped green onion, sesame seeds' },
            { item: 'Black Garlic Wings', garnish: 'Chopped Italian parsley' },
            { item: 'Cilantro Lime Wings', garnish: 'Diced white onion & chopped cilantro' },
            { item: 'Jamaican Jerk Wings', garnish: 'Chopped green onions' },
            { item: 'Cilantro Lime Chicken Skewers', garnish: 'Diced white onion & chopped cilantro' },
            { item: 'Korean BBQ Chicken Skewers', garnish: 'Chopped green onion, sesame seeds' },
            { item: 'Cajun Lemon Chicken Breast', garnish: 'Chopped Italian parsley' },
            { item: 'Pollo Asado', garnish: 'Chopped green onion, diced red onion' }
          ]
        },
        {
          heading: 'Quick notes',
          rows: [
            { item: 'Red Chimichurri', garnish: 'Diced red bell pepper & chopped parsley' },
            { item: 'Cajun Wings', garnish: 'Organic thyme (from the bulk section)' },
            { item: 'Korean BBQ Wings', garnish: 'Sesame seeds & green onion' },
            { item: 'Jamaican Jerk Thighs', garnish: 'Green onion' },
            { item: 'Herb Butter Breasts', garnish: 'Parsley' },
            { item: 'Mediterranean Breasts', garnish: 'Wild garlic marinade' },
            { item: 'Mushroom Breasts', garnish: 'Truffle marinade' }
          ]
        }
      ]
    }
  ];

  var idx = 0;
  var DISPLAY = [];   // sections flattened into 2x2 (4-tile) display pages
  var overlay, pageEl, titleEl, dotsEl, prevBtn, nextBtn;

  function el(id) { return document.getElementById(id); }

  function tileNode(t) {
    var d = document.createElement('div');
    d.className = 'case-tile';
    var p = document.createElement('div');
    p.className = 'case-tile-plu';
    p.textContent = t.plu;
    var n = document.createElement('div');
    n.className = 'case-tile-name';
    n.textContent = t.name;
    d.appendChild(p);
    d.appendChild(n);
    return d;
  }

  function rowGrid(items) {
    var grid = document.createElement('div');
    grid.className = 'case-grid';
    (items || []).forEach(function (t) { grid.appendChild(tileNode(t)); });
    return grid;
  }

  function glassBanner(text) {
    var b = document.createElement('div');
    b.className = 'case-glass';
    b.textContent = text;
    return b;
  }

  function rowLabel(text) {
    var l = document.createElement('div');
    l.className = 'case-rowlabel';
    l.textContent = text;
    return l;
  }

  // Flatten each section's item list into 2x2 (4-tile) display pages, in order.
  function buildDisplay() {
    DISPLAY = [];
    PAGES.forEach(function (section) {
      if (section.type === 'garnish') { DISPLAY.push({ garnish: section }); return; }
      var f = section.front || [], b = section.back || [];
      var n = Math.max(f.length, b.length);
      var total = Math.max(1, Math.ceil(n / 2));
      for (var c = 0; c < total; c++) {
        var i = c * 2;
        DISPLAY.push({
          section: section,
          title: section.title + (total > 1 ? ' (' + (c + 1) + '/' + total + ')' : ''),
          top: [f[i], f[i + 1]],       // customer glass (far)
          bottom: [b[i], b[i + 1]]     // service glass (closest to you)
        });
      }
    });
  }

  // One page = a 2x2 grid. Top row = Customer glass (far side); bottom row =
  // Service glass, the PLUs closest to the clerk. Left to right within each row.
  function render2x2(dp) {
    var wrap = document.createElement('div');
    wrap.className = 'case-2x2';
    wrap.appendChild(glassBanner('Customer glass · far'));
    var grid = document.createElement('div');
    grid.className = 'case-grid2';
    [dp.top[0], dp.top[1], dp.bottom[0], dp.bottom[1]].forEach(function (t) {
      if (t) {
        grid.appendChild(tileNode(t));
      } else {
        var e = document.createElement('div');
        e.className = 'case-tile is-empty';
        grid.appendChild(e);
      }
    });
    wrap.appendChild(grid);
    wrap.appendChild(glassBanner('Closest to you · service glass'));
    return wrap;
  }

  function renderGarnish(page) {
    var wrap = document.createElement('div');
    wrap.className = 'case-garnish';
    page.groups.forEach(function (g) {
      var h = document.createElement('div');
      h.className = 'case-garnish-head';
      h.textContent = g.heading;
      wrap.appendChild(h);
      g.rows.forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'case-garnish-row';
        var i = document.createElement('div');
        i.className = 'case-garnish-item';
        i.textContent = r.item;
        var v = document.createElement('div');
        v.className = 'case-garnish-val';
        v.textContent = r.garnish;
        row.appendChild(i);
        row.appendChild(v);
        wrap.appendChild(row);
      });
    });
    return wrap;
  }

  // Physical orientation from the clerk's side: [ Meat -> Chicken ] | [ Seafood ]
  function caseLabelFor(page) {
    var t = page.title || '';
    if (/^Seafood/.test(t)) return 'Case 2 · Seafood (right)';
    if (/^Garnish/.test(t)) return 'Reference';
    return 'Case 1 · Meat → Chicken (left)';
  }

  function render() {
    if (!pageEl) return;
    if (!DISPLAY.length) buildDisplay();
    var dp = DISPLAY[idx];
    var section = dp.garnish || dp.section;
    titleEl.textContent = dp.garnish ? dp.garnish.title : dp.title;
    pageEl.innerHTML = '';
    pageEl.scrollTop = 0;

    var cl = document.createElement('p');
    cl.className = 'case-caselabel';
    cl.textContent = caseLabelFor(section);
    pageEl.appendChild(cl);

    if (dp.garnish && section.note) {
      var note = document.createElement('p');
      note.className = 'case-note';
      note.textContent = section.note;
      pageEl.appendChild(note);
    }
    pageEl.appendChild(dp.garnish ? renderGarnish(dp.garnish) : render2x2(dp));

    var draft = document.createElement('p');
    draft.className = 'case-draft';
    draft.textContent = 'Draft from case photos — check against the case.';
    pageEl.appendChild(draft);

    // dots
    dotsEl.innerHTML = '';
    DISPLAY.forEach(function (_, i) {
      var dot = document.createElement('span');
      dot.className = 'case-dot' + (i === idx ? ' is-on' : '');
      dotsEl.appendChild(dot);
    });
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === DISPLAY.length - 1;
  }

  function open() { if (overlay) { buildDisplay(); idx = 0; overlay.hidden = false; render(); } }
  function close() { if (overlay) overlay.hidden = true; }
  function next() { if (idx < DISPLAY.length - 1) { idx++; render(); } }
  function prev() { if (idx > 0) { idx--; render(); } }

  function wire() {
    overlay = el('case-overlay');
    pageEl = el('case-page');
    titleEl = el('case-title');
    dotsEl = el('case-dots');
    prevBtn = el('case-prev');
    nextBtn = el('case-next');
    var openBtn = el('btn-view-case-layout');
    var closeBtn = el('case-close');
    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    // swipe left/right to flip pages
    if (pageEl) {
      var x0 = null;
      pageEl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      pageEl.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (dx < -45) next();
        else if (dx > 45) prev();
        x0 = null;
      }, { passive: true });
    }
    // keyboard (desktop testing / accessibility)
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  window.MMCaseLayout = { open: open, pages: PAGES };
})();
