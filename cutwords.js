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
    'London Broil', 'New York Strip', 'NY Strip', 'Ribeye', 'Rib Eye',
    'Top Sirloin', 'Sirloin', 'Tri-Tip', 'Tri Tip', 'Filet Mignon', 'Filet',
    'Tenderloin', 'Flat Iron', 'Denver', 'Picanha', 'Porterhouse', 'T-Bone',
    'Chuck', 'Brisket', 'Flank', 'Skirt', 'Round', 'Rump', 'Short Rib',
    'Shank', 'Oxtail', 'Stew', 'Kabob', 'Kabobs', 'Kebab', 'Kebob', 'Kebobs',
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

  // Return `name` as escaped HTML with the first (longest) matching cut keyword
  // wrapped in <span class="cut-kw">. One keyword only — a single clean anchor
  // reads faster than a name lit up all over. No match → plain escaped text.
  function markup(name) {
    var s = String(name || '');
    var lower = s.toLowerCase();
    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i];
      var idx = lower.indexOf(w.toLowerCase());
      if (idx >= 0) {
        return esc(s.slice(0, idx)) +
          '<span class="cut-kw">' + esc(s.slice(idx, idx + w.length)) + '</span>' +
          esc(s.slice(idx + w.length));
      }
    }
    return esc(s);
  }

  root.MMCutWords = { markup: markup };
})(typeof self !== 'undefined' ? self : this);
