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
  var _hints = null;
  var _rotCanvas = null, _rotCtx = null;
  function hints() {
    if (_hints) return _hints;
    var Z = window.ZXing;
    _hints = new Map();
    // EAN-13 also reads UPC-A (UPC-A = EAN-13 with a leading zero).
    _hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13]);
    // TRY_HARDER = scan more rows + tolerate tilt. Essential for real,
    // hand-held, curved-package barcodes (verified against real photos).
    _hints.set(Z.DecodeHintType.TRY_HARDER, true);
    return _hints;
  }
  // Return the canvas rotated 90°, so a sideways barcode becomes readable.
  function rotate90(c) {
    if (!_rotCanvas) {
      _rotCanvas = document.createElement('canvas');
      _rotCtx = _rotCanvas.getContext('2d', { willReadFrequently: true });
    }
    _rotCanvas.width = c.height; _rotCanvas.height = c.width;
    _rotCtx.setTransform(1, 0, 0, 1, 0, 0);
    _rotCtx.translate(_rotCanvas.width / 2, _rotCanvas.height / 2);
    _rotCtx.rotate(Math.PI / 2);
    _rotCtx.drawImage(c, -c.width / 2, -c.height / 2);
    return _rotCanvas;
  }
  // Decode a canvas. Tries GlobalHistogram then Hybrid binarizer, each in
  // upright and 90°-rotated orientation, with TRY_HARDER. Returns first hit
  // (a ZXing Result) or null. GlobalHistogram-upright is cheapest and handles
  // the common well-aligned case first.
  function decodeCanvas(cnv) {
    var Z = window.ZXing;
    if (!_reader) _reader = new Z.MultiFormatReader();
    var orients = [cnv, rotate90(cnv)];
    var bins = [Z.GlobalHistogramBinarizer, Z.HybridBinarizer];
    for (var b = 0; b < bins.length; b++) {
      for (var o = 0; o < orients.length; o++) {
        var src = new Z.HTMLCanvasElementLuminanceSource(orients[o]);
        try { return _reader.decode(new Z.BinaryBitmap(new bins[b](src)), hints()); }
        catch (e) {}
      }
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
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1920 },   // sharper feed = thinner bars resolved
        height: { ideal: 1080 }
      }
    }).then(function (s) {
      stream = s;
      video.srcObject = s;
      return video.play();
    }).then(function () {
      running = true;
      scanner.classList.add('is-live');
      show(controls, true);
      scanSub.textContent = 'Fill the box · hold steady · good light helps';
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
        var vw = video.videoWidth, vh = video.videoHeight;
        // Crop to (roughly) the on-screen framing box, at full resolution, so
        // the barcode the user lines up keeps all its pixels instead of being
        // shrunk away. Verified: downscaling the whole frame lost real barcodes.
        var sideF = 0.10, topF = 0.16;
        var sx = vw * sideF, sy = vh * topF;
        var sw = vw * (1 - 2 * sideF), sh = vh * (1 - 2 * topF);
        var cap = 1000, scale = Math.min(1, cap / sw); // bound work for speed
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        var res = decodeCanvas(canvas);
        if (res) onDecode(res);
      }
    } catch (e) { /* keep the loop alive no matter what */ }
    scanTimer = setTimeout(loop, 90);
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
