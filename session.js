/* MeatMaster - persistent count session (Session 4)
   Confirmed scans become evidence rows. Counts are derived from those rows so
   mistaken scans can be removed without corrupting totals. */

(function () {
  'use strict';

  var STORE_KEY = 'mm.countSession.v1';
  var state = { startedAt: null, scans: [] };

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

  function clearSession() {
    state = { startedAt: new Date().toISOString(), scans: [] };
    save();
    render();
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

  function grouped() {
    var groups = {};
    activeScans().forEach(function (s) {
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
      li.className = 'scan-row' + (s.duplicate ? ' is-duplicate' : '');
      var body = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'scan-row-name';
      name.textContent = s.productName;
      var meta = document.createElement('div');
      meta.className = 'scan-row-meta';
      var t = new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      meta.textContent = t + ' - ' + s.code + (s.duplicate ? ' - possible duplicate' : '');
      body.appendChild(name);
      body.appendChild(meta);
      var remove = document.createElement('button');
      remove.className = 'btn scan-remove';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function () { removeScan(s.id); });
      li.appendChild(body);
      li.appendChild(remove);
      list.appendChild(li);
    });
  }

  function render() {
    renderSummary();
    renderLog();
  }

  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function exportCsv() {
    var rows = grouped();
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

  window.MMSession = {
    addScan: addScan,
    removeScan: removeScan,
    applyProductToCode: applyProductToCode,
    clear: clearSession,
    grouped: grouped,
    activeScans: activeScans,
    render: render,
    exportCsv: exportCsv
  };

  document.addEventListener('DOMContentLoaded', render);
})();
