/* MeatMaster — app shell logic
   Plain vanilla JavaScript. No frameworks, no build step: what you see is what runs.
   Session 1 responsibilities: navigation, online/offline status, install hint,
   and registering the service worker that makes the app work with no signal. */

(function () {
  'use strict';

  /* ---------- screen navigation ---------- */
  const tabs = document.querySelectorAll('.tab');
  const screens = document.querySelectorAll('.screen');

  function goTo(name) {
    screens.forEach((s) => { s.hidden = (s.dataset.screen !== name); });
    tabs.forEach((t) => {
      const active = (t.dataset.goto === name);
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    // remember where the user was, so reopening the app returns there
    try { localStorage.setItem('mm.screen', name); } catch (e) {}
    window.scrollTo(0, 0);
  }

  tabs.forEach((t) => t.addEventListener('click', () => goTo(t.dataset.goto)));

  // restore last screen (default: scan)
  let start = 'scan';
  try { start = localStorage.getItem('mm.screen') || 'scan'; } catch (e) {}
  if (!document.querySelector('.screen[data-screen="' + start + '"]')) start = 'scan';
  goTo(start);

  /* ---------- online / offline indicator ---------- */
  const dot = document.getElementById('net-dot');
  const netText = document.getElementById('net-text');

  function refreshNet() {
    const online = navigator.onLine;
    dot.classList.toggle('is-offline', !online);
    netText.textContent = online ? 'Online' : 'Offline — still working';
  }
  window.addEventListener('online', refreshNet);
  window.addEventListener('offline', refreshNet);
  refreshNet();

  /* ---------- product list ---------- */
  var productList = document.getElementById('product-list');
  var productCount = document.getElementById('product-count');
  var productSearch = document.getElementById('product-search');
  function editProduct(p) {
    if (!p || !window.MMProducts) return;
    var next = window.prompt('Product name', p.name || '');
    if (!next) return;
    var category = window.prompt('Category', p.category || 'Unknown');
    window.MMProducts.save({
      plu: p.plu,
      upc: p.upc,
      name: next.trim(),
      sheetName: p.sheetName || 'Saved on phone',
      category: category && category.trim() ? category.trim() : (p.category || 'Unknown'),
      casePosition: p.casePosition || 9999
    });
    renderProducts();
    if (window.MMSession) window.MMSession.render();
  }
  function renderProducts() {
    if (!productList || !window.MMProducts) return;
    productList.innerHTML = '';
    var products = window.MMProducts.refresh ? window.MMProducts.refresh() : window.MMProducts.all.slice();
    var q = productSearch ? productSearch.value.trim().toLowerCase() : '';
    if (q) {
      products = products.filter(function (p) {
        return [p.name, p.plu, p.upc, p.sheetName, p.category].some(function (v) {
          return String(v || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }
    if (productCount) productCount.textContent = q ? (products.length + ' shown') : products.length;
    products.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'product-item';
      var plu = document.createElement('div');
      plu.className = 'product-plu';
      plu.textContent = p.plu;
      var body = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'product-name';
      name.textContent = p.name;
      if (p.isCustom) {
        var tag = document.createElement('span');
        tag.className = 'product-tag';
        tag.textContent = 'saved';
        name.appendChild(tag);
      }
      var meta = document.createElement('div');
      meta.className = 'product-meta';
      meta.textContent = [
        p.upc || (p.plu ? ('PLU ' + p.plu) : ''),
        p.category || 'Unknown',
        p.sheetName || ''
      ].filter(Boolean).join(' - ');
      body.appendChild(name);
      body.appendChild(meta);
      var edit = document.createElement('button');
      edit.className = 'btn product-edit';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function () { editProduct(p); });
      li.appendChild(plu);
      li.appendChild(body);
      li.appendChild(edit);
      productList.appendChild(li);
    });
  }
  renderProducts();
  if (productSearch) productSearch.addEventListener('input', renderProducts);
  window.MMRenderProducts = renderProducts;
  window.MMEditProduct = editProduct;
  window.MMEditProductByCode = function (code) {
    if (!window.MMProducts) return;
    var product = window.MMProducts.findByCode(code);
    if (!product) {
      // Unknown scan: open the editor on a new stub so the user can name it
      // (naming it saves it, so future scans of this code resolve).
      var plu = window.MMProducts.extractPlu ? window.MMProducts.extractPlu(code) : null;
      var digits = String(code || '').replace(/\D/g, '');
      product = plu ? { plu: plu } : { upc: digits };
    }
    editProduct(product);
  };

  /* ---------- count session actions ---------- */
  var exportBtn = document.getElementById('btn-export-csv');
  var clearBtn = document.getElementById('btn-clear-session');
  var saveSessionBtn = document.getElementById('btn-save-session');
  var copyCountsBtn = document.getElementById('btn-copy-counts');
  var removeDupesBtn = document.getElementById('btn-remove-dupes');
  var countDupesBtn = document.getElementById('btn-count-dupes');
  var periscopeBtn = document.getElementById('btn-periscope-report');
  var periscopeReport = document.getElementById('periscope-report');
  var exportSelect = document.getElementById('export-session-select');
  var sessionNote = document.getElementById('session-action-note');
  function setSessionNote(text, isError) {
    if (!sessionNote) return;
    sessionNote.textContent = text || '';
    sessionNote.classList.toggle('is-error', !!isError);
  }
  function ordinal(n) {
    var mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return n + 'th';
    var mod10 = n % 10;
    return n + (mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th');
  }
  function sessionLabelNow() {
    var d = new Date();
    var month = d.toLocaleString([], { month: 'long' });
    var time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return month + ' ' + ordinal(d.getDate()) + ', ' + d.getFullYear() + ' ' + time;
  }
  if (exportBtn) exportBtn.addEventListener('click', function () {
    if (window.MMSession) window.MMSession.exportCsv(exportSelect ? exportSelect.value : 'active');
  });
  if (periscopeBtn && periscopeReport) periscopeBtn.addEventListener('click', function () {
    var open = periscopeReport.hidden;
    periscopeReport.hidden = !open;
    periscopeBtn.textContent = open ? 'Hide Periscope Report' : 'Show Periscope Report';
    if (open && window.MMSession) {
      window.MMSession.render();
      periscopeReport.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  if (copyCountsBtn) copyCountsBtn.addEventListener('click', function () {
    if (!window.MMSession || !window.MMSession.countsText) return;
    var text = window.MMSession.countsText('active');
    if (!text) {
      setSessionNote('No counted scans to copy yet.', true);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setSessionNote('Counts copied.');
      }).catch(function () {
        window.prompt('Copy counts', text);
        setSessionNote('Counts ready to copy.');
      });
    } else {
      window.prompt('Copy counts', text);
      setSessionNote('Counts ready to copy.');
    }
  });
  if (removeDupesBtn) removeDupesBtn.addEventListener('click', function () {
    if (!window.MMSession || !window.MMSession.removeDuplicateScans) return;
    var removed = window.MMSession.removeDuplicateScans();
    setSessionNote(removed ? ('Removed ' + removed + ' duplicate scan' + (removed === 1 ? '.' : 's.')) : 'No duplicate scans to remove.', !removed);
  });
  if (countDupesBtn) countDupesBtn.addEventListener('click', function () {
    if (!window.MMSession || !window.MMSession.countDuplicateScansAsUnits) return;
    var counted = window.MMSession.countDuplicateScansAsUnits();
    if (window.MMScanner && window.MMScanner.markDuplicatesCounted) window.MMScanner.markDuplicatesCounted();
    setSessionNote(counted ? ('Counted ' + counted + ' duplicate scan' + (counted === 1 ? ' as a unit.' : 's as units.')) : 'No duplicate scans to count as units.', !counted);
  });
  if (saveSessionBtn) saveSessionBtn.addEventListener('click', function () {
    if (!window.MMSession) return;
    var saved = window.MMSession.saveSession(sessionLabelNow());
    if (!saved) {
      setSessionNote('No scans to save yet.', true);
      return;
    }
    var counted = saved.scans.filter(function (s) { return !s.removed && !s.duplicate; }).length;
    setSessionNote('Saved "' + saved.label + '" with ' + counted + ' counted scans.');
  });
  if (clearBtn) clearBtn.addEventListener('click', function () {
    if (!window.MMSession) return;
    if (window.confirm('Clear the current count session?')) {
      window.MMSession.clear();
      setSessionNote('Active session cleared.');
    }
  });
  if (window.MMSession) window.MMSession.render();

  /* ---------- iOS "Add to Home Screen" hint ---------- */
  // Show only in mobile Safari, only when not already installed, only once dismissed.
  const iosBox = document.getElementById('ios-install');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  let dismissed = false;
  try { dismissed = localStorage.getItem('mm.iosHintDismissed') === '1'; } catch (e) {}

  if (isIOS && !isStandalone && !dismissed) {
    iosBox.hidden = false;
    iosBox.querySelector('.ios-close').addEventListener('click', () => {
      iosBox.hidden = true;
      try { localStorage.setItem('mm.iosHintDismissed', '1'); } catch (e) {}
    });
  }

  /* ---------- register the offline service worker + auto-update ----------
     Without this, an installed iOS app can stay stuck on an old version.
     - updateViaCache:'none' → always re-fetch the worker script (don't trust
       the browser's HTTP cache), so a new version is actually noticed.
     - reg.update() on load → check for a newer version every time it opens.
     - controllerchange → when the new version takes over, reload once so the
       user is always on the latest (guarded so the first install doesn't loop). */
  if ('serviceWorker' in navigator) {
    // Only auto-reload on a *later* takeover, not the very first install.
    var hadController = !!navigator.serviceWorker.controller;
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' })
        .then(function (reg) {
          console.log('[MeatMaster] offline ready', reg.scope);
          reg.update();                                  // check now
          setInterval(function () { reg.update(); }, 60 * 60 * 1000); // and hourly
        })
        .catch(function (err) { console.warn('[MeatMaster] service worker failed', err); });
    });
  }
})();
