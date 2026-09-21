/* MeatMaster — Single Garnish Mode
   Pick ONE garnish (the six Kyle actually preps) and get: the list of items
   that need it, in case-walk order, plus a small case map with those spots
   highlighted — so he can grab one garnish and hit every spot in one pass.

   Self-contained: reads the case layout (MMCaseLayout.pages) and the derived
   garnish walk (MMReference.buildGarnishWalk). Touches no scan/count state. */
(function () {
  // The six base garnishes, each with a highlight color for the map.
  var GARNISHES = [
    { key: 'Red Bell Pepper', color: '#ff5a4d' },
    { key: 'Red Onion',       color: '#c879e6' },
    { key: 'Green Onion',     color: '#4ade80' },
    { key: 'Parsley',         color: '#9ae66e' },
    { key: 'Sesame Seed',     color: '#e8c07d' },
    { key: 'Thyme',           color: '#b7c290' }
  ];

  function el(id) { return document.getElementById(id); }
  var overlay, pickEl, bodyEl, current = null;

  // Does an item's garnish include this base garnish? Kyle's rules:
  //  - RGLP (Roasted Garlic Lemon Pepper) items also get parsley.
  function usesGarnish(entry, key) {
    var g = String(entry.garnish || '').toLowerCase();
    var item = String(entry.item || '').toLowerCase();
    var both = item + ' ' + g;
    switch (key) {
      case 'Red Bell Pepper': return /red bell/.test(g);
      case 'Red Onion':       return /red onion/.test(g);
      case 'Green Onion':     return /green onion/.test(g);
      case 'Parsley':         return /parsley/.test(g) || /rglp|roasted garlic lemon pepper/.test(both);
      case 'Sesame Seed':     return /sesame/.test(g);
      case 'Thyme':           return /thyme/.test(g);
    }
    return false;
  }

  function walkData() {
    if (window.MMReference && window.MMReference.buildGarnishWalk && window.MMCaseLayout) {
      return window.MMReference.buildGarnishWalk(window.MMCaseLayout.pages, window.MMReference.GARNISH);
    }
    return { walk: [], unplaced: [] };
  }

  // Set of PLUs (and item names, as a fallback) that use this garnish.
  function selectionFor(key, data) {
    var plus = {}, names = {};
    (data.walk || []).concat(data.unplaced || []).forEach(function (e) {
      if (!usesGarnish(e, key)) return;
      if (e.plu) plus[e.plu] = true;
      if (e.item) names[String(e.item).toLowerCase()] = true;
    });
    return { plus: plus, names: names };
  }

  function chip(text, cls) {
    var s = document.createElement('span');
    s.className = 'sg-chip' + (cls ? ' ' + cls : '');
    s.textContent = text;
    return s;
  }

  // The ordered checklist of items needing this garnish (case-walk order).
  function renderList(key, data, color) {
    var wrap = document.createElement('div');
    wrap.className = 'sg-list';
    var rows = (data.walk || []).filter(function (e) { return usesGarnish(e, key); });
    var extra = (data.unplaced || []).filter(function (e) { return usesGarnish(e, key); });

    var h = document.createElement('div');
    h.className = 'sg-list-head';
    h.textContent = rows.length + extra.length + ' spot' + ((rows.length + extra.length) === 1 ? '' : 's') + ' · in walk order';
    wrap.appendChild(h);

    rows.forEach(function (r, i) {
      var row = document.createElement('div');
      row.className = 'sg-row';
      var num = document.createElement('div');
      num.className = 'sg-row-num';
      num.style.background = color;
      num.textContent = (i + 1);
      var body = document.createElement('div');
      body.className = 'sg-row-body';
      var nm = document.createElement('div');
      nm.className = 'sg-row-name';
      nm.textContent = r.item + (r.plu ? '  ·  ' + r.plu : '');
      body.appendChild(nm);
      if (r.where) {
        var w = document.createElement('div');
        w.className = 'sg-row-where';
        w.textContent = r.where.section + ' · pos ' + r.where.position + ' · ' + r.where.row + ' row';
        body.appendChild(w);
      }
      row.appendChild(num); row.appendChild(body);
      wrap.appendChild(row);
    });

    if (extra.length) {
      var eh = document.createElement('div');
      eh.className = 'sg-list-head sg-list-sub';
      eh.textContent = 'No mapped case spot — place by hand';
      wrap.appendChild(eh);
      extra.forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'sg-row is-extra';
        var body = document.createElement('div');
        body.className = 'sg-row-body';
        var nm = document.createElement('div');
        nm.className = 'sg-row-name';
        nm.textContent = r.item + (r.plu ? '  ·  ' + r.plu : '');
        body.appendChild(nm);
        row.appendChild(body);
        wrap.appendChild(row);
      });
    }
    if (!rows.length && !extra.length) {
      var none = document.createElement('div');
      none.className = 'sg-empty';
      none.textContent = 'No items use ' + key + ' in the mapped case yet.';
      wrap.appendChild(none);
    }
    return wrap;
  }

  // A compact case map: each section = two rows (far / near) of small PLU cells,
  // the ones needing this garnish lit up in the garnish color.
  function renderMap(sel, color) {
    var wrap = document.createElement('div');
    wrap.className = 'sg-map';
    var pages = (window.MMCaseLayout && window.MMCaseLayout.pages) || [];
    pages.forEach(function (page) {
      if (page.type === 'garnish') return;
      var front = page.front || [], back = page.back || [];
      if (!front.length && !back.length) return;

      var sec = document.createElement('div');
      sec.className = 'sg-map-sec';
      var title = document.createElement('div');
      title.className = 'sg-map-title';
      title.textContent = page.title;
      sec.appendChild(title);

      [['far', front], ['near', back]].forEach(function (pair) {
        var lbl = document.createElement('div');
        lbl.className = 'sg-map-rowlabel';
        lbl.textContent = pair[0] === 'far' ? 'far (customer)' : 'near (you)';
        sec.appendChild(lbl);
        var grid = document.createElement('div');
        grid.className = 'sg-map-grid';
        (pair[1] || []).forEach(function (tile) {
          var c = document.createElement('div');
          c.className = 'sg-cell';
          if (tile && tile.plu) {
            c.textContent = tile.plu;
            if (sel.plus[tile.plu] || (tile.name && sel.names[String(tile.name).toLowerCase()])) {
              c.classList.add('is-hit');
              c.style.background = color;
              c.style.borderColor = color;
              c.title = tile.name || '';
            }
          } else {
            c.classList.add('is-empty');
          }
          grid.appendChild(c);
        });
        sec.appendChild(grid);
      });
      wrap.appendChild(sec);
    });
    return wrap;
  }

  function pick(key) {
    current = key;
    var g = GARNISHES.filter(function (x) { return x.key === key; })[0];
    var color = (g && g.color) || '#4ade80';
    // toggle active state on the picker
    Array.prototype.forEach.call(pickEl.children, function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-g') === key);
    });
    var data = walkData();
    var sel = selectionFor(key, data);
    bodyEl.innerHTML = '';
    bodyEl.appendChild(renderList(key, data, color));
    bodyEl.appendChild(renderMap(sel, color));
    bodyEl.scrollTop = 0;
  }

  function buildPicker() {
    pickEl.innerHTML = '';
    GARNISHES.forEach(function (g) {
      var b = document.createElement('button');
      b.className = 'sg-pick-btn';
      b.setAttribute('data-g', g.key);
      var dot = document.createElement('span');
      dot.className = 'sg-pick-dot';
      dot.style.background = g.color;
      b.appendChild(dot);
      b.appendChild(document.createTextNode(g.key));
      b.addEventListener('click', function () { pick(g.key); });
      pickEl.appendChild(b);
    });
  }

  function open() {
    if (!overlay) return;
    overlay.hidden = false;
    if (!pickEl.children.length) buildPicker();
    // default to the first garnish so the screen isn't empty
    pick(current || GARNISHES[0].key);
  }
  function close() { if (overlay) overlay.hidden = true; }

  function wire() {
    overlay = el('sg-overlay');
    pickEl = el('sg-pick');
    bodyEl = el('sg-body');
    var openBtn = el('btn-single-garnish');
    var closeBtn = el('sg-close');
    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else { wire(); }

  window.MMSingleGarnish = { open: open };
})();
