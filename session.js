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

  function protectNoPricePlu(product) {
    if (!product || !product.plu) return false;
    var cat = String(product.category || '').toLowerCase();
    return cat === 'beef' || cat === 'ready-made';
  }

  function recentDuplicate(code, price, product) {
    // Fixed-UPC / no-price items are unit-count items: two identical barcodes
    // usually mean two physical units. Beef/Ready-Made PLU codes without price
    // are likely checklist/reference barcodes, so keep duplicate protection.
    if (!price && !protectNoPricePlu(product)) return false;
    var c = codeText(code);
    if (!c) return false;
    // Priced, variable-weight labels (weighed meat / ready-made meals): each
    // package is weighed individually, so its price — embedded in the barcode —
    // makes the full code a fingerprint for that one physical package. If we've
    // already recorded this exact code this session, a repeat is almost certainly
    // an accidental re-scan of the same package, so flag it for the WHOLE count,
    // not just a brief window. Genuinely different packages weigh differently, so
    // their prices (and codes) differ and still count separately. On the rare
    // exact-weight collision, the flagged scan can still be kept via Count Unit.
    if (price) {
      return state.scans.some(function (s) {
        return !s.removed && s.code === c;
      });
    }
    // No-price Beef/Ready-Made PLU codes (reference/checklist barcodes): keep the
    // short same-code window that only guards against a rapid repeat read.
    var now = Date.now();
    return state.scans.some(function (s) {
      if (s.removed || s.code !== c) return false;
      var t = Date.parse(s.at || '');
      return t && (now - t) < 2 * 1000;
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
      casePosition: product && product.casePosition ? product.casePosition : 9999,
      price: payload.price || '',
      duplicate: recentDuplicate(code, payload.price, product),
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

  function removeDuplicateScans() {
    load();
    var removed = 0;
    state.scans = state.scans.map(function (s) {
      if (s.removed || !s.duplicate) return s;
      var copy = {};
      Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
      copy.removed = true;
      copy.removedAt = new Date().toISOString();
      copy.removedReason = 'duplicate sweep';
      removed++;
      return copy;
    });
    if (removed) save();
    render();
    return removed;
  }

  function countDuplicateScansAsUnits() {
    load();
    var counted = 0;
    state.scans = state.scans.map(function (s) {
      if (s.removed || !s.duplicate) return s;
      var copy = {};
      Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
      copy.duplicate = false;
      copy.confirmedAt = new Date().toISOString();
      copy.confirmedReason = 'count duplicate as unit';
      counted++;
      return copy;
    });
    if (counted) save();
    render();
    return counted;
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
      copy.casePosition = product && product.casePosition ? product.casePosition : copy.casePosition;
      return copy;
    });
    save();
    render();
  }

  function activeScans() {
    load();
    return state.scans.filter(function (s) { return !s.removed; });
  }

  function countableScansFrom(scans) {
    return scans.filter(function (s) { return !s.removed && !s.duplicate; });
  }

  function countableScans() {
    return countableScansFrom(activeScans());
  }

  function scansForExport(sessionId) {
    load();
    loadSaved();
    if (!sessionId || sessionId === 'active') return countableScans();
    var found = savedSessions.find(function (s) { return s.id === sessionId; });
    return found ? countableScansFrom(found.scans || []) : [];
  }

  function groupedFrom(scans) {
    var groups = {};
    scans.forEach(function (s) {
      var key = s.productKey || ('code:' + s.code);
      var product = window.MMProducts && window.MMProducts.findByCode ? window.MMProducts.findByCode(s.code) : null;
      var casePosition = s.casePosition || (product && product.casePosition) || 9999;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          productName: s.productName,
          plu: s.plu,
          sheetName: s.sheetName,
          category: s.category,
          casePosition: casePosition,
          count: 0
        };
      }
      if (casePosition < (groups[key].casePosition || 9999)) groups[key].casePosition = casePosition;
      groups[key].count++;
    });
    return Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) {
      var ap = Number(a.casePosition || 9999);
      var bp = Number(b.casePosition || 9999);
      if (ap !== bp) return ap - bp;
      return String(a.productName).localeCompare(String(b.productName));
    });
  }

  function grouped() {
    return groupedFrom(countableScans());
  }

  function renderSummary() {
    var list = document.getElementById('session-count-list');
    var reportList = document.getElementById('periscope-report-list');
    var reportWarning = document.getElementById('periscope-warning');
    var total = document.getElementById('session-total');
    var unique = document.getElementById('session-unique');
    var dupes = document.getElementById('session-dupes');
    if (!list) return;
    var groups = grouped();
    var scans = countableScans();
    var duplicateCount = activeScans().filter(function (s) { return s.duplicate; }).length;
    if (total) total.textContent = scans.length;
    if (unique) unique.textContent = groups.length;
    if (dupes) dupes.textContent = duplicateCount;
    if (reportWarning) {
      reportWarning.hidden = duplicateCount === 0;
      reportWarning.textContent = duplicateCount ? (duplicateCount + ' duplicate scan' + (duplicateCount === 1 ? '' : 's') + ' need review before this report is final.') : '';
    }
    // Counts section: only what was actually scanned.
    list.innerHTML = '';
    if (!groups.length) {
      var empty = document.createElement('li');
      empty.className = 'session-empty';
      empty.textContent = 'No counted scans yet.';
      list.appendChild(empty);
    } else {
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

    // Periscope Report: the FULL checklist, every item shown (0 included, since
    // 0s inform production), in checklist/case order.
    renderPeriscopeChecklist(groups);
  }

  function periscopeRow(name, sheetName, plu, category, count) {
    var row = document.createElement('li');
    row.className = 'periscope-item' + (count === 0 ? ' is-zero' : '');
    var info = document.createElement('div');
    var nm = document.createElement('div');
    nm.className = 'periscope-name';
    nm.textContent = name;
    var code = document.createElement('div');
    code.className = 'periscope-code';
    code.textContent = sheetName || 'No checklist name saved yet';
    var meta = document.createElement('div');
    meta.className = 'periscope-meta';
    meta.textContent = [plu ? ('PLU ' + plu) : '', category || ''].filter(Boolean).join(' - ');
    info.appendChild(nm);
    info.appendChild(code);
    info.appendChild(meta);
    var cnt = document.createElement('div');
    cnt.className = 'periscope-count';
    cnt.textContent = count;
    row.appendChild(info);
    row.appendChild(cnt);
    return row;
  }

  function isMeatDeptChecklistProduct(product) {
    if (!product || !product.plu) return false;
    var cat = String(product && product.category || '').toLowerCase();
    return cat === 'beef' || cat === 'ready-made';
  }

  function renderPeriscopeChecklist(groups) {
    var reportList = document.getElementById('periscope-report-list');
    if (!reportList) return;
    reportList.innerHTML = '';
    // scanned counts keyed by PLU. The Periscope Report is the meat-dept
    // checklist only; saved grocery/produce/snack products stay in Counts/Log.
    var countByPlu = {};
    groups.forEach(function (g) {
      var plu = g.plu ? String(g.plu).replace(/^0+/, '') : '';
      if (plu) countByPlu[plu] = (countByPlu[plu] || 0) + g.count;
    });
    // every known checklist product, in case order (MMProducts.all is sorted by casePosition)
    var checklist = (window.MMProducts && window.MMProducts.all) ?
      window.MMProducts.all.filter(isMeatDeptChecklistProduct) : [];
    checklist.forEach(function (p) {
      var plu = p.plu ? String(p.plu).replace(/^0+/, '') : '';
      var count = plu ? (countByPlu[plu] || 0) : 0;
      reportList.appendChild(periscopeRow(p.name, p.sheetName, p.plu, p.category, count));
    });
    if (!checklist.length) {
      var empty = document.createElement('li');
      empty.className = 'session-empty';
      empty.textContent = 'No meat-dept checklist loaded yet.';
      reportList.appendChild(empty);
    }
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
        keep.textContent = 'Count Unit';
        keep.addEventListener('click', function () {
          confirmNotDuplicate(s.id);
          if (window.MMScanner && window.MMScanner.markRecentCounted) window.MMScanner.markRecentCounted(s.id);
        });
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
      remove.addEventListener('click', function () {
        removeScan(s.id);
        if (window.MMScanner && window.MMScanner.forgetRecent) window.MMScanner.forgetRecent(s.id);
      });
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
        confirmed.textContent = 'Counted Unit';
        name.appendChild(confirmed);
      }
      var sheet = document.createElement('div');
      sheet.className = 'scan-row-sheet';
      sheet.textContent = s.sheetName || (product && product.sheetName) || '—';
      var meta = document.createElement('div');
      meta.className = 'scan-row-meta';
      var t = new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      meta.textContent = s.code + ' · ' + t;
      body.appendChild(name);
      body.appendChild(sheet);
      body.appendChild(meta);
      row.appendChild(body);
      li.appendChild(actions);
      li.appendChild(row);
      wireSwipe(li, row);
      list.appendChild(li);
    });
  }

  function wireSwipe(li, row) {
    var startX = 0, startY = 0, startOffsetX = 0, currentX = 0, dragging = false, swiping = false;
    function setX(x) {
      currentX = Math.max(-228, Math.min(0, x));
      row.style.transform = 'translateX(' + currentX + 'px)';
      li.classList.toggle('is-open', currentX < -48);
    }
    row.addEventListener('pointerdown', function (e) {
      startX = e.clientX;
      startY = e.clientY;
      startOffsetX = currentX;
      dragging = true;
      swiping = false;
    });
    row.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!swiping) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          dragging = false;
          return;
        }
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        swiping = true;
        row.setPointerCapture(e.pointerId);
      }
      var next = startOffsetX + dx;
      if (next < 0 || startOffsetX < 0) {
        e.preventDefault();
        setX(next);
      }
    });
    row.addEventListener('pointerup', function () {
      if (!swiping) {
        dragging = false;
        return;
      }
      dragging = false;
      swiping = false;
      setX(currentX < -56 ? -228 : 0);
    });
    row.addEventListener('pointercancel', function () {
      dragging = false;
      swiping = false;
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
    active.textContent = 'Active session (' + countableScans().length + ' counted)';
    select.appendChild(active);
    savedSessions.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label + ' (' + countableScansFrom(s.scans || []).length + ' counted)';
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

  function countsText(sessionId) {
    var rows = groupedFrom(scansForExport(sessionId || 'active'));
    return rows.map(function (r) {
      return r.count + ' x ' + r.productName +
        (r.plu ? (' | PLU ' + r.plu) : '') +
        (r.category ? (' | ' + r.category) : '');
    }).join('\n');
  }

  load();
  loadSaved();

  window.MMSession = {
    addScan: addScan,
    removeScan: removeScan,
    removeDuplicateScans: removeDuplicateScans,
    countDuplicateScansAsUnits: countDuplicateScansAsUnits,
    confirmNotDuplicate: confirmNotDuplicate,
    applyProductToCode: applyProductToCode,
    clear: clearSession,
    saveSession: snapshotSession,
    grouped: grouped,
    activeScans: activeScans,
    countableScans: countableScans,
    render: render,
    renderExportOptions: renderExportOptions,
    countsText: countsText,
    exportCsv: exportCsv
  };

  document.addEventListener('DOMContentLoaded', render);
})();
