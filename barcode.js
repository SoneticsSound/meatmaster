/* MeatMaster — EAN-13 barcode generator (no dependencies)
   The Periscope count sheet prints each item as an EAN-13: "020" + 4-digit PLU
   + "00000" (price zeroed) + check digit. This renders that same symbology as
   crisp SVG so it can be shown on the phone and scanned straight into Periscope,
   skipping the paper. Confirmed against the real sheet by decoding it with zbar:
   PLU 7059 -> 0207059000009, all 24 codes read back as EAN-13. */
(function (root) {
  // 7-module encodings.
  var L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  var G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  var R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  // Which of the six left digits use L vs G, chosen by the first (system) digit.
  var PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

  function digits(s) { return String(s).replace(/\D/g, ''); }

  // EAN-13 mod-10 check digit over the first 12 digits (odd pos ×1, even ×3).
  function checkDigit(d12) {
    var sum = 0;
    for (var i = 0; i < 12; i++) sum += (+d12[i]) * (i % 2 ? 3 : 1);
    return (10 - (sum % 10)) % 10;
  }

  // Normalise input to a valid 13-digit EAN-13 string (accepts 12 or 13).
  function normalize(value) {
    var d = digits(value);
    if (d.length === 12) return d + checkDigit(d);
    if (d.length === 13) return d.slice(0, 12) + checkDigit(d.slice(0, 12)); // trust our own check
    return null;
  }

  // The Periscope item code for a PLU: EAN-13 "020" + PLU(4) + "00000" + check.
  function codeForPlu(plu) {
    var p = digits(plu);
    if (!p) return null;
    while (p.length < 4) p = '0' + p;
    if (p.length > 4) return null;
    return normalize('020' + p + '00000');   // 12 digits in, check appended
  }

  // Build the 95-module bit string for a 13-digit code.
  function modules(code13) {
    var first = +code13[0];
    var pat = PARITY[first];
    var bits = '101';                          // start guard
    for (var i = 1; i <= 6; i++) {             // left group (digits 2..7)
      var dig = +code13[i];
      bits += (pat[i - 1] === 'L' ? L : G)[dig];
    }
    bits += '01010';                           // center guard
    for (var j = 7; j <= 12; j++) bits += R[+code13[j]];  // right group (digits 8..13)
    bits += '101';                             // end guard
    return bits;
  }

  // Render `value` as an EAN-13 SVG string. opts: { moduleWidth, height, quiet,
  // showText, color, bg }. Bars are pure black on white for max scan contrast.
  // IMPORTANT for laser reads: module width is a WHOLE number of pixels and the
  // SVG is emitted at its natural size with shape-rendering="crispEdges", so
  // every bar edge lands on a pixel boundary — no anti-aliased grey edges, and
  // the bar-width ratios stay exact. The bars must NOT be scaled to a fractional
  // width by CSS; keep them at natural size (they fit a phone screen at mw=3).
  function ean13SVG(value, opts) {
    opts = opts || {};
    var code = normalize(value);
    if (!code) return '';
    var mw = Math.max(1, Math.round(opts.moduleWidth || 3));  // whole pixels only
    var barH = opts.height || 200;
    var quiet = opts.quiet != null ? opts.quiet : 11;   // quiet zone in modules (spec min 11)
    var showText = opts.showText !== false;
    var color = opts.color || '#000';
    var bg = opts.bg || '#fff';
    var textH = showText ? 26 : 0;
    var guardExtra = 9;                        // start/center/end guards run longer, per spec

    var bits = modules(code);                  // 95 modules
    var totalModules = bits.length + quiet * 2;
    var W = totalModules * mw;
    var H = barH + textH + 8;

    // Guard bar positions (modules from start of the code): 0-2, 46-50, 92-94.
    function isGuard(m) { return (m <= 2) || (m >= 46 && m <= 50) || (m >= 92); }

    var rects = '';
    for (var m = 0; m < bits.length; m++) {
      if (bits[m] !== '1') continue;
      var x = (quiet + m) * mw;
      var h = barH + (isGuard(m) ? guardExtra : 0);
      rects += '<rect x="' + x + '" y="0" width="' + mw + '" height="' + h + '"/>';
    }

    var text = '';
    if (showText) {
      // First digit sits in the left quiet zone; the two groups of six under the bars.
      var y = barH + guardExtra + 20;
      var fs = 22;
      function t(str, cx) { return '<text x="' + cx + '" y="' + y + '" font-family="monospace" font-size="' + fs + '" text-anchor="middle" fill="' + color + '">' + str + '</text>'; }
      var lead = (quiet - 4) * mw;                                   // in the quiet zone
      var leftCx = (quiet + 3 + 21) * mw;                            // middle of left group
      var rightCx = (quiet + 50 + 21) * mw;                          // middle of right group
      text = t(code[0], lead) + t(code.slice(1, 7), leftCx) + t(code.slice(7), rightCx);
    }

    // Natural size + crispEdges: bars stay pixel-sharp and undistorted. High-DPI
    // phones render this at device resolution, so it looks razor sharp.
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" shape-rendering="crispEdges" role="img" aria-label="Barcode ' + code + '">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + bg + '"/>' +
      '<g fill="' + color + '">' + rects + text + '</g></svg>';
  }

  root.MMBarcode = {
    ean13SVG: ean13SVG,
    codeForPlu: codeForPlu,
    normalize: normalize,
    checkDigit: checkDigit
  };
})(typeof self !== 'undefined' ? self : this);
