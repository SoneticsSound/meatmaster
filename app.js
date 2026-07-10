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
  function renderProducts() {
    if (!productList || !window.MMProducts) return;
    productList.innerHTML = '';
    var products = window.MMProducts.refresh ? window.MMProducts.refresh() : window.MMProducts.all.slice();
    if (productCount) productCount.textContent = products.length;
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
      meta.textContent = p.upc + ' - ' + p.sheetName;
      body.appendChild(name);
      body.appendChild(meta);
      var edit = document.createElement('button');
      edit.className = 'btn product-edit';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function () {
        var next = window.prompt('Product name', p.name || '');
        if (!next) return;
        window.MMProducts.save({
          plu: p.plu,
          upc: p.upc,
          name: next.trim(),
          sheetName: p.sheetName || 'Saved on phone',
          category: p.category || 'Unknown',
          casePosition: p.casePosition || 9999
        });
        renderProducts();
      });
      li.appendChild(plu);
      li.appendChild(body);
      li.appendChild(edit);
      productList.appendChild(li);
    });
  }
  renderProducts();
  window.MMRenderProducts = renderProducts;

  /* ---------- count session actions ---------- */
  var exportBtn = document.getElementById('btn-export-csv');
  var clearBtn = document.getElementById('btn-clear-session');
  var saveSessionBtn = document.getElementById('btn-save-session');
  var exportSelect = document.getElementById('export-session-select');
  if (exportBtn) exportBtn.addEventListener('click', function () {
    if (window.MMSession) window.MMSession.exportCsv(exportSelect ? exportSelect.value : 'active');
  });
  if (saveSessionBtn) saveSessionBtn.addEventListener('click', function () {
    if (!window.MMSession) return;
    var label = window.prompt('Session name', 'Meat count ' + new Date().toLocaleDateString());
    if (label === null) return;
    var saved = window.MMSession.saveSession(label.trim());
    if (!saved) window.alert('No scans to save yet.');
  });
  if (clearBtn) clearBtn.addEventListener('click', function () {
    if (!window.MMSession) return;
    if (window.confirm('Clear the current count session?')) window.MMSession.clear();
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
