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

  /* ---------- register the offline service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then((reg) => console.log('[MeatMaster] offline ready', reg.scope))
        .catch((err) => console.warn('[MeatMaster] service worker failed', err));
    });
  }
})();
