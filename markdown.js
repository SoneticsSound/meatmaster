/* MeatMaster — Sell-By / Markdown screen
   ==================================================================
   Kyle's morning job: walk the case, read the "Sell By" date off each
   scale label (top-right, MM.DD.YY), and decide PULL vs MARK DOWN.

     sell-by < today   ->  PULL — SHRINK      RED,    flashes
     sell-by = today   ->  MARK DOWN          YELLOW, flashes
     sell-by > today   ->  OK                 GREEN
     no / bad date     ->  ENTER A DATE       blue

   This screen is a THIN UI over dates.js, which already owns the rule
   (and is tested 39/39). No date logic lives here — type a date, get a
   colour, add it to today's pull list. When OCR lands it feeds the same
   dates.js and this screen doesn't change.

   SELF-CONTAINED, like production.js / caselayout.js: it owns its own
   overlay and never touches scan / count / session state, so it cannot
   break a live inventory count.
   ================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'mm.markdown.v1';

  /* --- per-day storage, mirrors production.js (14-day rolling window) --- */
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function loadToday() { return loadAll()[todayKey()] || []; }
  function saveToday(list) {
    var all = loadAll();
    all[todayKey()] = list;
    var keys = Object.keys(all).sort().slice(-14);
    var trimmed = {};
    keys.forEach(function (k) { trimmed[k] = all[k]; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(trimmed)); } catch (e) {}
  }

  function el(tag, cls, text) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  /* Parse what Kyle types off the label. dates.js handles the full label
     forms (08/13/26, 08.13.26, 081326); here we ALSO accept a bare MM/DD
     and assume the current year, because standing at the case he'll often
     just punch the month and day. */
  function parseInput(text) {
    var D = window.MMDates;
    if (!D || !text) return null;
    var p = D.parseSellBy(text);
    if (p) return D.isRealDate(p) ? p : null;
    var m = String(text).match(/^\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*$/);
    if (m) {
      var day = { y: D.today().y, m: parseInt(m[1], 10), d: parseInt(m[2], 10) };
      return D.isRealDate(day) ? day : null;
    }
    return null;
  }

  function relDays(days) {
    if (days < 0) return Math.abs(days) + (Math.abs(days) === 1 ? ' day past' : ' days past');
    if (days === 0) return 'sell-by is today';
    return 'in ' + days + (days === 1 ? ' day' : ' days');
  }

  function retriggerFlash(node) {
    node.classList.remove('is-flashing');
    void node.offsetWidth;   // force reflow so the animation restarts
    node.classList.add('is-flashing');
  }

  /* --- overlay shell (same chrome classes as production.js) --- */
  var overlay, titleEl, bodyEl;

  function ensure() {
    if (overlay) return;
    overlay = el('div', 'prod-overlay');
    overlay.hidden = true;

    var bar = el('div', 'prod-bar');
    var back = el('button', 'prod-back', '‹');
    back.setAttribute('aria-label', 'Close');
    back.addEventListener('click', close);
    titleEl = el('span', 'prod-title', 'Sell-By / Markdown');
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
    var D = window.MMDates;
    bodyEl.innerHTML = '';
    bodyEl.scrollTop = 0;

    if (!D) {
      bodyEl.appendChild(el('p', 'prod-note', 'Date engine not loaded.'));
      return;
    }

    bodyEl.appendChild(el('p', 'prod-note',
      'Type the Sell By date from the label (top-right of the scale sticker). ' +
      'Red = pull/shrink · Yellow = mark down.'));
    bodyEl.appendChild(el('div', 'md-today', 'Today · ' + D.fmt(D.today())));

    var input = el('input', 'md-input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.placeholder = 'MM/DD/YY';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('enterkeyhint', 'done');
    var inputWrap = el('div', 'md-input-wrap');
    inputWrap.appendChild(input);
    bodyEl.appendChild(inputWrap);

    var verdict = el('div', 'md-verdict is-empty');
    bodyEl.appendChild(verdict);

    var nameInput = el('input', 'md-name');
    nameInput.type = 'text';
    nameInput.placeholder = 'Item name (optional)';
    nameInput.setAttribute('autocomplete', 'off');
    bodyEl.appendChild(nameInput);

    var add = el('button', 'btn btn-primary btn-block md-add', 'Add to pull list');
    add.disabled = true;
    bodyEl.appendChild(add);

    var listWrap = el('div', 'md-list-wrap');
    bodyEl.appendChild(listWrap);

    var current = null;

    function showVerdict() {
      var raw = input.value.trim();
      current = parseInput(raw);

      if (!raw) { verdict.className = 'md-verdict is-empty'; verdict.innerHTML = ''; add.disabled = true; return; }

      if (!current) {
        verdict.className = 'md-verdict is-unknown';
        verdict.style.removeProperty('--vc');
        verdict.innerHTML = '';
        verdict.appendChild(el('div', 'md-verdict-label', 'ENTER A DATE'));
        verdict.appendChild(el('div', 'md-verdict-why', 'Like 07/11/26 — the Sell By printed on the sticker.'));
        add.disabled = true;
        return;
      }

      var st = D.classify(current);
      var days = D.daysBetween(D.today(), current);
      verdict.className = 'md-verdict is-' + st.key;
      verdict.style.setProperty('--vc', st.color);
      verdict.innerHTML = '';
      verdict.appendChild(el('div', 'md-verdict-label', st.label));
      verdict.appendChild(el('div', 'md-verdict-days', D.fmt(current) + ' · ' + relDays(days)));
      verdict.appendChild(el('div', 'md-verdict-why', st.why));
      if (st.flash) {
        retriggerFlash(verdict);
        if (window.MMHaptic) MMHaptic.buzz(st.key);   // 'pull' or 'markdown'
      }
      add.disabled = false;
    }

    function renderList() {
      listWrap.innerHTML = '';
      var list = loadToday();

      var head = el('div', 'md-list-head');
      head.appendChild(el('span', null, 'Pull list · today'));
      if (list.length) {
        var clear = el('button', 'md-clear', 'Clear');
        clear.addEventListener('click', function () { saveToday([]); renderList(); });
        head.appendChild(clear);
      }
      listWrap.appendChild(head);

      if (!list.length) {
        listWrap.appendChild(el('p', 'md-empty',
          'Nothing added yet. Check a date above, then “Add to pull list.”'));
        return;
      }

      // Decorate with today's status and sort most-urgent first.
      var rows = list.map(function (e) { return { e: e, status: D.classify(e.sellBy), sellBy: e.sellBy }; });
      rows.sort(D.byUrgency);

      var ul = el('ul', 'md-list');
      rows.forEach(function (r) {
        var st = r.status;
        var li = el('li', 'md-row is-' + st.key);
        li.style.setProperty('--vc', st.color);

        var main = el('div', 'md-row-main');
        main.appendChild(el('div', 'md-row-date', D.fmt(r.sellBy)));
        if (r.e.name) main.appendChild(el('div', 'md-row-name', r.e.name));
        li.appendChild(main);

        li.appendChild(el('div', 'md-row-tag', st.label));

        var x = el('button', 'md-row-x', '×');
        x.setAttribute('aria-label', 'Remove');
        x.addEventListener('click', function () {
          saveToday(loadToday().filter(function (e) { return e.id !== r.e.id; }));
          renderList();
        });
        li.appendChild(x);
        ul.appendChild(li);
      });
      listWrap.appendChild(ul);
    }

    add.addEventListener('click', function () {
      if (!current) return;
      var list = loadToday();
      list.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: nameInput.value.trim(),
        sellBy: current,
        ts: Date.now()
      });
      saveToday(list);
      if (window.MMHaptic) MMHaptic.buzz('ok');
      input.value = ''; nameInput.value = ''; current = null;
      showVerdict();
      renderList();
      input.focus();
    });

    input.addEventListener('input', showVerdict);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !add.disabled) { e.preventDefault(); add.click(); }
    });

    renderList();
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
  }

  window.MMMarkdown = { open: open, close: close, todayList: loadToday };

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('btn-markdown');
    if (b) b.addEventListener('click', open);
  });
})();
