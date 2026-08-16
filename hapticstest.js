/* MeatMaster — Haptics Test (QA tool)
   ==================================================================
   A place for Kyle to feel each haptic pattern on his real phone and
   tell us what actually fires. Every button calls MMHaptic.buzz inside
   a genuine tap — which is the ONLY context where the iOS best-effort
   switch trick has any chance of working, so this is also the most
   honest test of whether iOS haptics are possible at all here.

   Reminder (see haptics.js): navigator.vibrate is Android-only. On an
   iPhone the buttons will still respond, but you may feel nothing —
   that's the platform, not a bug.
   ================================================================== */
(function () {
  'use strict';

  var overlay, bodyEl;

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
    var back = el('button', 'prod-back', '‹');
    back.setAttribute('aria-label', 'Close');
    back.addEventListener('click', close);
    var titleEl = el('span', 'prod-title', 'Haptics Test');
    var closeB = el('button', 'prod-close', '×');
    closeB.setAttribute('aria-label', 'Close');
    closeB.addEventListener('click', close);

    bar.appendChild(back);
    bar.appendChild(titleEl);
    bar.appendChild(closeB);

    bodyEl = el('div', 'prod-body');
    overlay.appendChild(bar);
    overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);
  }

  function open() { ensure(); overlay.hidden = false; document.body.classList.add('prod-open'); render(); }
  function close() { if (overlay) overlay.hidden = true; document.body.classList.remove('prod-open'); }

  function render() {
    ensure();
    bodyEl.innerHTML = '';
    bodyEl.scrollTop = 0;

    var supported = !!(window.MMHaptic && window.MMHaptic.supported());

    var status = el('div', 'ht-status ' + (supported ? 'is-ok' : 'is-no'));
    status.textContent = supported
      ? 'Vibration API: supported on this device'
      : 'Vibration API: NOT supported here (iOS Safari/PWA — buzzing likely won’t work)';
    bodyEl.appendChild(status);

    bodyEl.appendChild(el('p', 'prod-note',
      'Tap each. On Android you should feel distinct patterns. The two that ' +
      'matter most are Mark down (two soft taps) and Pull (insistent).'));

    var kinds = [
      ['pull',     'Pull — shrink'],
      ['markdown', 'Mark down'],
      ['ok',       'OK / added'],
      ['tick',     'Tick (scan)'],
      ['error',    'Error']
    ];
    var grid = el('div', 'ht-grid');
    kinds.forEach(function (k) {
      var b = el('button', 'btn btn-block ht-btn', k[1]);
      b.addEventListener('click', function () {
        if (window.MMHaptic) MMHaptic.buzz(k[0]);
        b.classList.remove('is-pulsed'); void b.offsetWidth; b.classList.add('is-pulsed');
      });
      grid.appendChild(b);
    });
    bodyEl.appendChild(grid);

    bodyEl.appendChild(el('p', 'prod-note',
      'If the buttons respond but you feel nothing on iPhone, that’s the iOS ' +
      'limitation — web apps can’t reliably trigger haptics on iOS.'));
  }

  window.MMHapticsTest = { open: open, close: close };

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-test-haptics');
    if (b) b.addEventListener('click', open);
  });
})();
