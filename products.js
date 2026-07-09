/* MeatMaster - local product seed database (Session 3)
   Source: Reference/IMG_7236.jpeg, Sprouts Production Count Sheet Report.
   This file is deliberately plain JS so the app has no build step and works offline. */

(function () {
  'use strict';

  var products = [
    { plu: '7059', upc: '0020705900009', name: 'Grassfed Angus Short Ribs', sheetName: 'SPROUTS BEEF-SHORT RIBS-ANGUS-BI-GRASS 1 LB', category: 'Beef', casePosition: 1, source: 'IMG_7236.jpeg' },
    { plu: '7271', upc: '0020727100005', name: 'Angus Boneless Chuck Roast', sheetName: 'SPROUTS BEEF-ROAST-BNLS-CHUCK-J 1 LB', category: 'Beef', casePosition: 2, source: 'IMG_7236.jpeg' },
    { plu: '7275', upc: '0020727500003', name: 'Angus Boneless Rump Roast', sheetName: 'SPROUTS BEEF-ROAST-ANGUS-BNLS-RUMP-JBS 1 LB', category: 'Beef', casePosition: 3, source: 'IMG_7236.jpeg' },
    { plu: '7277', upc: '0020727700007', name: 'Angus Stew Meat', sheetName: 'SPROUTS BEEF-ANGUS-BNLS-STEW MEAT-JBS 1 LB', category: 'Beef', casePosition: 4, source: 'IMG_7236.jpeg' },
    { plu: '7315', upc: '0020731500006', name: 'Angus Ribeye Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BLNS-RIBEYE-J 1 LB', category: 'Beef', casePosition: 5, source: 'IMG_7236.jpeg' },
    { plu: '7323', upc: '0020732300001', name: 'Angus New York Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BNLS-NEW YOR 1 LB', category: 'Beef', casePosition: 6, source: 'IMG_7236.jpeg' },
    { plu: '7331', upc: '0020733100006', name: 'Angus Tenderloin Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BL-TNDRLN-SPL 1 LB', category: 'Beef', casePosition: 7, source: 'IMG_7236.jpeg' },
    { plu: '7348', upc: '0020734800004', name: 'Angus Top Sirloin Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-TP SRLN-CH-JE 1 LB', category: 'Beef', casePosition: 8, source: 'IMG_7236.jpeg' },
    { plu: '7381', upc: '0020738100001', name: 'Angus Petite Sirloin Steak', sheetName: 'SPROUTS BEEF-STEAK-ANGUS-BNLS-PETITE S 1 LB', category: 'Beef', casePosition: 9, source: 'IMG_7236.jpeg' },
    { plu: '7382', upc: '0020738200008', name: 'Angus Petite Sirloin Steak', sheetName: 'SPROUTS BEEF-STEAK ANGUS-BNLS-PETITE S 1 LB', category: 'Beef', casePosition: 10, source: 'IMG_7236.jpeg' },
    { plu: '7805', upc: '0020780500002', name: 'Angus London Broil Steak', sheetName: 'SPROUTS BEEF-STEAK-LONDON BROIL-ANGUS 1 LB', category: 'Beef', casePosition: 11, source: 'IMG_7236.jpeg' },
    { plu: '7813', upc: '0020781300007', name: 'Grassfed Angus Breakfast Steak', sheetName: 'SPROUTS BEEF-STEAK-BREAKFAST-ANGUS GF 1 LB', category: 'Beef', casePosition: 12, source: 'IMG_7236.jpeg' },
    { plu: '7814', upc: '0020781400004', name: 'Grassfed Angus Boneless Short Ribs', sheetName: 'SPROUTS BEEF-SHORT RIBS-BNLS-ANGUS GRA 1 LB', category: 'Beef', casePosition: 13, source: 'IMG_7236.jpeg' },
    { plu: '7899', upc: '0020789900001', name: 'Grassfed Angus Flap Meat', sheetName: 'SPROUTS BEEF-FLAP MEAT-ANGUS GRASSF 1 LB', category: 'Beef', casePosition: 14, source: 'IMG_7236.jpeg' },
    { plu: '7922', upc: '0020792200006', name: 'Grassfed Angus Tri-Tip Steak', sheetName: 'SPROUTS BEEF-STEAK-TRI TIP-ANGUS GRASS 1 LB', category: 'Beef', casePosition: 15, source: 'IMG_7236.jpeg' },
    { plu: '9918', upc: '0020991800007', name: 'Grassfed Angus Tri-Tip Roast', sheetName: 'SPROUTS BEEF-ROAST TRI-TIP-ANGUS GRASS 1 LB', category: 'Beef', casePosition: 16, source: 'IMG_7236.jpeg' },
    { plu: '9981', upc: '0020998100001', name: 'Grassfed Angus Boneless Chuck Roast', sheetName: 'SPROUTS BEEF-ROAST-CHUCK-BNLS-ANGUS GR 1 LB', category: 'Beef', casePosition: 17, source: 'IMG_7236.jpeg' },
    { plu: '9985', upc: '0020998500009', name: 'Grassfed Angus Rump Roast', sheetName: 'SPROUTS BEEF-ROAST RUMP-ANGUS GRASSFED 1 LB', category: 'Beef', casePosition: 18, source: 'IMG_7236.jpeg' },
    { plu: '9988', upc: '0020998800000', name: 'Grassfed Angus New York Steak', sheetName: 'SPROUTS BEEF-STEAK-BNLS-ANGUS GRASS 1 LB', category: 'Beef', casePosition: 19, source: 'IMG_7236.jpeg' },
    { plu: '9989', upc: '0020998900007', name: 'Grassfed Angus Ribeye Steak', sheetName: 'SPROUTS BEEF-STEAK RIBEYE-BL-ANGUS GR 1 LB', category: 'Beef', casePosition: 20, source: 'IMG_7236.jpeg' },
    { plu: '9990', upc: '0020999000003', name: 'Grassfed Angus Tenderloin Steak', sheetName: 'SPROUTS BEEF-STEAK-TENDERLOIN-ANGUS GP 1 LB', category: 'Beef', casePosition: 21, source: 'IMG_7236.jpeg' },
    { plu: '9992', upc: '0020999200007', name: 'Grassfed Angus Top Sirloin Filet', sheetName: 'SPROUTS BEEF-STEAK TOP SIRLOIN FILET-G 1 LB', category: 'Beef', casePosition: 22, source: 'IMG_7236.jpeg' },
    { plu: '9994', upc: '0020999400001', name: 'Grassfed Angus Stew Meat', sheetName: 'SPROUTS BEEF-STEW MEAT-ANGUS GRASSFED 1 LB', category: 'Beef', casePosition: 23, source: 'IMG_7236.jpeg' },
    { plu: '9996', upc: '0020999600005', name: 'Grassfed Angus Stir Fry', sheetName: 'SPROUTS BEEF-STIR FRY-ANGUS GRASSFED 1 LB', category: 'Beef', casePosition: 24, source: 'IMG_7236.jpeg' }
  ];

  function normalizeCode(code) {
    return String(code || '').replace(/\D/g, '');
  }

  var byUpc = {};
  products.forEach(function (p) {
    byUpc[normalizeCode(p.upc)] = p;
    if (p.upc.length === 13 && p.upc.charAt(0) === '0') {
      byUpc[p.upc.slice(1)] = p;
    }
  });

  window.MMProducts = {
    all: products,
    findByCode: function (code) {
      return byUpc[normalizeCode(code)] || null;
    }
  };
})();
