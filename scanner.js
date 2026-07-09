/* MeatMaster — camera barcode scanner (Session 2)
   Reads UPC/EAN barcodes live from the camera.

   Design note: we drive the camera ourselves (getUserMedia) and feed frames
   into ZXing's *core* decoder (canvas -> luminance -> binarizer -> decode).
   ZXing's own camera/image helpers proved unreliable in testing; the core
   decoder is rock-solid. This keeps us on the part that works and is testable.

   Flow: tap Start -> camera opens -> a barcode is read -> confirm card ->
   Confirm (records it) or Rescan. Camera stops when you leave the Scan tab. */

(function () {
  'use strict';

  var el = function (id) { return document.getElementById(id); };

  var scanner   = el('scanner');
  var video     = el('cam');
  var idle      = el('cam-idle');
  var errBox    = el('cam-error');
  var errMsg    = el('cam-error-msg');
  var card      = el('result-card');
  var resFmt    = el('result-fmt');
  var resCode   = el('result-code');
  var controls  = el('scan-controls');
  var recentBox = el('recent');
  var recentList= el('recent-list');
  var recentNum = el('recent-count');
  var scanSub   = el('scan-sub');

  var running = false;   // camera on + decode loop active
  var paused = false;    // a result is showing; ignore new reads
  var stream = null;     // MediaStream (so we can turn the camera off)
  var scanTimer = null;  // decode-loop timer
  var canvas = null, ctx = null;
  var lastCode = null, lastTime = 0;
  var recent = [];       // this-session scans (in memory)

  function show(node, on) { if (node) node.hidden = !on; }

  /* ---------- the decode engine (core ZXing, the part we verified) ----------
     Two hard-won lessons baked in here:
     1. This ZXing build FAILS when several barcode formats are enabled at once
        (each works alone), so we try formats one at a time.
     2. EAN-13 also reads UPC-A codes (UPC-A is EAN-13 with a leading zero),
        and Sprouts' store barcodes are EAN-13 — so it's first and covers most.
     For each format we try two binarizers: GlobalHistogram (crisp barcodes,
     fast) then Hybrid (uneven lighting, e.g. a dim cooler). */
  var _reader = null;
  var _formats = null;
  function formatList() {
    if (_formats) return _formats;
    var F = window.ZXing.BarcodeFormat;
    _formats = [F.EAN_13, F.UPC_E, F.EAN_8];
    return _formats;
  }
  // Decode one still image (a canvas). Returns a ZXing Result or null.
  function decodeCanvas(cnv) {
    var Z = window.ZXing;
    if (!_reader) _reader = new Z.MultiFormatReader();
    // one luminance read per frame, shared across all attempts
    var source = new Z.HTMLCanvasElementLuminanceSource(cnv);
    var binGlobal = new Z.BinaryBitmap(new Z.GlobalHistogramBinarizer(source));
    var binHybrid = new Z.BinaryBitmap(new Z.HybridBinarizer(source));
    var fmts = formatList();
    for (var i = 0; i < fmts.length; i++) {
      var h = new Map();
      h.set(Z.DecodeHintType.POSSIBLE_FORMATS, [fmts[i]]);
      try { return _reader.decode(binGlobal, h); } catch (e1) {}
      try { return _reader.decode(binHybrid, h); } catch (e2) {}
    }
    return null;
  }

  function formatName(fmt) {
    try {
      var F = window.ZXing.BarcodeFormat;
      for (var k in F) { if (F[k] === fmt) return k.replace(/_/g, '-'); }
    } catch (e) {}
    return 'BARCODE';
  }

  /* ---------- feedback ---------- */
  function feedback() {
    try {
      var ac = feedback._ac || (feedback._ac =
        new (window.AudioContext || window.webkitAudioContext)());
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.06;
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.08);
    } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
  }

  function friendlyError(err) {
    var name = (err && err.name) || '';
    if (!window.isSecureContext) {
      return 'The camera only works over a secure connection. On this computer ' +
             'use http://localhost. On the phone we’ll host it over https.';
    }
    if (name === 'NotAllowedError')  return 'Camera permission was blocked. Allow camera access for this site, then try again.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
    if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
    return 'Could not start the camera. ' + ((err && err.message) || '');
  }

  /* ---------- camera + decode loop ---------- */
  function start() {
    if (!window.ZXing) {
      errMsg.textContent = 'Scanner engine failed to load. Reopen the app.';
      show(idle, false); show(errBox, true);
      return;
    }
    show(idle, false); show(errBox, false); show(card, false);
    paused = false;

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } }
    }).then(function (s) {
      stream = s;
      video.srcObject = s;
      return video.play();
    }).then(function () {
      running = true;
      scanner.classList.add('is-live');
      show(controls, true);
      scanSub.textContent = 'Camera on · line up a barcode';
      loop();
    }).catch(function (e) {
      errMsg.textContent = friendlyError(e);
      show(errBox, true); show(controls, false);
      scanner.classList.remove('is-live');
    });
  }

  function loop() {
    if (!running) return;
    try {
      if (!paused && video.readyState >= 2 && video.videoWidth) {
        canvas = canvas || document.createElement('canvas');
        ctx = ctx || canvas.getContext('2d', { willReadFrequently: true });
        // cap width for speed; keeps decode fast on a phone
        var vw = video.videoWidth, vh = video.videoHeight;
        var scale = Math.min(1, 900 / vw);
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var res = decodeCanvas(canvas);
        if (res) onDecode(res);
      }
    } catch (e) { /* keep the loop alive no matter what */ }
    scanTimer = setTimeout(loop, 120); // ~8 checks per second
  }

  function onDecode(result) {
    var code = result.getText();
    var now = Date.now();
    if (code === lastCode && (now - lastTime) < 2500) return; // debounce repeats
    lastCode = code; lastTime = now;

    paused = true;
    feedback();
    resCode.textContent = code;
    resFmt.textContent = formatName(result.getBarcodeFormat());
    show(card, true);
  }

  function confirmScan() {
    recent.unshift({ code: resCode.textContent, fmt: resFmt.textContent, at: new Date() });
    renderRecent();
    show(card, false);
    paused = false;
  }

  function rescan() { show(card, false); paused = false; }

  function renderRecent() {
    recentNum.textContent = recent.length;
    show(recentBox, recent.length > 0);
    recentList.innerHTML = '';
    recent.slice(0, 40).forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'recent-item';
      var t = r.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var code = document.createElement('span');
      code.className = 'ri-code'; code.textContent = r.code;
      var meta = document.createElement('span');
      meta.className = 'ri-meta'; meta.textContent = r.fmt + ' · ' + t;
      li.appendChild(code); li.appendChild(meta);
      recentList.appendChild(li);
    });
  }

  function stop() {
    running = false; paused = false;
    if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    try { video.srcObject = null; } catch (e) {}
    scanner.classList.remove('is-live');
    show(controls, false); show(card, false); show(errBox, false);
    show(idle, true);
    scanSub.textContent = 'Walk the case · scan each package';
  }

  /* ---------- wiring ---------- */
  el('btn-start').addEventListener('click', start);
  el('btn-retry').addEventListener('click', start);
  el('btn-stop').addEventListener('click', stop);
  el('btn-confirm').addEventListener('click', confirmScan);
  el('btn-rescan').addEventListener('click', rescan);

  // turn the camera off when navigating away from the Scan tab
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.goto !== 'scan' && running) stop();
    });
  });

  // exposed for testing the exact shipping decode path without a physical camera
  window.MMScanner = {
    start: start,
    stop: stop,
    getRecent: function () { return recent.slice(); },
    decodeCanvas: decodeCanvas,
    decodeImage: function (url) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          var r = decodeCanvas(c);
          if (r) resolve({ text: r.getText(), format: formatName(r.getBarcodeFormat()) });
          else reject(new Error('not detected'));
        };
        img.onerror = function () { reject(new Error('image failed to load')); };
        img.src = url;
      });
    }
  };
})();
