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

   We tested the iOS 17.4+ <input switch> haptic trick on Kyle's iPhone
   (2026-08-15): it does NOT fire. So there is no working web haptic on
   his device, and this helper is a guarded no-op there. It still buzzes
   on Android, and every call is safe from anywhere (including the scan
   path) — so the buzz() calls scattered through the app do no harm and
   light up for free if the app ever runs on Android.
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

  function supported() {
    return !!(typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
  }

  /* buzz(kind) — kind is a key in PATTERNS (defaults to 'tick').
     Returns true if the Vibration API (Android) accepted the pattern;
     a harmless no-op on iOS. */
  function buzz(kind) {
    var pattern = PATTERNS[kind] || PATTERNS.tick;
    if (supported()) {
      try { return navigator.vibrate(pattern) === true; } catch (e) {}
    }
    return false;
  }

  root.MMHaptic = { buzz: buzz, supported: supported, PATTERNS: PATTERNS };
})(typeof self !== 'undefined' ? self : this);
