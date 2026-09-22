/* MeatMaster — Periscope Card Mode
   One card per checklist item: the item's EAN-13 barcode (the same "020"+PLU+
   "00000"+check the paper sheet prints) drawn crisp on white, plus the recorded
   count. Swipe through, scan each off the phone screen into Periscope, key the
   count — no paper. A size stepper lets Kyle tune the on-screen barcode size to
   whatever his scanner likes best (scanners read bar RATIOS, tolerant over a
   wide size range; this just finds the sweet spot for his gun + phone).

   Self-contained: reads MMSession.periscopeRows() + MMBarcode + MMCutWords.
   Touches no scan/count state. */
(function () {
  function el(id) { return document.getElementById(id); }
  var overlay, stageEl, posEl, prevBtn, nextBtn, sizeEl;
  var rows = [], idx = 0;
  var SIZES = [2, 3, 4, 5, 6];      // module width in px
  var sizeIdx = 1;                   // default 3px/module (~55mm on a phone)

  try {
    var saved = localStorage.getItem('mm.pcards.size');
    if (saved !== null) { var n = SIZES.indexOf(+saved); if (n >= 0) sizeIdx = n; }
  } catch (e) {}

  function load() {
    rows = (window.MMSession && window.MMSession.periscopeRows) ? window.MMSession.periscopeRows() : [];
    if (idx >= rows.length) idx = 0;
  }

  function renderStage() {
    if (!stageEl) return;
    stageEl.innerHTML = '';
    if (!rows.length) {
      var empty = document.createElement('div');
      empty.className = 'pc-empty';
      empty.textContent = 'No checklist items yet. Scan some packages first.';
      stageEl.appendChild(empty);
      if (posEl) posEl.textContent = '0 / 0';
      return;
    }
    var r = rows[idx];
    var card = document.createElement('div');
    card.className = 'pc-card';

    // header: red PLU + highlighted name
    var head = document.createElement('div');
    head.className = 'pc-head';
    var plu = document.createElement('div');
    plu.className = 'pc-plu';
    plu.textContent = r.plu ? ('PLU ' + r.plu) : '—';
    var name = document.createElement('div');
    name.className = 'pc-name';
    if (window.MMCutWords) name.innerHTML = window.MMCutWords.markup(r.name || '');
    else name.textContent = r.name || '';
    head.appendChild(plu); head.appendChild(name);

    // recorded count — this is what you key into Periscope. Kept at the TOP with
    // the item info, because when you hold the phone to the gun your hand/scanner
    // blocks the BOTTOM of the screen; the barcode goes there instead.
    var countWrap = document.createElement('div');
    countWrap.className = 'pc-count';
    var cl = document.createElement('span');
    cl.className = 'pc-count-label';
    cl.textContent = 'Counted';
    var cv = document.createElement('span');
    cv.className = 'pc-count-val';
    cv.textContent = r.count;
    countWrap.appendChild(cl); countWrap.appendChild(cv);

    // white scan panel: the barcode — at the BOTTOM, toward the gun
    var panel = document.createElement('div');
    panel.className = 'pc-scanpanel';
    var mw = SIZES[sizeIdx];
    if (window.MMBarcode && r.plu) {
      var code = window.MMBarcode.codeForPlu(r.plu);
      if (code) panel.innerHTML = window.MMBarcode.ean13SVG(code, { moduleWidth: mw, height: 200 });
      else panel.textContent = 'No barcode for PLU ' + r.plu;
    } else {
      panel.textContent = 'No PLU — nothing to scan';
    }

    // order: item info + count at top, barcode below
    card.appendChild(head);
    card.appendChild(countWrap);
    card.appendChild(panel);

    stageEl.appendChild(card);
    if (posEl) posEl.textContent = (idx + 1) + ' / ' + rows.length;
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === rows.length - 1;
    if (sizeEl) sizeEl.textContent = mw + 'px';
  }

  function go(d) {
    if (!rows.length) return;
    idx = Math.max(0, Math.min(rows.length - 1, idx + d));
    renderStage();
  }
  function setSize(d) {
    sizeIdx = Math.max(0, Math.min(SIZES.length - 1, sizeIdx + d));
    try { localStorage.setItem('mm.pcards.size', SIZES[sizeIdx]); } catch (e) {}
    renderStage();
  }
  // Failsafe: jump to the module width that renders closest to the printed
  // sheet's own barcode size (~nominal EAN-13), in case a bigger one won't read.
  function resetToPaper() {
    var n = SIZES.indexOf(2);
    sizeIdx = n >= 0 ? n : 0;
    try { localStorage.setItem('mm.pcards.size', SIZES[sizeIdx]); } catch (e) {}
    renderStage();
  }

  function open() {
    if (!overlay) return;
    load();
    idx = 0;
    overlay.hidden = false;
    renderStage();
  }
  function close() { if (overlay) overlay.hidden = true; }

  function wire() {
    overlay = el('pc-overlay');
    stageEl = el('pc-stage');
    posEl = el('pc-pos');
    prevBtn = el('pc-prev');
    nextBtn = el('pc-next');
    sizeEl = el('pc-size');
    var openBtn = el('btn-periscope-cards');
    var closeBtn = el('pc-close');
    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });
    var sMinus = el('pc-size-minus'), sPlus = el('pc-size-plus'), sPaper = el('pc-size-paper');
    if (sMinus) sMinus.addEventListener('click', function () { setSize(-1); });
    if (sPlus) sPlus.addEventListener('click', function () { setSize(1); });
    if (sPaper) sPaper.addEventListener('click', resetToPaper);

    // swipe to flip cards
    if (stageEl) {
      var x0 = null;
      stageEl.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      stageEl.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (dx < -45) go(1); else if (dx > 45) go(-1);
        x0 = null;
      }, { passive: true });
    }
    document.addEventListener('keydown', function (e) {
      if (!overlay || overlay.hidden) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else { wire(); }

  window.MMPeriscopeCards = { open: open };
})();
