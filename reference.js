/* MeatMaster — Reference Data
   ==================================================================
   Transcribed from Kyle's shift photos, 2026-08-13.

   This is the DATA layer for the reference overlays (the same paged
   viewer that already backs "View Case Layout" / "Garnish Reference").
   It is pure data + no DOM, so it cannot affect a live count.

   Every deck below carries a `source` naming the photo it came from,
   so any disputed line can be re-checked against the original rather
   than argued about from memory.

   ANYTHING MARKED `verify: true` IS A BEST-EFFORT READ. Kyle confirms
   or corrects it on shift. Do not treat those as truth.
   ================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MMReference = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==================================================================
     DECK 1 — GARNISH GUIDE  (updated sheet, source: Reference/image.jpeg)
     ------------------------------------------------------------------
     This REPLACES the older transcription in caselayout.js, which was
     built from the previous sheet and had a "Quick notes" group that no
     longer exists. The current laminated sheet has exactly two groups:
     Seafood Service Case, then Meat Service Case.

     `plu` links each line back to the case layout so the display order
     can be DERIVED from the physical case walk instead of maintained as
     a second hand-sorted list. Fix the layout once, the garnish order
     follows automatically.

     The rows below are stored in the LAMINATED SHEET's own order. That
     is deliberate — this is the raw transcription, kept faithful to the
     source so it can be checked against the photo. Display order is
     computed separately by buildGarnishWalk() further down, which sorts
     these into the physical case walk.

     Transcription and presentation are different jobs. Keeping the
     transcription honest is what lets the presentation be re-derived
     later without re-reading the photo.
     ================================================================== */
  var GARNISH = {
    title: 'Garnish Guide',
    source: 'Reference/image.jpeg (updated sheet, photographed 2026-08-13)',
    note: 'Prep garnish per item. Order follows the case walk, not the sheet.',
    groups: [
      {
        heading: 'Seafood Service Case',
        rows: [
          { item: 'Cilantro Lime Salmon (Atlantic/Sockeye)', garnish: 'Sliced lime half moons & chopped cilantro', plu: null, verify: true },
          { item: 'Citrus & Lemon Colossal Shrimp',          garnish: 'Chopped Italian parsley',                   plu: null, verify: true },
          { item: 'Salmon Red Chimichurri',                  garnish: 'Chopped Italian parsley',                   plu: '9165' },
          { item: 'Black Garlic Barramundi',                 garnish: 'Chopped Italian parsley',                   plu: '9413' }
        ]
      },
      {
        heading: 'Meat Service Case',
        rows: [
          { item: 'Jamaican Jerk Wings',          garnish: 'Chopped green onions',                        plu: '8058' },
          { item: 'Jamaican Jerk Chicken Thighs', garnish: 'Chopped green onions',                        plu: '8349' },
          { item: 'Carne Asada',                  garnish: 'Chopped green onions & diced red onions',      plu: '7659' },
          { item: 'Pollo Asada',                  garnish: 'Chopped green onions & diced red onions',      plu: '8157' },
          { item: 'Korean BBQ Chicken Skewers',   garnish: 'Chopped green onions & sesame seeds',          plu: '8246' },
          { item: 'Steak w Korean BBQ',           garnish: 'Chopped green onions & sesame seeds',          plu: '7073' },
          { item: 'Korean BBQ Chicken Wings',     garnish: 'Chopped green onions & sesame seeds',          plu: '8346' },
          { item: 'Black Truffle Beef Skewers',   garnish: 'Chopped Italian parsley',                      plu: '7074' },
          { item: 'Black Garlic Wings',           garnish: 'Chopped Italian parsley',                      plu: '8197' },
          { item: 'Red Chimichurri Chicken Wings',garnish: 'Chopped Italian parsley',                      plu: '8363' },
          { item: 'Citrus Lemon Chicken Breast',  garnish: 'Chopped Italian parsley',                      plu: '8162', verify: true },
          { item: 'Herb Butter Breast',           garnish: 'Chopped Italian parsley',                      plu: '8351' },
          { item: 'Steak w/ Red Chimichurri',     garnish: 'Diced red bell & chopped Italian parsley',     plu: '7879' },
          { item: 'Cajun Butter Chicken Wings',   garnish: 'Dry thyme leaf',                               plu: '8343' }
        ]
      }
    ]
  };

  /* WHAT CHANGED vs the old caselayout.js garnish page:
       + Salmon Red Chimichurri            (new on the sheet)
       + Jamaican Jerk Chicken Thighs      (was only in "Quick notes")
       + Red Chimichurri Chicken Wings     (was "Red Chimichurri")
       + Steak w/ Red Chimichurri          (new, diced red bell)
       + Korean BBQ Chicken Wings          (was "Korean BBQ Wings")
       - "Quick notes" group               (folded into the main list)
       - Mediterranean Breasts / Mushroom Breasts — these were MARINADE
         notes, not garnish, and are NOT on the current sheet. Dropped.
       ~ Cajun Wings "organic thyme from bulk" is now "Dry Thyme Leaf". */

  /* ==================================================================
     DECK 2 — ONE-PAN MEALS  (source: Reference/image2.jpeg)
     ------------------------------------------------------------------
     "Page 1 of 3" of the Periscope label sheet, marked "20 types" in
     Kyle's handwriting — and it is exactly 20, which is a good sign the
     transcription is complete.

     These are the 11-digit ITEM CODES from the label sheet, which are a
     DIFFERENT identifier from the 4-digit PLUs the scanner matches on.
     Both are kept: `code` for the corporate sheet, `plu` to be filled in
     from products.js so the recipe playlist can link a production row to
     the right scaled recipe.

     Grid is transcribed in the sheet's own 7-column rows so the display
     can mirror the printed page — that is what makes it usable as a
     reference while standing at the case.
     ================================================================== */
  var ONEPAN = {
    title: 'One-Pan Meals',
    source: 'Reference/image2.jpeg (Periscope label sheet, page 1 of 3, "20 types")',
    note: '11-digit item codes from the corporate sheet. PLUs still to be linked.',
    rows: [
      [
        { code: '20729400000', name: 'Shrimp Scampi',                     sheetName: 'MEAL-SHRIMP SCAMPI' },
        { code: '20729500000', name: 'Salmon Citrus Herb',                sheetName: 'MEAL-SALMON CITRUS HERB' },
        { code: '20741100000', name: 'Black Truffle Sirloin Mushroom',    sheetName: 'MEAL-BLK TRFL SIRLOIN MSHRM SAUT-JBS' },
        { code: '20728600000', name: 'Steak with Chimichurri',            sheetName: 'MEAL-STEAK W-CHIMICHURRI-JBS' },
        { code: '20749200000', name: 'Marry Me Chicken',                  sheetName: 'MEAL-MARRY ME CHICKEN-PF' },
        { code: '20787400000', name: 'Chicken Fajitas',                   sheetName: 'MEAL-CHICKEN FAJITAS-PF' },
        { code: '20729600000', name: 'Citrus Herb Chicken',               sheetName: 'MEAL-CITRUS HERB CHICKEN-PF' }
      ],
      [
        { code: '20746200000', name: 'Firecracker Shrimp',                sheetName: 'MEAL-FIRECRACKER SHRIMP' },
        { code: '20912600000', name: 'Hot Honey Chipotle Salmon',         sheetName: 'MEAL-HOT HONEY CHIPOTLE SALMON' },
        { code: '20711400000', name: 'Grass-Fed Beef Stuffed Peppers',    sheetName: 'MEAL-GRASS-FED BEEF STUFFED PEPPERS' },
        { code: '20752100000', name: 'Hot Honey Chipotle Chicken',        sheetName: 'MEAL-HOT HONEY CHIPOTLE CHICKEN-PF' },
        { code: '20706300000', name: 'Garlic Lemon Chicken',              sheetName: 'MEAL-GARLIC LEMON CHICKEN-PF' },
        { code: '20745500000', name: 'Firecracker Chicken',               sheetName: 'MEAL-FIRECRACKER CHICKEN-WEST' }
      ],
      [
        { code: '20975300000', name: 'Herb Butter Shrimp',                sheetName: 'MEAL-HERB BUTTER SHRIMP' },
        { code: '20914200000', name: 'Cajun Butter Shrimp',               sheetName: 'MEAL-CAJUN BUTTER SHRIMP' },
        { code: '20975400000', name: 'Island Jerk Salmon',                sheetName: 'MEAL-ISLAND JERK SALMON' },
        { code: '20975200000', name: 'Herb Butter Salmon',                sheetName: 'MEAL-HERB BUTTER SALMON' },
        { code: '20753500000', name: 'Roasted Garlic Lemon Pepper Beef Sirloin', sheetName: 'MEAL-RSTD GRLC LMN PEPPR BEEF SRLN-J' },
        { code: '20773600000', name: 'Italian Meatballs',                 sheetName: 'MEAL-ITALIAN MEATBALLS' },
        { code: '20785600000', name: 'Garlic Chicken Mushroom Saute',     sheetName: 'MEAL-GARLIC CHICKEN MUSHROOM SAUT-PF' }
      ]
    ]
  };

  /* ==================================================================
     DECK 3 — DAILY CHECKLIST  (source: Reference/image3.jpeg)
     ------------------------------------------------------------------
     "Team Oriented Things To Do" — the shift checklist. Kyle wants this
     as its own reference button alongside Garnish.

     Rendered as a CHECKLIST, not a static page: the numbered items are
     tickable and reset daily. The day-specific extra duty is selected
     automatically from the current weekday, which removes the "which day
     is it / which case am I doing" lookup entirely.
     ================================================================== */
  var CHECKLIST = {
    title: 'Daily Checklist',
    source: 'Reference/image3.jpeg',
    note: 'Check in with a team member after each task.',
    tasks: [
      { n: '1',   label: 'Discard Scan' },
      { n: '1.a', label: 'Thaw by Scan from yesterday' },
      { n: '2',   label: 'AM Cold Smart Sense' },
      { n: '2.a', label: '10 AM Cleaning Log' },
      { n: '3',   label: 'Fresh Trax' },
      { n: '4',   label: 'Mark Downs' },
      { n: '5',   label: 'Spot Check' },
      { n: '6',   label: 'Transfers Demo' },
      { n: '7',   label: 'PM Smart Sense' },
      { n: '8',   label: '12 PM Thaw by Spot Check' },
      { n: '9',   label: '4 PM Cleaning Log' }
    ],
    // Extra non-shift-duty specific tasks list — one per weekday.
    weekly: [
      { day: 'Monday',    task: 'Seafood Gourmet Case' },
      { day: 'Tuesday',   task: 'Ice Wedge' },
      { day: 'Wednesday', task: 'Left side of Gourmet case (chicken side)' },
      { day: 'Thursday',  task: 'Right side of gourmet case (sausage side)' },
      { day: 'Friday',    task: 'Clean Floors' }
    ],
    footer: 'Do not cross out what is not completed.'
  };

  /* Return today's extra duty, or null at the weekend. Small function,
     but it removes a daily "what day is it, what's my extra task" lookup. */
  function todaysExtraDuty(date) {
    var d = date || new Date();
    var name = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
    for (var i = 0; i < CHECKLIST.weekly.length; i++) {
      if (CHECKLIST.weekly[i].day === name) return CHECKLIST.weekly[i];
    }
    return null;
  }

  /* ==================================================================
     DECK 4 — CUTS GUIDE  (source: Reference/image4.jpeg — ONE PAGE ONLY)
     ------------------------------------------------------------------
     Sprouts "Meat Production Guide / Primal" binder page. Kyle wants a
     "Cuts Guide" button, either standalone or adjacent to recipes.

     Only ONE page has been photographed so far, so this deck is a
     SCHEMA + a single proof-of-shape entry. The rest of the binder is
     still to be shot. The structure below matches the printed page's
     own sections so transcription is mechanical once the photos land.
     ================================================================== */
  var CUTS = {
    title: 'Cuts Guide',
    source: 'Reference/image4.jpeg (Sprouts Meat Production Guide, 1 page of many)',
    note: 'Binder not yet fully photographed — one page transcribed as a shape test.',
    pages: [
      {
        name: 'Angus Beef Petite Sirloin Steaks, Boneless',
        primal: 'Beef Ball Tip',
        updated: '11/14/2023',
        production: [
          'Do not pre-trim primal.',
          'Remove fat wedge, cut steaks 1" thick from end to end.',
          'Use red trim and end pieces that don\'t qualify for steak; for stew meat, stir fry, and carne picada.',
          'Tray 1–2 steaks depending on size in a 2 tray.'
        ],
        chillDisplay: [
          'CCP — Place in cooler and bring to an internal temperature of 41°F or lower in 4 hours or less.',
          'Once product is 41°F or lower, merchandise in the self-service meat case following your store\'s current schematic.'
        ],
        tips: [
          'Combined cutting and wrapping time should not exceed 30 minutes in the cutting room.'
        ],
        safety: 'Clean and sanitize work area and equipment when changing proteins. CCP = Critical Control Point. Monitor and record temperature on food safety logs.'
      }
    ]
  };

  /* ==================================================================
     DECK 5 — CASE DIVIDERS / BARRIERS
     (source: Reference/image5.jpeg, image6.jpeg, image7.jpeg)
     ------------------------------------------------------------------
     Kyle asked for a reference on how to update the plastic dividers.
     These three photos show the beef and marinated-chicken cases with
     the clear dividers in place and the green PLU tags mounted on them.

     What the photos CONFIRM (PLU tags visible on the divider rail):
       image5/6 — beef ground & burgers run: 7071, 7070, 7539, 7540,
                  7072, 9800, 7292, 9600
       image7   — marinated run: 8235, 8343, 8246, 7074, 7547, 7073, 7635

     NOTE two PLUs here do not match the current caselayout.js:
       - 7540  appears on the rail between 7539 and 7072, but is not in
               the layout at all. Likely a second grassfed ground SKU.
       - 7292  reads as the Applewood Smoked Bacon tag; caselayout.js
               currently has 7290 for "Uncured Smokey Bacon".
       - 9600  appears on a NY strip tag; layout has 98010 grassfed strip.
     These are flagged, NOT silently applied — a wrong PLU in the layout
     is worse than a missing one, because it teaches the wrong mapping.
     ================================================================== */
  var DIVIDER_FINDINGS = [
    { plu: '7540', note: 'On the rail between 7539 and 7072. Not in caselayout.js at all.', action: 'confirm name + position' },
    { plu: '7292', note: 'Reads as Applewood Smoked Bacon. Layout currently has 7290 "Uncured Smokey Bacon".', action: 'confirm which is correct' },
    { plu: '9600', note: 'On a NY strip tag. Layout has 98010 Grassfed NY Strip.', action: 'confirm whether both exist' },
    { plu: '7635', note: 'Black Garlic Steak Kabobs — confirmed present in the marinated run.', action: 'matches layout' }
  ];


  /* ==================================================================
     GARNISH WALK ORDER
     ------------------------------------------------------------------
     Kyle's rule, confirmed 2026-08-13:

       "Front (furthest) Left to Back (Closest) and then to the right
        progress. I'd be holding the garnish tray in my hands, so just
        a single scan walking is the goal — not jumping around."

     So the walk is COLUMN-MAJOR:

         position 1        position 2        position 3
       +-------------+   +-------------+   +-------------+
   (1) | front[0]    |   | front[1]    |   | front[2]    |   <- furthest
       +-------------+   +-------------+   +-------------+
   (2) | back[0]     |   | back[1]     |   | back[2]     |   <- closest
       +-------------+   +-------------+   +-------------+
            v  ^              v  ^              v  ^
            1  2 -----------> 3  4 -----------> 5  6

     Note the terminology lines up with caselayout.js as-is: `front` is
     the customer glass (furthest from Kyle, who stands on the service
     side) and `back` is the service glass (closest). No renaming needed
     — but this comment exists because that is genuinely confusing and
     someone will second-guess it later.

     WHY DERIVE INSTEAD OF HAND-SORTING: the garnish order and the case
     layout are the same physical fact. Maintaining them as two lists
     guarantees they drift apart the first time a case gets reset. Fix
     the layout once; the garnish order follows.

     `pages` is the PAGES array from caselayout.js. That module does not
     currently export it — exposing it is a one-line change there, and
     is deliberately NOT done yet so the live count app stays untouched.
     ================================================================== */
  function buildGarnishWalk(pages, garnish) {
    garnish = garnish || GARNISH;

    // 1. Flatten the physical case into a single walk sequence, and
    //    remember where each PLU sits so garnish rows can be placed.
    var walkIndex = {};   // plu -> ordinal position in the walk
    var placement = {};   // plu -> human-readable "where am I standing"
    var step = 0;

    (pages || []).forEach(function (page) {
      if (page.type === 'garnish') return;            // skip the guide page itself
      var front = page.front || [];
      var back  = page.back  || [];
      var width = Math.max(front.length, back.length);

      for (var i = 0; i < width; i++) {
        // Furthest row first, then closest, then move right.
        [[front[i], 'front'], [back[i], 'back']].forEach(function (pair) {
          var tile = pair[0];
          if (!tile || !tile.plu) return;
          if (walkIndex[tile.plu] == null) {          // first sighting wins
            walkIndex[tile.plu] = step;
            placement[tile.plu] = {
              section: page.title,
              position: i + 1,
              row: pair[1] === 'front' ? 'far' : 'near'
            };
          }
          step++;
        });
      }
    });

    // 2. Place every garnish row onto that walk.
    var placed = [], unplaced = [];
    (garnish.groups || []).forEach(function (group) {
      (group.rows || []).forEach(function (row) {
        var entry = {
          item: row.item, garnish: row.garnish, plu: row.plu || null,
          verify: !!row.verify, group: group.heading,
          where: row.plu ? (placement[row.plu] || null) : null
        };
        if (row.plu && walkIndex[row.plu] != null) {
          entry.walk = walkIndex[row.plu];
          placed.push(entry);
        } else {
          unplaced.push(entry);                        // no PLU, or PLU not in the layout
        }
      });
    });

    placed.sort(function (a, b) { return a.walk - b.walk; });

    return {
      title: garnish.title,
      note: 'One continuous walk: far row, near row, then right.',
      source: garnish.source,
      walk: placed,
      // Surfaced, never silently dropped — an item with no case position
      // is either a layout gap or a garnish row for a case we have not
      // mapped yet (the seafood service case, as of 2026-08-13).
      unplaced: unplaced
    };
  }

  return {
    GARNISH: GARNISH,
    buildGarnishWalk: buildGarnishWalk,
    ONEPAN: ONEPAN,
    CHECKLIST: CHECKLIST,
    CUTS: CUTS,
    DIVIDER_FINDINGS: DIVIDER_FINDINGS,
    todaysExtraDuty: todaysExtraDuty
  };
});
