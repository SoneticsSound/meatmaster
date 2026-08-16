/* MeatMaster — Haptics
   ==================================================================
   One place for "buzz the phone," so every feature feels the same and
   there is a single thing to fix when it misbehaves.

   HARD TRUTH ABOUT iOS (read before "the haptics are broken again"):
   `navigator.vibrate` is the only real web haptic API and it is
   ANDROID-ONLY. iOS Safari and installed iOS PWAs do NOT implement it —
   the call returns without error and nothing happens. That is almost
   certainly why earlier haptics "didn't land" on the iPhone: the code
   was correct, the platform just ignores it.

   There is no officially supported web haptic on iOS. As a BEST-EFFORT
   we also toggle a hidden <input type="checkbox" switch>, which on
   iOS 17.4+ can emit a small system haptic when flipped inside a real
   user gesture. It is unofficial, may do nothing, and Apple can remove
   it. So: reliable on Android, best-effort on iOS, always safe to call.

   buzz() is intentionally fire-and-forget and fully guarded — it can be
   called from anywhere, including the scan path, without any risk to a
   live count.
   ================================================================== */
(function (root) {
  'use strict';

  // Patterns are in milliseconds: [buzz, pause, buzz, ...]. They are
  // meant to be *felt as meaning*, not just noise:
  //   pull      — insistent, "get this off the case"
  //   markdown  — two soft taps, "mark it down"
  //   ok / tick — a single light confirmation
  var PATTERNS = {
    tick:     [20],
    ok:       [30],
    markdown: [45, 60, 45],
    pull:     [70, 45, 70, 45, 130],
    error:    [90, 50, 90]
  };

  var iosSwitch = null;
  function ensureIosSwitch() {
    if (iosSwitch) return iosSwitch;
    try {
      var s = document.createElement('input');
      s.type = 'checkbox';
      s.setAttribute('switch', '');          // iOS 17.4+ haptic switch control
      s.setAttribute('aria-hidden', 'true');
      s.tabIndex = -1;
      s.style.cssText =
        'position:fixed;left:-9999px;top:0;width:0;height:0;opacity:0;pointer-events:none;';
      (document.body || document.documentElement).appendChild(s);
      iosSwitch = s;
    } catch (e) { iosSwitch = null; }
    return iosSwitch;
  }

  function supported() {
    return !!(typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
  }

  /* buzz(kind) — kind is a key in PATTERNS (defaults to 'tick').
     Returns true if the Android Vibration API accepted the pattern. The
     iOS best-effort runs regardless and never throws. */
  function buzz(kind) {
    var pattern = PATTERNS[kind] || PATTERNS.tick;
    var fired = false;
    if (supported()) {
      try { fired = navigator.vibrate(pattern) === true; } catch (e) {}
    }
    // iOS best-effort — only meaningful when called inside a user gesture.
    var s = ensureIosSwitch();
    if (s) { try { s.click(); } catch (e) {} }
    return fired;
  }

  root.MMHaptic = { buzz: buzz, supported: supported, PATTERNS: PATTERNS };
})(typeof self !== 'undefined' ? self : this);
