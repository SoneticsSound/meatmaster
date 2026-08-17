/* MeatMaster — Gourmet Seafood Case Schematic (OFFICIAL)
   ==================================================================
   Source: printed planogram photographed 2026-08-13
     "Schematic Name - GOURMET SEAFOOD  08FT  PACIFIC SO CAL  00700090"
     Live - [LiveDate]   |   Page 1 of 3

   THIS IS THE REAL THING. Everything in caselayout.js's seafood pages
   was transcribed by eye from case photos; this is the corporate
   planogram. Where they disagree, THIS WINS.

   Two rows of tiles separated by the black divider bar on the printout.
   Each tile carries the schematic name and the 11-digit item code.

   PLUs below are DERIVED, not guessed — using the formula found in
   Fresh-Trax PLU Bar Codes Ground Beef.xlsx:

       item code = "20" + PLU + "00000"

   So 20917300000 -> PLU 9173. Every one of the 29 tiles fits that
   pattern exactly, which is itself strong confirmation the formula is
   right: a wrong rule would produce nonsense on at least a few.
   ================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MMSeafoodSchematic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Derive the 4-digit PLU from an 11-digit schematic item code. */
  function pluFromCode(code) {
    var m = String(code).match(/^20(\d{4})00000$/);
    return m ? m[1] : null;
  }

  /* ROW A and ROW B as printed, in the sheet's own left-to-right order.

     ORIENTATION CAVEAT: the printout was photographed rotated, so while
     the SEQUENCE is certain, which physical end of the case is "left"
     is not. Both rows are stored in the same direction as each other,
     so if the sequence turns out reversed, reversing both fixes it —
     the pairing stays correct either way.

     Which row is the far (customer-glass) row and which is the near
     (service) row also needs a look at the case. Marked TODO rather
     than guessed, because guessing here silently produces a mirrored
     layout that looks plausible and is wrong. */
  var ROW_A = [
    { code: '20917300000', name: 'SALMON-ATLANTIC-GARLIC LEMON PEPPER',   friendly: 'Garlic Lemon Pepper Atlantic Salmon' },
    { code: '20958700000', name: 'SALMON-CITRUS LEMON-6 OZ-PORTION-FRM',  friendly: 'Citrus Lemon Salmon Portion' },
    { code: '20912800000', name: 'SALMON-ATLANTIC-HOT HONEY CHIPOTLE',    friendly: 'Hot Honey Chipotle Salmon' },
    { code: '20903800000', name: 'SALMON-WILD-ALASKAN-BLACK GARLIC-PF',   friendly: 'Black Garlic Wild Salmon' },
    { code: '20904000000', name: 'TUNA-AHI-5-8 LOIN-BLACK GARLIC',        friendly: 'Black Garlic Ahi Tuna Loin' },
    { code: '20926800000', name: 'SHRIMP-SKEWER-PD-CAJUN BUTTER 275OZ',   friendly: 'Cajun Butter Shrimp Skewer' },
    { code: '20902200000', name: 'SHRIMP-COOKED-16-20CT-FARMED-P-F',      friendly: 'Cooked Shrimp 16/20' },
    { code: '20931000000', name: 'SHRIMP-RAW-16-20CT-FARM-EZP-P-F',       friendly: 'Raw Shrimp 16/20 EZ-Peel' },
    { code: '20930100000', name: 'LOBSTER-TAIL-CLD WTR-WILD-375OZ-P-F',   friendly: 'Cold Water Lobster Tail' },
    { code: '20905300000', name: 'TUNA-AHI-WILD-P-F',                     friendly: 'Wild Ahi Tuna' },
    { code: '20904300000', name: 'SWORDFISH-STEAK-WILD-P-F',              friendly: 'Wild Swordfish Steak' },
    { code: '20913300000', name: 'COD-ALASKA-PORTIONS-WILD-FROZEN',       friendly: 'Alaska Cod Portions' },
    { code: '20916700000', name: 'TROUT-STEELHEAD-FILLET-FARM-FRESH',     friendly: 'Steelhead Trout Fillet' },
    { code: '20946000000', name: 'SALMON-ATLNTC-PORTION-6OZ-FARM-FRESH',  friendly: 'Atlantic Salmon Portion 6oz' },
    { code: '20914400000', name: 'SALMON-ATLANTC-FILLET-FARM-FRESH-1LB',  friendly: 'Atlantic Salmon Fillet 1lb',
      wide: true, note: 'Printed as a double-width tile at the end of the run.' }
  ];

  var ROW_B = [
    { code: '20963300000', name: 'SALMON-BOURBON-6 OZ-PORTION',           friendly: 'Bourbon Salmon Portion',
      absent: true, note: 'On the official planogram but NOT physically in Kyle\'s case (confirmed 2026-08-16). Physical case is canon.' },
    { code: '20953200000', name: 'SALMON-ATLANTIC-BLACK GARLIC-FRESH',    friendly: 'Black Garlic Salmon Portion' },
    { code: '20916500000', name: 'SALMON-ALASKAN-PRTN-WILD-PF-CHIMICH',   friendly: 'Red Chimichurri Salmon' },
    { code: '20910500000', name: 'SLMON-WLD-ALSKN-RSTD GRLC LMN PPR-PF',  friendly: 'Lemon Pepper Garlic Salmon' },
    { code: '20941300000', name: 'BARRAMUNDI-BLK GARLIC MRNTD-PORTIONS',  friendly: 'Black Garlic Barramundi', highlighted: true },
    { code: '20917500000', name: 'SHRIMP-SKEWER-PDTO-GARLIC LEMON PEPR',  friendly: 'Garlic Lemon Pepper Shrimp Skewer', highlighted: true },
    { code: '20936700000', name: 'SHRIMP-RAW-16-20CT-WILD-P-F',           friendly: 'Raw Wild Shrimp 16/20' },
    { code: '20931200000', name: 'SHRIMP-RAW-16-20CT-PDTO-FARMED-PF',     friendly: 'Raw Farmed Shrimp 16/20' },
    { code: '20913200000', name: 'SCALLOPS-SELECT-SEA-10-20 CT-PREV FZ',  friendly: 'Sea Scallops 10/20', highlighted: true },
    { code: '20950400000', name: 'POKE-TUNA-AHI-MARINATED-READY TO EAT',  friendly: 'Ahi Tuna Poke', highlighted: true },
    { code: '20911600000', name: 'MAHI MAHI-FILLET-WILD-P-F',             friendly: 'Wild Mahi Mahi Fillet' },
    { code: '20910900000', name: 'HALIBUT-PORTIONS-6OZ-WILD-FRESH',       friendly: 'Wild Halibut Portions' },
    { code: '20918000000', name: 'TILAPIA-FILLET-FARM-FRESH',             friendly: 'Tilapia Fillet' },
    { code: '20914500000', name: 'SALMON-SOCKEYE-FILLET-WILD-P-F',        friendly: 'Wild Sockeye Salmon Fillet' }
  ];

  // Attach derived PLUs.
  [ROW_A, ROW_B].forEach(function (row) {
    row.forEach(function (t) { t.plu = pluFromCode(t.code); });
  });

  var SCHEMATIC = {
    title: 'Gourmet Seafood Case',
    schematicName: 'GOURMET SEAFOOD 08FT PACIFIC SO CAL',
    schematicId: '00700090',
    page: '1 of 3',
    source: 'Printed planogram, photographed 2026-08-13',
    rowA: ROW_A,
    rowB: ROW_B,
    // TODO(kyle): confirm which printed row is the FAR (customer glass)
    // row and which is the NEAR (service) row, and which end is the
    // customer's left. See the orientation caveat above.
    rowsResolved: false
  };

  /* ==================================================================
     RECONCILIATION vs the photo-derived caselayout.js
     ------------------------------------------------------------------
     The schematic CONFIRMS 20 of the PLUs I transcribed from photos,
     which is a good result for eyeball work. It also corrects two and
     adds eight that were never in the layout at all.
     ================================================================== */
  var RECONCILIATION = {
    confirmed: ['9145', '9180', '9132', '9109', '9413', '9367', '9144',
                '9460', '9043', '9053', '9504', '9165', '9105', '9532',
                '9310', '9040', '9038', '9128'],

    corrections: [
      { was: '9567', now: '9167', item: 'Steelhead Trout Fillet',
        why: 'Schematic reads TROUT-STEELHEAD-FILLET-FARM-FRESH 20916700000. The 5 was a photo misread.' },
      { was: '9587 "Lemon Pepper Steelhead"', now: '9587 "Citrus Lemon Salmon Portion"', item: 'PLU 9587',
        why: 'PLU was right, NAME was wrong. Schematic reads SALMON-CITRUS LEMON-6 OZ-PORTION-FRM — it is salmon, not steelhead.' }
    ],

    // In the old layout but NOT on this schematic page. Could be on
    // page 2 or 3, could be discontinued. Not deleted — flagged.
    unaccounted: [
      { plu: '9056', item: 'Wild Cod Fillet',
        note: 'Schematic has COD-ALASKA-PORTIONS 9133 instead. Portions vs fillet may be different SKUs, or 9056 is stale.' }
    ],

    // On the schematic, never in the layout. These are real case
    // positions the app has been blind to.
    newToUs: ['9173', '9268', '9022', '9301', '9633', '9175', '9312', '9116']
  };

  /* The printout carries yellow highlighter on four ROW_B tiles:
     Barramundi, Garlic Lemon Pepper Shrimp Skewer, Sea Scallops, and
     Ahi Tuna Poke. Marked `highlighted: true` above.

     What the highlight MEANS is unknown — could be value-added items,
     items Kyle is responsible for, recent adds, or items needing a
     garnish. Recorded rather than interpreted. */

  return {
    SCHEMATIC: SCHEMATIC,
    RECONCILIATION: RECONCILIATION,
    pluFromCode: pluFromCode
  };
});
