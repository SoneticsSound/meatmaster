/* MeatMaster — cut-name keyword highlighter
   Kyle highlights the cut name on his paper checklist so his eye lands on it.
   This does the same on-screen: it wraps the most distinctive cut keyword in a
   product name with <span class="cut-kw"> so the row is fast to spot when
   matching the paper list to the Periscope report / scan card.
   Pure string→HTML, no state, safe to call from any module. */
(function (root) {
  // Distinctive cut keywords, longest-first so a multi-word cut ("New York
  // Strip") wins over a partial ("Strip"). Order added; sorted below.
  var WORDS = [
    'London Broil', 'New York Strip', 'NY Strip', 'New York', 'Ribeye', 'Rib Eye',
    'Top Sirloin Filet', 'Top Sirloin', 'Petite Sirloin', 'Sirloin', 'Tri-Tip', 'Tri Tip',
    'Filet Mignon', 'Filet', 'Tenderloin', 'Flat Iron', 'Denver', 'Picanha',
    'Porterhouse', 'T-Bone', 'Chuck', 'Brisket', 'Flank', 'Skirt', 'Round',
    'Rump', 'Short Ribs', 'Short Rib', 'Flap Meat', 'Breakfast Steak', 'Breakfast',
    'Shank', 'Oxtail', 'Stew Meat', 'Stew', 'Kabob', 'Kabobs', 'Kebab', 'Kebob', 'Kebobs',
    'Fajita', 'Carne Picada', 'Carne Asada', 'Ground', 'Burger', 'Patties',
    'Meatball', 'Meatballs', 'Cube Steak', 'Cube', 'Stir Fry', 'Stir-Fry',
    // poultry / pork / seafood cuts that appear on the checklist
    'Wings', 'Thigh', 'Thighs', 'Breast', 'Tenders', 'Drumstick', 'Chops',
    'Ribs', 'Salmon', 'Shrimp', 'Scallops', 'Tuna', 'Tilapia', 'Cod',
    'Bacon', 'Sausage', 'Kielbasa'
  ];
  WORDS.sort(function (a, b) { return b.length - a.length; });

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  // Return `name` as escaped HTML with highlights:
  //  - the first (longest) matching cut keyword in <span class="cut-kw"> (yellow)
  //    — one clean anchor reads faster than a name lit up all over;
  //  - every "grassfed" token in <span class="grassfed-kw"> (green) — Kyle
  //    tracks grassfed, and wants just the WORD called out, not the whole row.
  // Overlaps (rare — a cut word never contains "grassfed") keep the earlier one.
  function markup(name) {
    var s = String(name || '');
    var lower = s.toLowerCase();
    var ranges = [];

    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i];
      var idx = lower.indexOf(w.toLowerCase());
      if (idx >= 0) { ranges.push({ start: idx, end: idx + w.length, cls: 'cut-kw' }); break; }
    }
    var re = /grass[\s-]?fed/gi, m;
    while ((m = re.exec(s)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, cls: 'grassfed-kw' });
    }
    if (!ranges.length) return esc(s);

    ranges.sort(function (a, b) { return a.start - b.start; });
    var out = '', pos = 0, lastEnd = -1;
    ranges.forEach(function (r) {
      if (r.start < lastEnd) return;        // overlaps the previous highlight — skip
      out += esc(s.slice(pos, r.start)) +
        '<span class="' + r.cls + '">' + esc(s.slice(r.start, r.end)) + '</span>';
      pos = r.end; lastEnd = r.end;
    });
    out += esc(s.slice(pos));
    return out;
  }

  root.MMCutWords = { markup: markup };
})(typeof self !== 'undefined' ? self : this);
