/* MeatMaster - persistent count session (Session 4)
   Confirmed scans become evidence rows. Counts are derived from those rows so
   mistaken scans can be removed without corrupting totals. */

(function () {
  'use strict';

  var STORE_KEY = 'mm.countSession.v1';
  var SAVED_KEY = 'mm.savedSessions.v1';
  var state = { startedAt: null, scans: [] };
  var savedSessions = [];

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      state = raw ? JSON.parse(raw) : { startedAt: null, scans: [] };
      if (!state || !Array.isArray(state.scans)) state = { startedAt: null, scans: [] };
    } catch (e) {
      state = { startedAt: null, scans: [] };
    }
    if (!state.startedAt) state.startedAt = new Date().toISOString();
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      savedSessions = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(savedSessions)) savedSessions = [];
    } catch (e) {
      savedSessions = [];
    }
  }

  function saveSaved() {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(savedSessions)); } catch (e) {}
  }

  function id() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function codeText(code) {
    return String(code || '').replace(/\s+/g, ' ').trim();
  }

  function keyFor(product, code) {
    if (product && product.plu) return 'plu:' + product.plu;
    return 'code:' + codeText(code);
  }

  function recentDuplicate(code) {
    var c = codeText(code);
    if (!c) return false;
    var now = Date.now();
    return state.scans.some(function (s) {
      if (s.removed || s.code !== c) return false;
      var t = Date.parse(s.at || '');
      return t && (now - t) < 10 * 1000;
    });
  }

  function addScan(payload) {
    load();
    var product = payload.product || null;
    var code = codeText(payload.code);
    var scan = {
      id: id(),
      at: new Date().toISOString(),
      code: code,
      format: payload.format || '',
      productKey: keyFor(product, code),
      productName: product ? product.name : (payload.name || 'Unknown product'),
      plu: product && product.plu ? product.plu : '',
      sheetName: product && product.sheetName ? product.sheetName : '',
      category: product && product.category ? product.category : 'Unknown',
      price: payload.price || '',
      duplicate: recentDuplicate(code),
      removed: false
    };
    state.scans.unshift(scan);
    save();
    render();
    return scan;
  }

  function removeScan(scanId) {
    load();
    state.scans = state.scans.map(function (s) {
      if (s.id === scanId) {
        var copy = {};
        Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
        copy.removed = true;
        copy.removedAt = new Date().toISOString();
        return copy;
      }
      return s;
    });
    save();
    render();
  }

  function confirmNotDuplicate(scanId) {
    if (!scanId) return;
    load();
    state.scans = state.scans.map(function (s) {
      if (s.id === scanId && s.duplicate) {
        var copy = {};
        Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
        copy.duplicate = false;
        copy.confirmedAt = new Date().toISOString();
        return copy;
      }
      return s;
    });
    save();
    render();
  }

  function clearSession() {
    state = { startedAt: new Date().toISOString(), scans: [] };
    save();
    render();
  }

  function snapshotSession(label) {
    load();
    loadSaved();
    var active = activeScans();
    if (!active.length) return null;
    var stamp = new Date();
    var snap = {
      id: id(),
      label: label || ('Session ' + stamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
      savedAt: stamp.toISOString(),
      startedAt: state.startedAt,
      scans: active
    };
    savedSessions.unshift(snap);
    saveSaved();
    renderExportOptions();
    return snap;
  }

  function applyProductToCode(code, product) {
    load();
    var c = codeText(code);
    state.scans = state.scans.map(function (s) {
      if (s.removed || s.code !== c) return s;
      var copy = {};
      Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
      copy.productKey = keyFor(product, c);
      copy.productName = product && product.name ? product.name : copy.productName;
      copy.plu = product && product.plu ? product.plu : copy.plu;
      copy.sheetName = product && product.sheetName ? product.sheetName : copy.sheetName;
      copy.category = product && product.category ? product.category : copy.category;
      return copy;
    });
    save();
    render();
  }

  function activeScans() {
    load();
    return state.scans.filter(function (s) { return !s.removed; });
  }

  function scansForExport(sessionId) {
    load();
    loadSaved();
    if (!sessionId || sessionId === 'active') return activeScans();
    var found = savedSessions.find(function (s) { return s.id === sessionId; });
    return found ? found.scans.filter(function (s) { return !s.removed; }) : [];
  }

  function groupedFrom(scans) {
    var groups = {};
    scans.forEach(function (s) {
      var key = s.productKey || ('code:' + s.code);
      if (!groups[key]) {
        groups[key] = {
          key: key,
          productName: s.productName,
          plu: s.plu,
          sheetName: s.sheetName,
          category: s.category,
          count: 0
        };
      }
      groups[key].count++;
    });
    return Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) {
      return String(a.productName).localeCompare(String(b.productName));
    });
  }

  function grouped() {
    return groupedFrom(activeScans());
  }

  function renderSummary() {
    var list = document.getElementById('session-count-list');
    var total = document.getElementById('session-total');
    var unique = document.getElementById('session-unique');
    if (!list) return;
    var groups = grouped();
    var scans = activeScans();
    if (total) total.textContent = scans.length;
    if (unique) unique.textContent = groups.length;
    list.innerHTML = '';
    if (!groups.length) {
      var empty = document.createElement('li');
      empty.className = 'session-empty';
      empty.textContent = 'No confirmed scans yet.';
      list.appendChild(empty);
      return;
    }
    groups.forEach(function (g) {
      var li = document.createElement('li');
      li.className = 'count-item';
      var qty = document.createElement('div');
      qty.className = 'count-qty';
      qty.textContent = g.count;
      var body = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'count-name';
      name.textContent = g.productName;
      var meta = document.createElement('div');
      meta.className = 'count-meta';
      meta.textContent = (g.plu ? ('PLU ' + g.plu + ' - ') : '') + (g.category || 'Unknown');
      body.appendChild(name);
      body.appendChild(meta);
      li.appendChild(qty);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function renderLog() {
    var list = document.getElementById('session-scan-list');
    if (!list) return;
    list.innerHTML = '';
    var scans = activeScans();
    scans.slice(0, 80).forEach(function (s) {
      var li = document.createElement('li');
      li.className = 'scan-swipe' + (s.duplicate ? ' is-duplicate' : '') + (s.confirmedAt ? ' is-confirmed' : '');
      var actions = document.createElement('div');
      actions.className = 'scan-actions';
      if (s.duplicate) {
        var keep = document.createElement('button');
        keep.className = 'scan-action scan-keep';
        keep.type = 'button';
        keep.textContent = 'Confirm';
        keep.addEventListener('click', function () { confirmNotDuplicate(s.id); });
        actions.appendChild(keep);
      }
      var edit = document.createElement('button');
      edit.className = 'scan-action scan-edit';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function () {
        if (window.MMEditProductByCode) window.MMEditProductByCode(s.code);
      });
      actions.appendChild(edit);
      var remove = document.createElement('button');
      remove.className = 'scan-action scan-delete';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () { removeScan(s.id); });
      actions.appendChild(remove);

      var row = document.createElement('div');
      row.className = 'scan-row';
      var body = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'scan-row-name';
      var product = (!s.productName || s.productName === 'Unknown product') && window.MMProducts ? window.MMProducts.findByCode(s.code) : null;
      name.textContent = (product && product.name) || s.productName || s.code;
      if (s.duplicate) {
        var badge = document.createElement('span');
        badge.className = 'dupe-badge';
        badge.textContent = 'Duplicate Scan';
        name.appendChild(badge);
      } else if (s.confirmedAt) {
        var confirmed = document.createElement('span');
        confirmed.className = 'confirmed-badge';
        confirmed.textContent = 'Confirmed';
        name.appendChild(confirmed);
      }
      var meta = document.createElement('div');
      meta.className = 'scan-row-meta';
      var t = new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      meta.textContent = t + ' - ' + s.code;
      body.appendChild(name);
      body.appendChild(meta);
      row.appendChild(body);
      li.appendChild(actions);
      li.appendChild(row);
      wireSwipe(li, row);
      list.appendChild(li);
    });
  }

  function wireSwipe(li, row) {
    var startX = 0, currentX = 0, dragging = false;
    function setX(x) {
      currentX = Math.max(-228, Math.min(0, x));
      row.style.transform = 'translateX(' + currentX + 'px)';
      li.classList.toggle('is-open', currentX < -48);
    }
    row.addEventListener('pointerdown', function (e) {
      startX = e.clientX - currentX;
      dragging = true;
      row.setPointerCapture(e.pointerId);
    });
    row.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var next = e.clientX - startX;
      if (next < 0) {
        e.preventDefault();
        setX(next);
      }
    });
    row.addEventListener('pointerup', function () {
      dragging = false;
      setX(currentX < -56 ? -228 : 0);
    });
    row.addEventListener('pointercancel', function () {
      dragging = false;
      setX(0);
    });
  }

  function render() {
    renderSummary();
    renderLog();
    renderExportOptions();
  }

  function renderExportOptions() {
    var select = document.getElementById('export-session-select');
    if (!select) return;
    loadSaved();
    var current = select.value || 'active';
    select.innerHTML = '';
    var active = document.createElement('option');
    active.value = 'active';
    active.textContent = 'Active session';
    select.appendChild(active);
    savedSessions.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label + ' (' + (s.scans || []).filter(function (row) { return !row.removed; }).length + ' scans)';
      select.appendChild(opt);
    });
    select.value = Array.prototype.some.call(select.options, function (o) { return o.value === current; }) ? current : 'active';
  }

  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCsv(sessionId) {
    var rows = groupedFrom(scansForExport(sessionId));
    var head = ['Product Name', 'PLU', 'Count', 'Store Code', 'Category'];
    var lines = [head.map(csvEscape).join(',')];
    rows.forEach(function (r) {
      lines.push([r.productName, r.plu, r.count, r.sheetName, r.category].map(csvEscape).join(','));
    });
    var blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var day = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'meatmaster-count-' + day + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  load();
  loadSaved();

  window.MMSession = {
    addScan: addScan,
    removeScan: removeScan,
    confirmNotDuplicate: confirmNotDuplicate,
    applyProductToCode: applyProductToCode,
    clear: clearSession,
    saveSession: snapshotSession,
    grouped: grouped,
    activeScans: activeScans,
    render: render,
    renderExportOptions: renderExportOptions,
    exportCsv: exportCsv
  };

  document.addEventListener('DOMContentLoaded', render);
})();
