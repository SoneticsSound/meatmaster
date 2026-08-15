/* MeatMaster — Recipe Scaling Engine
   ==================================================================
   PURPOSE
   The production list says "make 7". The recipe card says "makes 4 trays".
   Nobody wants to do 7/4 = 1.75x in their head at 6 AM while holding a
   scale in the other hand. This module does that math and — more
   importantly — renders the result in units a human can actually
   execute against without a calculator.

   This is a PURE LOGIC module. It has no DOM, no storage, no camera.
   It is safe to load alongside the live count app because it cannot
   touch scan/count/session state. UI wiring happens in a later step.

   Runs in both the browser (window.MMRecipes) and Node (module.exports)
   so the same code can be unit-tested in the back office.

   ------------------------------------------------------------------
   THE CORE PROBLEM AND WHY IT ISN'T JUST MULTIPLICATION
   ------------------------------------------------------------------
   Multiplying is the easy part. The hard parts are:

   1. UNIT MISMATCH. The production list counts retail *items*. The
      recipe yields *trays*. Sometimes one tray becomes one item;
      sometimes a tray gets cut into several. Every recipe therefore
      declares its own yield AND how many sellable items that yield
      produces. We never assume 1:1.

   2. UGLY NUMBERS. 1.75 x 2.25 lb = 3.9375 lb. That number is useless
      standing at a scale. It needs to come out as "3 lb 15 oz" AND
      "3.94 lb" — because the deli scale reads decimal pounds but the
      recipe card and your hands think in lb + oz. We show both.

   3. INGREDIENTS THAT DON'T SCALE LINEARLY. Salt, chili, and most
      strong seasonings do not scale 1:1 with volume. Doubling a batch
      and doubling the cayenne makes it inedible. Each ingredient can
      declare how it should be treated, and the engine flags anything
      that needs a taste-check instead of silently lying to you.

   4. PARTIAL BATCHES. A marinade recipe that makes exactly enough for
      4 trays cannot cleanly be made 1.75 times if it's built from
      whole units (2 lemons, 1 bunch cilantro). The engine can give you
      the exact scale OR round up to whole batches and tell you the
      overage, so you choose deliberately instead of guessing.
   ================================================================== */

(function (root, factory) {
  'use strict';
  // UMD-lite: attach to window in the browser, export in Node.
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MMRecipes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==================================================================
     SECTION 1 — UNIT SYSTEM
     ------------------------------------------------------------------
     Everything is converted to a canonical base unit so the math is
     done once, in one place, and never on mixed units:
        mass   -> grams
        volume -> millilitres
        count  -> each (dimensionless)
     Display conversion back out to kitchen units happens only at the
     very end, in format(). Never scale a display string.
     ================================================================== */

  var UNITS = {
    // --- mass (canonical: gram) -------------------------------------
    g:      { type: 'mass', per: 1,        label: 'g' },
    kg:     { type: 'mass', per: 1000,     label: 'kg' },
    oz:     { type: 'mass', per: 28.349523, label: 'oz' },
    lb:     { type: 'mass', per: 453.59237, label: 'lb' },

    // --- volume (canonical: millilitre) -----------------------------
    ml:     { type: 'volume', per: 1,        label: 'ml' },
    l:      { type: 'volume', per: 1000,     label: 'L' },
    tsp:    { type: 'volume', per: 4.9289216, label: 'tsp' },
    tbsp:   { type: 'volume', per: 14.786765, label: 'Tbsp' },
    floz:   { type: 'volume', per: 29.573530, label: 'fl oz' },
    cup:    { type: 'volume', per: 236.58824, label: 'cup' },
    pint:   { type: 'volume', per: 473.17648, label: 'pt' },
    quart:  { type: 'volume', per: 946.35295, label: 'qt' },
    gallon: { type: 'volume', per: 3785.4118, label: 'gal' },

    // --- count (canonical: each) ------------------------------------
    // "each" covers whole physical objects: lemons, bunches, trays,
    // sleeves. These get different rounding rules — you cannot use
    // 2.4 lemons, you use 2 or 3.
    ea:     { type: 'count', per: 1, label: '' },
    bunch:  { type: 'count', per: 1, label: 'bunch' },
    clove:  { type: 'count', per: 1, label: 'clove' },
    tray:   { type: 'count', per: 1, label: 'tray' },
    sheet:  { type: 'count', per: 1, label: 'sheet' },
    pkg:    { type: 'count', per: 1, label: 'pkg' }
  };

  // Common ways the same unit gets written on a printed recipe card.
  // The 66-page manual will not be consistent, so normalise aggressively.
  var ALIASES = {
    gram: 'g', grams: 'g', gr: 'g',
    kilogram: 'kg', kilograms: 'kg', kilo: 'kg',
    ounce: 'oz', ounces: 'oz', ozs: 'oz',
    pound: 'lb', pounds: 'lb', lbs: 'lb', '#': 'lb',
    millilitre: 'ml', milliliter: 'ml', mls: 'ml',
    litre: 'l', liter: 'l', liters: 'l', litres: 'l',
    teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp', tsps: 'tsp',
    tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tbl: 'tbsp',
    T: 'tbsp', tbsps: 'tbsp',
    'fluid ounce': 'floz', 'fl. oz': 'floz', 'fl oz': 'floz', floz: 'floz',
    cups: 'cup', c: 'cup',
    pt: 'pint', pints: 'pint',
    qt: 'quart', quarts: 'quart',
    gal: 'gallon', gallons: 'gallon',
    each: 'ea', ct: 'ea', count: 'ea', piece: 'ea', pieces: 'ea', pc: 'ea',
    bunches: 'bunch', cloves: 'clove', trays: 'tray',
    sheets: 'sheet', package: 'pkg', packages: 'pkg', packs: 'pkg', pack: 'pkg'
  };

  /* Resolve a unit string written any which way into a UNITS key.
     Returns null for anything we don't recognise, so the caller can
     fall back to passing the text through untouched rather than
     silently mis-scaling an ingredient. */
  function resolveUnit(u) {
    if (u == null) return 'ea';
    var k = String(u).trim();
    if (!k) return 'ea';
    if (UNITS[k]) return k;                       // exact match, case-sensitive first
    if (ALIASES[k]) return ALIASES[k];            // case-sensitive alias (T vs t matters!)
    var lower = k.toLowerCase().replace(/\.$/, ''); // drop a trailing period
    if (UNITS[lower]) return lower;
    if (ALIASES[lower]) return ALIASES[lower];
    return null;
  }

  /* ==================================================================
     SECTION 2 — HUMAN-READABLE NUMBER FORMATTING
     ------------------------------------------------------------------
     The whole value of this feature lives here. A correct number in an
     unusable form is a failed feature.
     ================================================================== */

  /* Fraction sets are UNIT-AWARE, and this is not a detail — it is the
     difference between a usable number and a useless one.

     Mathematically, 2.646 tsp is closest to 2 5/8 tsp. But there is no
     5/8 teaspoon in any kitchen on earth. A measuring-spoon set is
     1/4, 1/2, 1 — so the honest answer is 2 3/4 tsp, which the cook can
     actually build from the spoons in the drawer. Measuring CUPS do
     have 1/3 and 1/8 marks, so cups get the finer set. Digital scales
     read to 1/4 oz, so mass gets quarters.

     Snap to what the tool in their hand can measure, not to what the
     arithmetic prefers. */
  var FRACTIONS_FINE = [   // measuring cups: 1/8, 1/3, 1/4 marks all exist
    { v: 0,     s: ''  },
    { v: 1 / 8, s: '⅛' },
    { v: 1 / 4, s: '¼' },
    { v: 1 / 3, s: '⅓' },
    { v: 3 / 8, s: '⅜' },
    { v: 1 / 2, s: '½' },
    { v: 5 / 8, s: '⅝' },
    { v: 2 / 3, s: '⅔' },
    { v: 3 / 4, s: '¾' },
    { v: 7 / 8, s: '⅞' },
    { v: 1,     s: ''  }     // rounds up into the whole number
  ];

  var FRACTIONS_QUARTER = [ // spoons and scales: quarters only
    { v: 0,     s: ''  },
    { v: 1 / 4, s: '¼' },
    { v: 1 / 2, s: '½' },
    { v: 3 / 4, s: '¾' },
    { v: 1,     s: ''  }
  ];

  /* Snap a decimal to the nearest MEASURABLE fraction and render it as
     a mixed number: 1.73 -> "1 3/4". This is deliberate, controlled
     rounding — a cook cannot measure 1.73 cups, and pretending
     otherwise is worse than rounding. Precision loss is reported by the
     caller via the `approx` flag when it matters. */
  function toMixedFraction(value, set) {
    var FRACTIONS = set || FRACTIONS_FINE;
    var neg = value < 0;
    var v = Math.abs(value);
    var whole = Math.floor(v);
    var rem = v - whole;

    // Find the closest allowed fraction to the remainder.
    var best = FRACTIONS[0], bestDist = Infinity;
    for (var i = 0; i < FRACTIONS.length; i++) {
      var d = Math.abs(FRACTIONS[i].v - rem);
      if (d < bestDist) { bestDist = d; best = FRACTIONS[i]; }
    }
    if (best.v === 1) { whole += 1; best = FRACTIONS[0]; } // 7/8 -> rounded up to next whole

    var out;
    if (whole === 0 && best.s === '') out = '0';
    else if (best.s === '')           out = String(whole);
    else if (whole === 0)             out = best.s;
    else                              out = whole + ' ' + best.s;

    return (neg ? '-' : '') + out;
  }

  /* WEIGHT DISPLAY STYLE — Kyle's call, 2026-08-13.

     The department scales PRINT DECIMAL POUNDS. That is the number on
     the label, the number you punch in, and the number you compare
     against. Converting 3.94 lb into "3 lb 15 oz" in your head is pure
     friction with no payoff — it actively slows the job down.

     So DECIMAL IS PRIMARY. The lb+oz form is kept as a secondary echo
     (he's "not opposed" to seeing both) but it never leads.

       'decimal'  -> "3.94 lb"                      (default)
       'both'     -> "3.94 lb"  + echo "3 lb 15 oz"
       'imperial' -> "3 lb 15 oz" + echo "3.94 lb"  (the old behaviour)

     Set MASS_STYLE once here; every scaled ingredient follows it. */
  var MASS_STYLE = 'both';

  function setMassStyle(style) {
    if (style === 'decimal' || style === 'both' || style === 'imperial') MASS_STYLE = style;
    return MASS_STYLE;
  }

  /* Build the lb+oz form. Kept as a helper because it's now the
     SECONDARY representation, not the headline. */
  function imperialMass(grams) {
    var snappedOz = Math.round((grams / UNITS.oz.per) * 4) / 4; // 1/4 oz = a scale's real resolution

    // Sub-pound amounts stay in ounces. NOTE the snapped comparison:
    // 15.99 oz snaps to 16.00, which must become "1 lb", not "16 oz".
    // Comparing the RAW value here was a bug — round first, then decide
    // which unit you're in.
    if (snappedOz < 16) return toMixedFraction(snappedOz, FRACTIONS_QUARTER) + ' oz';

    // Rebuild pounds from the SNAPPED ounces so the two displayed
    // numbers can never disagree with each other.
    var totalQuarterOz = Math.round(snappedOz * 4);
    var wholeLb = Math.floor(totalQuarterOz / 64);          // 64 quarter-oz per lb
    var remOz = (totalQuarterOz - wholeLb * 64) / 4;

    var text = wholeLb + ' lb';
    if (remOz > 0) text += ' ' + toMixedFraction(remOz, FRACTIONS_QUARTER) + ' oz';
    return text;
  }

  /* Decimal pounds, matching how the scale prints. Trailing zeros are
     trimmed so a clean weight reads "10 lb", not "10.00 lb" — but any
     real fraction keeps two places because that's what the scale shows. */
  function decimalMass(grams) {
    var lb = grams / UNITS.lb.per;
    var s = lb.toFixed(2);
    if (s.slice(-3) === '.00') s = s.slice(0, -3);
    return s + ' lb';
  }

  function formatMass(grams) {
    var dec = decimalMass(grams);
    var imp = imperialMass(grams);

    if (MASS_STYLE === 'imperial') {
      return { text: imp, scaleText: imp === dec ? '' : dec };
    }
    if (MASS_STYLE === 'decimal') {
      return { text: dec, scaleText: '' };
    }
    // 'both' — decimal leads, imperial echoes, and the echo is dropped
    // when it adds nothing ("10 lb (10 lb)").
    return { text: dec, scaleText: imp === dec ? '' : imp };
  }

  /* Format a canonical volume (ml) into the largest sensible kitchen
     measure. Deliberately stops at quarts — nobody measures marinade
     in gallons at a prep table, and "3 qt" beats "0.75 gal". */
  function formatVolume(ml) {
    // Ladder thresholds are chosen by what you'd physically reach for,
    // not by "largest unit >= 1". 42 fl oz of marinade is 1.3 quarts,
    // but nobody measures 1 1/3 qt — they measure 5 1/4 cups with the
    // cup that's already in their hand. So cups hold until 8 cups
    // (2 qt), past which cup-counting gets silly and quarts win.
    var ladder = [
      { key: 'quart', min: 2 },   // >= 2 qt  -> quarts
      { key: 'cup',   min: 1 },   // >= 1 cup -> cups
      { key: 'tbsp',  min: 1 },   // >= 1 Tbsp
      { key: 'tsp',   min: 0 }    // floor
    ];

    for (var i = 0; i < ladder.length; i++) {
      var key = ladder[i].key;
      var val = ml / UNITS[key].per;
      if (val >= ladder[i].min || key === 'tsp') {
        if (key === 'tsp' && val < 0.125) return { text: 'a pinch', scaleText: '' };
        // Spoons snap to quarters (no 5/8 tsp exists); cups get the
        // finer set because cup measures have 1/3 and 1/8 marks.
        var set = (key === 'tsp' || key === 'tbsp') ? FRACTIONS_QUARTER : FRACTIONS_FINE;
        return { text: toMixedFraction(val, set) + ' ' + UNITS[key].label, scaleText: '' };
      }
    }
    return { text: toMixedFraction(ml) + ' ml', scaleText: '' };
  }

  /* Format a count. Whole physical objects get rounded UP by default —
     running out of lemons mid-prep costs more than one extra lemon. */
  function formatCount(each, unitKey, roundUpCounts) {
    var label = UNITS[unitKey] ? UNITS[unitKey].label : '';
    var shown = roundUpCounts ? Math.ceil(each - 1e-9) : each;
    var num = roundUpCounts ? String(shown) : toMixedFraction(shown);
    var exact = Math.abs(shown - each) > 1e-6 ? each : null;
    return {
      text: label ? (num + ' ' + label + (shown === 1 ? '' : pluralSuffix(label))) : num,
      scaleText: exact != null ? ('exact ' + trimNum(exact)) : ''
    };
  }

  function pluralSuffix(label) {
    // Only pluralise the words that read wrong otherwise.
    if (label === 'bunch') return 'es';
    if (label === 'clove' || label === 'tray' || label === 'sheet' || label === 'pkg') return 's';
    return '';
  }

  function trimNum(n) {
    return (Math.round(n * 100) / 100).toString();
  }

  /* Top-level formatter: takes a canonical quantity + its type and
     returns { text, scaleText }. `text` is what a human reads,
     `scaleText` is the secondary decimal-pound / exact-value echo. */
  function format(canonicalQty, type, unitKey, opts) {
    opts = opts || {};
    if (type === 'mass')   return formatMass(canonicalQty);
    if (type === 'volume') return formatVolume(canonicalQty);
    return formatCount(canonicalQty, unitKey, opts.roundUpCounts !== false);
  }

  /* ==================================================================
     SECTION 3 — SCALE MODES
     ------------------------------------------------------------------
     How each ingredient responds to a change in batch size.
     ================================================================== */

  var SCALE_MODES = {
    // Default. Scales straight with the batch. Meat, marinade base,
    // oil, stock, produce — anything where twice the food genuinely
    // needs twice the ingredient.
    linear: function (qty, scale) { return qty * scale; },

    // Does not scale at all. "Salt to taste", "oil the pan",
    // "1 sheet pan liner per tray" style entries where the recipe text
    // is an instruction, not a quantity.
    fixed: function (qty) { return qty; },

    // Scales, but sub-linearly. Strong seasoning: cayenne, clove,
    // smoke, truffle, fish sauce. Doubling a batch does NOT need
    // double the heat. Uses the square-root convention professional
    // kitchens use as a starting point — then the engine FLAGS it so
    // the cook tastes and adjusts rather than trusting the number.
    season: function (qty, scale) { return qty * Math.sqrt(scale); }
  };

  /* ==================================================================
     SECTION 4 — THE SCALING CALL
     ================================================================== */

  /* scaleRecipe(recipe, demand, options)

     recipe  — see the schema block at the bottom of this file.
     demand  — { qty: 7, unit: 'item' }  (what the production list asked for)
               unit may be 'item' (retail units) or 'batch' or any yield unit.
     options — { wholeBatches: false, roundUpCounts: true }

     Returns a fully-resolved, display-ready object. Nothing downstream
     needs to do arithmetic. */
  function scaleRecipe(recipe, demand, options) {
    options = options || {};
    var wholeBatches = !!options.wholeBatches;

    var yieldQty  = recipe.yield && recipe.yield.qty  ? recipe.yield.qty  : 1;
    var yieldUnit = recipe.yield && recipe.yield.unit ? recipe.yield.unit : 'tray';

    // How many sellable retail items ONE batch of this recipe produces.
    // If the recipe doesn't say, assume one yield unit = one item, but
    // mark it so the UI can warn that the mapping is unverified.
    var itemsPerBatch = recipe.yield && recipe.yield.items != null
      ? recipe.yield.items
      : yieldQty;
    var itemsAssumed = !(recipe.yield && recipe.yield.items != null);

    var demandQty  = demand && demand.qty  != null ? demand.qty  : 1;
    var demandUnit = demand && demand.unit ? String(demand.unit).toLowerCase() : 'item';

    // --- Work out the raw multiplier against ONE recipe batch --------
    var rawScale;
    if (demandUnit === 'batch' || demandUnit === 'batches') {
      rawScale = demandQty;
    } else if (demandUnit === 'item' || demandUnit === 'items' || demandUnit === 'each') {
      // The production-list case: "make 7" retail items.
      rawScale = demandQty / itemsPerBatch;
    } else if (demandUnit === String(yieldUnit).toLowerCase()) {
      // Demand stated in the recipe's own yield unit, e.g. "6 trays".
      rawScale = demandQty / yieldQty;
    } else {
      // Unknown unit — treat as retail items and let the UI flag it.
      rawScale = demandQty / itemsPerBatch;
    }

    // --- Optionally round up to whole batches -----------------------
    // Some recipes are built from indivisible components (one whole
    // marinade pack, one bunch of herbs). For those, 1.75 batches is a
    // fiction; you make 2 and carry the overage.
    var appliedScale = wholeBatches ? Math.ceil(rawScale - 1e-9) : rawScale;

    var producedItems = appliedScale * itemsPerBatch;
    var overageItems  = producedItems - demandQty;

    // --- Scale every ingredient -------------------------------------
    var lines = [];
    var needsTasteCheck = false;

    (recipe.ingredients || []).forEach(function (ing) {
      var mode = SCALE_MODES[ing.scale] ? ing.scale : 'linear';
      var unitKey = resolveUnit(ing.unit);

      // Unrecognised unit: pass the text straight through rather than
      // scaling a number we can't interpret. Better a visible "?" than
      // a confidently wrong quantity.
      if (unitKey === null) {
        lines.push({
          name: ing.name,
          text: (ing.qty != null ? trimNum(ing.qty * appliedScale) + ' ' : '') + (ing.unit || ''),
          scaleText: '',
          note: ing.note || '',
          unknownUnit: true,
          mode: mode
        });
        return;
      }

      var def = UNITS[unitKey];
      var canonicalBase = (ing.qty || 0) * def.per;                 // base batch, canonical
      var canonicalScaled = SCALE_MODES[mode](canonicalBase, appliedScale);

      if (mode === 'season' && appliedScale > 1.25) needsTasteCheck = true;

      var f = format(canonicalScaled, def.type, unitKey, {
        roundUpCounts: options.roundUpCounts !== false
      });

      lines.push({
        name: ing.name,
        text: f.text,
        scaleText: f.scaleText,     // decimal-lb echo for the scale
        note: ing.note || '',
        mode: mode,
        // Flag ingredients whose displayed value was snapped enough to
        // matter — lets the UI show a subtle "~" instead of implying
        // false precision.
        approx: isApprox(canonicalScaled, def, unitKey),
        unknownUnit: false
      });
    });

    return {
      id: recipe.id,
      name: recipe.name,
      plu: recipe.plu || null,

      demandQty: demandQty,
      demandUnit: demandUnit,

      rawScale: rawScale,
      scale: appliedScale,
      scaleLabel: formatScaleLabel(appliedScale),
      wholeBatches: wholeBatches,

      yieldQty: yieldQty,
      yieldUnit: yieldUnit,
      itemsPerBatch: itemsPerBatch,
      itemsPerBatchAssumed: itemsAssumed,

      producedItems: producedItems,
      overageItems: Math.round(overageItems * 100) / 100,

      ingredients: lines,
      steps: recipe.steps || [],
      needsTasteCheck: needsTasteCheck,
      station: recipe.station || null,
      minutes: recipe.minutes || null
    };
  }

  /* Did rounding move the number enough that we should say "about"? */
  function isApprox(canonical, def, unitKey) {
    if (def.type === 'count') return false;
    if (def.type === 'mass') {
      var oz = canonical / UNITS.oz.per;
      var snapped = Math.round(oz * 4) / 4;
      return Math.abs(snapped - oz) > 0.05;
    }
    return false;
  }

  /* "1.75x" reads badly on a card. "1 3/4x" reads like a recipe. */
  function formatScaleLabel(scale) {
    if (Math.abs(scale - Math.round(scale)) < 1e-9) return Math.round(scale) + '×';
    return toMixedFraction(scale) + '×';
  }

  /* ==================================================================
     SECTION 5 — THE DAY'S PLAYLIST
     ------------------------------------------------------------------
     Take the whole production list at once and return every recipe
     pre-scaled, in the order you'll actually cook them. This is the
     thing you refer back to all day instead of re-reading the binder.
     ================================================================== */

  /* buildPlaylist(productionList, recipeBook, options)

     productionList — [{ plu | recipeId, qty, unit }]   from the morning sheet
     recipeBook     — array of recipe objects
     options        — { order: 'station' | 'sheet', wholeBatches: false }

     Anything on the production list with no matching recipe comes back
     in `unmatched` rather than being silently dropped — you need to
     SEE the gap, because that's a recipe page still to photograph. */
  function buildPlaylist(productionList, recipeBook, options) {
    options = options || {};
    var byPlu = {}, byId = {};
    (recipeBook || []).forEach(function (r) {
      if (r.plu) byPlu[String(r.plu)] = r;
      if (r.id)  byId[String(r.id)] = r;
    });

    var items = [], unmatched = [];

    (productionList || []).forEach(function (row, i) {
      var recipe = (row.recipeId && byId[String(row.recipeId)]) ||
                   (row.plu && byPlu[String(row.plu)]) || null;
      if (!recipe) {
        unmatched.push({ plu: row.plu || null, name: row.name || null, qty: row.qty });
        return;
      }
      var scaled = scaleRecipe(recipe, { qty: row.qty, unit: row.unit || 'item' }, options);
      scaled.sheetOrder = i;           // preserve the paper sheet's own order
      scaled.done = false;             // the cook ticks these off through the day
      items.push(scaled);
    });

    // Grouping by station means you do all the marinating at once, all
    // the oven work at once — instead of walking back and forth.
    if (options.order === 'station') {
      items.sort(function (a, b) {
        var sa = a.station || '￿', sb = b.station || '￿';
        if (sa !== sb) return sa < sb ? -1 : 1;
        return a.sheetOrder - b.sheetOrder;
      });
    }

    return {
      builtAt: new Date().toISOString(),
      order: options.order || 'sheet',
      items: items,
      unmatched: unmatched,
      totalItems: items.reduce(function (s, x) { return s + x.demandQty; }, 0)
    };
  }

  /* ==================================================================
     SECTION 6 — RECIPE SCHEMA (this is the ingest target)
     ------------------------------------------------------------------
     The 66-page manual gets transcribed INTO this shape. Locking the
     shape before the photo ingest is the whole point — transcribe once,
     not twice.

     {
       id:      'carne-asada',        // stable slug, never changes
       plu:     '7659',               // links to the case layout + count DB
       name:    'Carne Asada',
       station: '1-marinate',         // sort key for playlist grouping
       minutes: 20,                   // active time, for day planning

       yield: {
         qty:   4,                    // recipe card's stated yield
         unit:  'tray',
         items: 4                     // sellable retail units per batch
       },                             //   <-- the 'make 7' -> trays bridge

       ingredients: [
         { name: 'Flap meat, trimmed', qty: 5,   unit: 'lb'  },
         { name: 'Carne asada marinade', qty: 24, unit: 'floz' },
         { name: 'Lime',               qty: 2,   unit: 'ea'  },
         { name: 'Cayenne',            qty: 2,   unit: 'tsp',
           scale: 'season' },         // sub-linear + taste-check flag
         { name: 'Tray liner',         qty: 1,   unit: 'sheet',
           scale: 'fixed', note: 'one per tray' }
       ],

       steps: [ 'Trim silverskin.', 'Marinate 4 hr minimum.' ]
     }
     ================================================================== */

  return {
    UNITS: UNITS,
    resolveUnit: resolveUnit,
    toMixedFraction: toMixedFraction,
    format: format,
    formatMass: formatMass,
    setMassStyle: setMassStyle,
    decimalMass: decimalMass,
    imperialMass: imperialMass,
    formatVolume: formatVolume,
    scaleRecipe: scaleRecipe,
    buildPlaylist: buildPlaylist,
    SCALE_MODES: SCALE_MODES
  };
});
