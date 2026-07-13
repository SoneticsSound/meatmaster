/* MeatMaster - local product seed database (Session 3)
   Source: Reference/IMG_7236.jpeg, Sprouts Production Count Sheet Report.

   The `upc` values here are the ACTUAL barcodes decoded from the count sheet
   (via backoffice/harvest_barcodes.py), not hand-transcribed digits.

   Sprouts weighed-item barcode format (EAN-13):
     0 2 IIIII X PPPP C
     │ │  │    │  │    └ check digit
     │ │  │    │  └───── 4-digit price (varies per package; 0000 on the sheet)
     │ │  │    └──────── item check digit
     │ │  └───────────── 5-digit item = "0" + 4-digit PLU   ← identifies the product
     │ └──────────────── "2" = in-store, variable weight
     └────────────────── EAN-13 leading zero
   So a real package of the same cut has a DIFFERENT full barcode (price baked in)
   but the SAME PLU. We match on the PLU and ignore the price. */

(function () {
  'use strict';

  var products = [
    { plu: '7059', upc: '0207059000009', name: 'Grassfed Angus Short Ribs', sheetName: 'SPROUTS BEEF-SHORT RIBS-ANGUS-BI-GRASS 1 LB', category: 'Beef', casePosition: 1 },
    { plu: '7271', upc: '0207271000009', name: 'Angus Boneless Chuck Roast', sheetName: 'SPROUTS BEEF-ROAST-BNLS-CHUCK-J 1 LB', category: 'Beef', casePosition: 13 },
    { plu: '7275', upc: '0207275000005', name: 'Angus Boneless Rump Roast', sheetName: 'SPROUTS BEEF-ROAST-ANGUS-BNLS-RUMP-JBS 1 LB', category: 'Beef', casePosition: 2 },
    { plu: '7277', upc: '0207277000003', name: 'Angus Stew Meat', sheetName: 'SPROUTS BEEF-ANGUS-BNLS-STEW MEAT-JBS 1 LB', category: 'Beef', casePosition: 14 },
    { plu: '7315', upc: '0207315000002', name: 'Angus Ribeye Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BLNS-RIBEYE-J 1 LB', category: 'Beef', casePosition: 3 },
    { plu: '7323', upc: '0207323000001', name: 'Angus New York Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BNLS-NEW YOR 1 LB', category: 'Beef', casePosition: 15 },
    { plu: '7331', upc: '0207331000000', name: 'Angus Tenderloin Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BL-TNDRLN-SPL 1 LB', category: 'Beef', casePosition: 4 },
    { plu: '7348', upc: '0207348000000', name: 'Angus Top Sirloin Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-TP SRLN-CH-JE 1 LB', category: 'Beef', casePosition: 16 },
    { plu: '7381', upc: '0207381000005', name: 'Angus Petite Sirloin Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BNLS-PETITE S 1 LB', category: 'Beef', casePosition: 5 },
    { plu: '7382', upc: '0207382000004', name: 'Angus Petite Sirloin Steak', sheetName: 'SPROUTS BEEF-STEAK ANGUS-BNLS-PETITE S 1 LB', category: 'Beef', casePosition: 17 },
    { plu: '7805', upc: '0207805000000', name: 'Angus London Broil Steak', sheetName: 'SPROUTS BEEF-STEAK-LONDON BROIL-ANGUS 1 LB', category: 'Beef', casePosition: 6 },
    { plu: '7813', upc: '0207813000009', name: 'Grassfed Angus Breakfast Steak', sheetName: 'SPROUTS BEEF-STEAK-BREAKFAST-ANGUS GF 1 LB', category: 'Beef', casePosition: 18 },
    { plu: '7814', upc: '0207814000008', name: 'Grassfed Angus Boneless Short Ribs', sheetName: 'SPROUTS BEEF-SHORT RIBS-BNLS-ANGUS GRA 1 LB', category: 'Beef', casePosition: 7 },
    { plu: '7899', upc: '0207899000009', name: 'Grassfed Angus Flap Meat', sheetName: 'SPROUTS BEEF-FLAP MEAT-ANGUS GRASSF 1 LB', category: 'Beef', casePosition: 19 },
    { plu: '7992', upc: '0207992000005', name: 'Grassfed Angus Tri-Tip Steak', sheetName: 'SPROUTS BEEF-STEAK-TRI TIP-ANGUS GRASS 1 LB', category: 'Beef', casePosition: 8 },
    { plu: '9918', upc: '0209918000007', name: 'Grassfed Angus Tri-Tip Roast', sheetName: 'SPROUTS BEEF-ROAST TRI-TIP-ANGUS GRASS 1 LB', category: 'Beef', casePosition: 20 },
    { plu: '9981', upc: '0209981000003', name: 'Grassfed Angus Boneless Chuck Roast', sheetName: 'SPROUTS BEEF-ROAST-CHUCK-BNLS-ANGUS GR 1 LB', category: 'Beef', casePosition: 9 },
    { plu: '9985', upc: '0209985000009', name: 'Grassfed Angus Rump Roast', sheetName: 'SPROUTS BEEF-ROAST RUMP-ANGUS GRASSFED 1 LB', category: 'Beef', casePosition: 21 },
    { plu: '9988', upc: '0209988000006', name: 'Grassfed Angus New York Steak', sheetName: 'SPROUTS BEEF-STEAK-BNLS-ANGUS GRASS 1 LB', category: 'Beef', casePosition: 10 },
    { plu: '9989', upc: '0209989000005', name: 'Grassfed Angus Ribeye Steak', sheetName: 'SPROUTS BEEF-STEAK RIBEYE-BL-ANGUS GR 1 LB', category: 'Beef', casePosition: 22 },
    { plu: '9990', upc: '0209990000001', name: 'Grassfed Angus Tenderloin Steak', sheetName: 'SPROUTS BEEF-STEAK-TENDERLOIN-ANGUS GP 1 LB', category: 'Beef', casePosition: 11 },
    { plu: '9992', upc: '0209992000009', name: 'Grassfed Angus Top Sirloin Filet', sheetName: 'SPROUTS BEEF-STEAK TOP SIRLOIN FILET-G 1 LB', category: 'Beef', casePosition: 23 },
    { plu: '9994', upc: '0209994000007', name: 'Grassfed Angus Stew Meat', sheetName: 'SPROUTS BEEF-STEW MEAT-ANGUS GRASSFED 1 LB', category: 'Beef', casePosition: 12 },
    { plu: '9996', upc: '0209996000005', name: 'Grassfed Angus Stir Fry', sheetName: 'SPROUTS BEEF-STIR FRY-ANGUS GRASSFED 1 LB', category: 'Beef', casePosition: 24 },
    // Ready-Made "One Pan Meals" — seeded from the Production Count Sheet Report (IMG_7411).
    // casePosition 101-120 follows the sheet's PLU-sorted print order.
    { plu: '7063', upc: '0020706300000', name: 'Garlic Lemon Chicken', sheetName: 'SPROUTS MEAL-GARLIC LEMON CHICKEN-PF 1 LB', category: 'Ready-Made', casePosition: 101 },
    { plu: '7114', upc: '0020711400000', name: 'Grass Fed Beef Stuffed Pepper', sheetName: 'SPROUTS MEAL-GRASS FED BEEF STUFFED PEPPER LB', category: 'Ready-Made', casePosition: 102 },
    { plu: '7286', upc: '0020728600000', name: 'Steak w/ Chimichurri', sheetName: 'SPROUTS MEAL-STEAK W/CHIMICHURRI-JBS 1 LB', category: 'Ready-Made', casePosition: 103 },
    { plu: '7294', upc: '0020729400000', name: 'Shrimp Scampi', sheetName: 'SPROUTS MEAL-SHRIMP SCAMPI 1 LB', category: 'Ready-Made', casePosition: 104 },
    { plu: '7295', upc: '0020729500000', name: 'Salmon Citrus Herb', sheetName: 'SPROUTS MEAL-SALMON CITRUS HERB 1 LB', category: 'Ready-Made', casePosition: 105 },
    { plu: '7296', upc: '0020729600000', name: 'Citrus Herb Chicken', sheetName: 'SPROUTS MEAL-CITRUS HERB CHICKEN-PF 1 LB', category: 'Ready-Made', casePosition: 106 },
    { plu: '7411', upc: '0020741100000', name: 'Black Truffle Sirloin Mushroom Saute', sheetName: 'SPROUTS MEAL-BLK TRFL SIRLOIN MSHRM SA 1 LB', category: 'Ready-Made', casePosition: 107 },
    { plu: '7455', upc: '0020745500000', name: 'Firecracker Chicken', sheetName: 'SPROUTS MEAL-FIRECRACKER CHICKEN WEST 1 LB', category: 'Ready-Made', casePosition: 108 },
    { plu: '7462', upc: '0020746200000', name: 'Firecracker Shrimp', sheetName: 'SPROUTS MEAL-FIRECRACKER SHRIMP 1 LB', category: 'Ready-Made', casePosition: 109 },
    { plu: '7492', upc: '0020749200000', name: 'Marry Me Chicken', sheetName: 'SPROUTS MEAL-MARRY ME CHICKEN - PF 1 LB', category: 'Ready-Made', casePosition: 110 },
    { plu: '7521', upc: '0020752100000', name: 'Hot Honey Chipotle Chicken', sheetName: 'MEAL-HOT HONEY CHIPOTLE CHICKE 1 LB', category: 'Ready-Made', casePosition: 111 },
    { plu: '7535', upc: '0020753500000', name: 'Rstd Garlic Lemon Pepper Beef', sheetName: 'SPROUTS MEAL-RSTD GRLC LMN PEPPR BEEF 1 LB', category: 'Ready-Made', casePosition: 112 },
    { plu: '7736', upc: '0020773600000', name: 'Italian Meatballs', sheetName: 'SPROUTS MEAL-ITALIAN MEATBALLS 1 LB', category: 'Ready-Made', casePosition: 113 },
    { plu: '7856', upc: '0020785600000', name: 'Garlic Chicken Mushrooms', sheetName: 'SPROUTS MEAL-GARLIC CHICKEN MUSHROOMS 1 LB', category: 'Ready-Made', casePosition: 114 },
    { plu: '7874', upc: '0020787400000', name: 'Chicken Fajitas', sheetName: 'SPROUTS MEAL-CHICKEN FAJITAS-PF 1 LB', category: 'Ready-Made', casePosition: 115 },
    { plu: '9126', upc: '0020912600000', name: 'Hot Honey Chipotle Salmon', sheetName: 'SPROUTS MEAL-HOT HONEY CHIPOTLE SALMON 1 LB', category: 'Ready-Made', casePosition: 116 },
    { plu: '9142', upc: '0020914200000', name: 'Cajun Butter Shrimp', sheetName: 'SPROUTS MEAL-CAJUN BUTTER SHRIMP 1 LB', category: 'Ready-Made', casePosition: 117 },
    { plu: '9752', upc: '0020975200000', name: 'Herb Butter Salmon', sheetName: 'SPROUTS MEAL-HERB BUTTER SALMON 1 LB', category: 'Ready-Made', casePosition: 118 },
    { plu: '9753', upc: '0020975300000', name: 'Herb Butter Shrimp', sheetName: 'SPROUTS MEAL-HERB BUTTER SHRIMP 1 LB', category: 'Ready-Made', casePosition: 119 },
    { plu: '9754', upc: '0020975400000', name: 'Island Jerk Salmon', sheetName: 'SPROUTS MEAL-ISLAND JERK SALMON 1 LB', category: 'Ready-Made', casePosition: 120 }
  ];

  function normalizeCode(code) {
    return String(code || '').replace(/\D/g, '');
  }

  // Pull the 4-digit PLU out of a Sprouts in-store weighed barcode, ignoring the
  // embedded price so every package of a cut maps to the same product.
  // Returns null for codes that aren't in-store weighed items (e.g. national brands).
  function extractPlu(code) {
    var d = normalizeCode(code), item = null;
    if (d.length === 13 && d.slice(0, 2) === '02') item = d.slice(2, 7);      // EAN-13 in-store
    else if (d.length === 12 && d.charAt(0) === '2') item = d.slice(1, 6);    // UPC-A in-store
    if (item === null) return null;
    return item.replace(/^0+/, '');   // "07059" -> "7059"
  }

  var STORE_KEY = 'mm.products.custom.v1';
  var custom = [];
  var byPlu = {}, byUpc = {}, allProducts = [];

  function cloneProduct(p) {
    var out = {};
    Object.keys(p || {}).forEach(function (k) { out[k] = p[k]; });
    return out;
  }

  function loadCustom() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      custom = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(custom)) custom = [];
    } catch (e) {
      custom = [];
    }
  }

  function saveCustom() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(custom)); } catch (e) {}
  }

  function productKey(p) {
    if (p.plu) return 'plu:' + String(p.plu).replace(/^0+/, '');
    if (p.upc) return 'upc:' + normalizeCode(p.upc);
    return 'name:' + String(p.name || '').toLowerCase();
  }

  function rebuild() {
    byPlu = {};
    byUpc = {};
    var merged = {};
    products.forEach(function (p) { merged[productKey(p)] = cloneProduct(p); });
    custom.forEach(function (p) {
      var c = cloneProduct(p);
      c.isCustom = true;
      merged[productKey(c)] = c;
    });
    allProducts = Object.keys(merged).map(function (k) { return merged[k]; }).sort(function (a, b) {
      var ap = Number(a.casePosition || 9999), bp = Number(b.casePosition || 9999);
      if (ap !== bp) return ap - bp;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    allProducts.forEach(function (p) {
      if (p.plu) byPlu[String(p.plu).replace(/^0+/, '')] = p;
      if (p.upc) byUpc[normalizeCode(p.upc)] = p;
    });
  }

  function upsertCustom(product) {
    var p = cloneProduct(product);
    if (!p.name) return null;
    if (p.plu) p.plu = String(p.plu).replace(/^0+/, '');
    if (p.upc) p.upc = normalizeCode(p.upc);
    p.updatedAt = new Date().toISOString();
    var key = productKey(p), replaced = false;
    custom = custom.map(function (existing) {
      if (productKey(existing) === key) {
        replaced = true;
        return p;
      }
      return existing;
    });
    if (!replaced) custom.push(p);
    saveCustom();
    rebuild();
    window.MMProducts.all = allProducts;
    return findByCode(p.upc) || (p.plu ? findByPlu(p.plu) : p);
  }

  function findByPlu(plu) {
    return byPlu[String(plu).replace(/^0+/, '')] || null;
  }

  function findByCode(code) {
    var n = normalizeCode(code);
    if (byUpc[n]) return byUpc[n];               // exact match (fixed-price items)
    var plu = extractPlu(n);                      // weighed item -> match by PLU
    if (plu && byPlu[plu]) return byPlu[plu];
    return null;
  }

  loadCustom();
  rebuild();

  window.MMProducts = {
    all: allProducts,
    save: upsertCustom,
    refresh: function () {
      loadCustom();
      rebuild();
      this.all = allProducts;
      return allProducts;
    },
    extractPlu: extractPlu,
    findByPlu: findByPlu,
    findByCode: findByCode
  };
})();
