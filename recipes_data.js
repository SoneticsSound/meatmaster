/* MeatMaster - One Pan Meal recipe data (GENERATED - do not hand-edit)
   ==================================================================
   Source: Reference/Meat Production Manual - One Pan Meals
           FINAL PRINT FILE 07 20 26.pdf
   21 cards | 112 ingredients | production steps | 21 hero photos

   VALIDATION: every ingredient printing BOTH a total and a per-tray
   amount was checked as total/yield == printed per-tray. 28 of 28
   matched. Nothing here was typed by hand.

   STEPS were the hard part. The cards print production steps in TWO
   COLUMNS whose gutter sits at a different x on nearly every page, so
   a fixed split garbled them (steps interleaved, sentences truncated).
   The extractor now finds the boundary from each page's own step
   numbers - specifically the LEFT EDGE of the right-hand column, since
   the midpoint between the two columns falls inside the left column's
   wrapped text. 20 of 21 cards come out strictly sequential.

   TARGET WEIGHT - Kyle, 2026-08-13: "Recipe card for target weight per
   pan, that's what I use/go by." targetWeightLb is ALWAYS the card's
   number. Where Tab 1's cheat sheet disagrees (6 items) that value is
   kept in targetWeightCheatSheetLb only so the discrepancy stays
   visible. It is never used.

   PLU - Kyle: "List all three PLU variants for safety." `plu` is the
   West value (JBS beef / Pitman chicken) but allPlus carries every
   variant, so a Perdue or Smart delivery is recognised instead of
   coming up as an unknown scan.

   SHELF LIFE uses the Code Dating Guidelines (8.12.26), not the card
   (07 20 26) - newer AND shorter, the only defensible default on a
   food-safety call. shelfLifeCard preserves what the card claimed.
   ================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MMRecipeData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RECIPES = [
    {
      id: "fajita-vegetable-blend",
      name: "Fajita Vegetable Blend",
      page: 19,
      plu: null,
      pluBySupplier: {},
      allPlus: [],
      image: "img/meals/fajita-vegetable-blend.jpg",
      subRecipe: true,
      yield: { qty: 4, unit: "Chicken Fajita Meals", items: 4 },
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: null,
      ingredients: [
        { name: "Red Bell Peppers, 1\u20444\" strips", qty: 1.0, unit: "lb", note: " or 3 ea. large", raw: "3 ea. large or 1.0 lb." },
        { name: "Green Bell Peppers, 1\u20444\" strips", qty: 1.0, unit: "lb", note: " or 3 ea. large", raw: "3 ea. large or 1.0 lb." },
        { name: "Red Onion, 1\u20444\" slices", qty: 1.0, unit: "lb", note: " or 2 ea. large", raw: "2 ea. large or 1.0 lb." }
      ],
      steps: [
        "Cut off ends, remove stem. Clean & remove seeds & membrane. Cut entire pepper (top + bottom + middle) lengthwise into 1/4\" strips.",
        "Cut ends off onion, peel outer layer & cut onion in half top to bottom. Cut into 1/4\" slices. use* (CCP).",
        "Mix: All cut veg + cool to 41\u00b0F or lower before"
      ]
    },
    {
      id: "rglp-sirloin-bell-pepper-saut\u00e9",
      name: "RGLP Sirloin & Bell Pepper Saut\u00e9",
      page: 23,
      plu: "7535",
      pluBySupplier: {"jbs": "7535", "national": "7537"},
      allPlus: ["7535", "7537"],
      image: "img/meals/rglp-sirloin-and-bell-pepper-saute.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 1.31,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Top Sirloin", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per tray)" },
        { name: "Roasted Garlic Lemon Pepper Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Green Bell Peppers", qty: 16.0, unit: "oz", perTray: 4.0, perTrayUnit: "oz", raw: "16 oz. (4 oz. per tray)" },
        { name: "White Onion", qty: 10.0, unit: "oz", perTray: 2.5, perTrayUnit: "oz", raw: "10 oz. (2.5 oz. per tray)" },
        { name: "Fresh Lemon, quartered", qty: 1.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "1 ea. (1 wedge per tray)" },
        { name: "Cracked Pepper Blend", qty: 1.0, unit: "oz", perTray: 2.0, perTrayUnit: "tsp", raw: "1 oz. (2 teaspoons per meal)" }
      ],
      steps: [
        "Cut sirloin into 1 1/2\" - 2\" pieces. Dice bell peppers and onions into 1\" dice, quarter the lemon.",
        "Mix Sirloin (3 lbs.) + 1 ea. marinade in a clean & sanitized mixing bowl.",
        "Mix 12 oz. marinated sirloin + 4 oz. bell peppers + 2.5 oz. onions in a clean & sanitized mixing bowl.",
        "Fill 4 small (22 oz.) trays with 19.75 oz. mixed product. Top each meal with 2 teaspoons pepper blend + 1 lemon wedge.",
        "Place lid on meal and label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "black-truffle-sirloin-steak-mushrooms",
      name: "Black Truffle Sirloin Steak & Mushrooms",
      page: 25,
      plu: "7411",
      pluBySupplier: {"jbs": "7411", "national": "7386"},
      allPlus: ["7386", "7411"],
      image: "img/meals/black-truffle-sirloin-steak-and-mushroom.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 1.23,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Grain-Fed Top Sirloin, 2\" pieces", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Truffle Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Asparagus, 2\" long pieces", qty: 16.0, unit: "oz", perTray: 4.0, perTrayUnit: "oz", raw: "16 oz. (4 oz. per meal)" },
        { name: "Baby Bella Mushrooms, quartered", qty: 10.0, unit: "oz", perTray: 2.5, perTrayUnit: "oz", raw: "10 oz. (2.5 oz. per meal)" }
      ],
      steps: [
        "Cut sirloin into 2\" pieces. Cut fibrous ends from asparagus, cut into 2\" long pieces.",
        "Mix sirloin (3 lbs.) + 1 ea. truffle marinade in a clean & sanitized mixing bowl.",
        "Mix 12 oz. marinated sirloin + 4 oz. asparagus + 2.5 oz. mushrooms in a clean & sanitized mixing bowl.",
        "Fill 4 small (22 oz.) trays with",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic.",
        "75 oz. mixed product."
      ]
    },
    {
      id: "chimichurri-flap-steak",
      name: "Chimichurri Flap Steak",
      page: 27,
      plu: "7286",
      pluBySupplier: {"jbs": "7286", "national": "7394"},
      allPlus: ["7286", "7394"],
      image: "img/meals/chimichurri-flap-steak.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.7,  targetWeightCheatSheetLb: 1.75,  // cheat sheet disagrees; card wins
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Grilled Vegetable Kit (#70013661)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Mini Peppers", qty: 18.0, unit: "ea", perTray: 4.5, perTrayUnit: "ea", note: "4-5 per meal", raw: "4 - 5 ea. per meal" },
        { name: "\u2022 Zucchini, quartered", qty: 10.0, unit: "ea", perTray: 2.5, perTrayUnit: "ea", note: "2-3 per meal", raw: "2 - 3 quarters per meal" },
        { name: "\u2022 Red Onion, 1\u20444\" slices", qty: 10.0, unit: "ea", perTray: 2.5, perTrayUnit: "ea", note: "2-3 per meal", raw: "2 -3 slices per meal" },
        { name: "\u2022 Lemon, quartered", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "Grain-Fed Flap Meat", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Wild Garlic Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Cut zucchini into 4 equal pieces, cut red onion into 1/4\" slices, cut lemons into fourths.",
        "Mix flap meat (3 lbs.) + 1 ea. wild garlic marinade in a clean & sanitized mixing bowl.",
        "Right side: Fill 4 large family trays with 12 oz. marinated meat.",
        "Left Side: 2 - 3 zucchini + 2 -3 onion slices + 4 - 5 peppers (13 oz. veg) garnish with 1 lemon wedge.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "grass-fed-beef-stuffed-peppers",
      name: "Grass-Fed Beef Stuffed Peppers",
      page: 29,
      plu: "7114",
      pluBySupplier: {"default": "7114"},
      allPlus: ["7114"],
      image: "img/meals/grassfed-beef-stuffed-peppers.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.9,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Stuffed Pepper Kit (#7008787)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Brown Rice", qty: 20.0, unit: "oz", raw: "20 oz." },
        { name: "\u2022 Shredded Kale", qty: 8.0, unit: "oz", raw: "8 oz." },
        { name: "\u2022 Shredded Mozzarella", qty: 6.0, unit: "oz", raw: "6 oz." },
        { name: "\u2022 Shredded Parmesan, set aside", qty: 4.0, unit: "oz", raw: "4 oz." },
        { name: "85/15 Grass-Fed Ground Beef", qty: 24.0, unit: "oz", raw: "24 oz." },
        { name: "3 Onion Concentrate", qty: 1.0, unit: "ea", note: "14 oz. pouch", raw: "1 ea. (14 oz. pouch)" },
        { name: "Green Bell Peppers, halved & seeded", qty: 4.0, unit: "ea", raw: "4 ea." },
        { name: "Yellow Bell Peppers, halved & seeded", qty: 2.0, unit: "ea", raw: "2 ea." }
      ],
      steps: [
        "Halve peppers, remove seeds & membrane keeping stems intact. Set aside.",
        "Mix all kit ingredients (excluding parmesan) + beef (24 oz.) + 1 ea. onion concentrate in a clean & sanitized mixing bowl.",
        "Fill halved peppers with 6 oz. beef mixture, mounding slightly.",
        "Fill 4 large family trays with 3 stuffed peppers and evenly top with Parmesan cheese.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "italian-meatballs",
      name: "Italian Meatballs",
      page: 31,
      plu: "7736",
      pluBySupplier: {"default": "7736"},
      allPlus: ["7736"],
      image: "img/meals/italian-meatballs.jpg",
      subRecipe: false,
      yield: { qty: 7, unit: "Trays", items: 7 },
      targetWeightLb: 0.9,
      shelfLifeDays: 3,
      shelfLifeSource: "Meat One Pan Meals - Ground Beef",
      shelfLifeCard: 3,
      ingredients: [
        { name: "80/20 Chuck Brisket Blend Loaf", qty: 5.0, unit: "lb", raw: "5 lbs." },
        { name: "3 Onion Concentrate", qty: 1.0, unit: "ea", note: "14 oz. pouch", raw: "1 ea. (14 oz. pouch)" },
        { name: "Kikkoman 8 oz. Panko Breadcrumbs", qty: 5.0, unit: "oz", raw: "5 oz." },
        { name: "Grated Parmesan Cheese, (Deli Transfer)", qty: 3.0, unit: "oz", note: "1 Tbsp. garnish per tray", raw: "3 oz. + (1 Tbsp. garnish per tray)" },
        { name: "Sprouts Salt Free Italian Seasoning", qty: 2.0, unit: "tbsp", raw: "2 tablespoons" }
      ],
      steps: [
        "In a clean & sanitized mixing bowl, combine 5 lbs. beef + 1 ea. onion concentrate + 5 oz. panko + 3 oz. parmesan + 2 tbsp. Italian seasoning, mix well.",
        "Portion 43 meatballs with a blue disher, leveled.",
        "Fill 7 small (22 oz.) trays with 6 (2.4 oz.) meatballs + 1 tbsp. grated Parmesan & chopped parsley garnish per tray.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "chicken-fajitas",
      name: "Chicken Fajitas",
      page: 35,
      plu: "7874",
      pluBySupplier: {"pitman": "7874", "perdue": "7031", "smart": "7498"},
      allPlus: ["7031", "7498", "7874"],
      image: "img/meals/chicken-fajitas.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.6,  targetWeightCheatSheetLb: 1.5,  // cheat sheet disagrees; card wins
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Boneless Skinless NAE Chicken Breasts, cut in strips", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Fajita Veg Blend, (refer to production guide)", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Red Chimichurri Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Lime, halved", qty: 2.0, unit: "ea", note: "1/2 lime per meal", raw: "2 ea. (1/2 lime per meal)" }
      ],
      steps: [
        "Gather prepped fajita veg blend (3 lbs.) and mix well in a clean & sanitized mixing bowl.",
        "Cut chicken (3 lbs. ) into 3\"x 1/3\" strips and mix with 1 ea. red chimichurri marinade in a clean & sanitized mixing bowl.",
        "Right side: In 4 large family trays place 12 oz. marinated chicken.",
        "Left side: 12 oz. veg. blend + 1 ea. halved lime + chopped cilantro garnish on chicken.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "citrus-herb-chicken",
      name: "Citrus Herb Chicken",
      page: 37,
      plu: "7296",
      pluBySupplier: {"pitman": "7296", "perdue": "7033", "smart": "7499"},
      allPlus: ["7033", "7296", "7499"],
      image: "img/meals/citrus-herb-chicken.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.7,  targetWeightCheatSheetLb: 1.75,  // cheat sheet disagrees; card wins
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Grilled Vegetable Kit (#70013661)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Mini Peppers", qty: 18.0, unit: "ea", perTray: 4.5, perTrayUnit: "ea", note: "4-5 per meal", raw: "4 - 5 ea. per meal" },
        { name: "\u2022 Zucchini, quartered", qty: 10.0, unit: "ea", perTray: 2.5, perTrayUnit: "ea", note: "2-3 per meal", raw: "2 - 3 quarters per meal" },
        { name: "\u2022 Red Onion, 1\u20444\" round slices", qty: 10.0, unit: "ea", perTray: 2.5, perTrayUnit: "ea", note: "2-3 per meal", raw: "2 -3 slices per meal" },
        { name: "\u2022 Lemon, quartered", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "Boneless Skinless NAE Chicken Breast, thin sliced", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Citrus & Lemon Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Cut zucchini into 4 equal pieces, cut red onions into 1/4\" slices, cut lemons into fourths, slice breasts thinly in half.",
        "Mix cutlets (3 lbs.) + 1 ea. citrus marinade in a clean & sanitized mixing bowl.",
        "Right side: Fill 4 large family trays with 12 oz. marinated chicken.",
        "Left side: 2 - 3 zucchini + 2 -3 onion slices + 4 - 5 peppers (13 oz. veg) +1 lemon wedge per tray.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "garlic-lemon-chicken",
      name: "Garlic & Lemon Chicken",
      page: 39,
      plu: "7063",
      pluBySupplier: {"pitman": "7063", "perdue": "7065", "smart": "7506"},
      allPlus: ["7063", "7065", "7506"],
      image: "img/meals/garlic-and-lemon-chicken.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.6,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Scampi Kit (#7007905)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Asparagus", qty: 12.0, unit: "oz", raw: "12 oz." },
        { name: "\u2022 Grape Tomatoes", qty: 20.0, unit: "oz", raw: "20 oz." },
        { name: "\u2022 Roasted Garlic Cloves", qty: 6.0, unit: "oz", raw: "6 oz." },
        { name: "Citrus & Lemon Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Garlic Butter Dollop, frozen", qty: 4.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "4 ea. (1 ea. per meal)" },
        { name: "Lemon, quartered", qty: 1.0, unit: "ea", raw: "1 ea." }
      ],
      steps: [
        "Cut 3 lbs. chicken into 3\"x1/3\" strips and mix with 1 ea. citrus lemon marinade in a clean & sanitized mixing bowl.",
        "Fill 4 large family trays with 12 oz. marinated chicken + 4 oz. asparagus + 5 oz. tomatoes.",
        "Mix marinated chicken + veg in EACH tray.",
        "Garnish 1 butter dollop + 1 oz. garlic cloves + 1 lemon wedge.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "black-garlic-mushroom-chicken-saut\u00e9",
      name: "Black Garlic & Mushroom Chicken Saut\u00e9",
      page: 41,
      plu: "7856",
      pluBySupplier: {"pitman": "7856", "perdue": "8484", "smart": "7505"},
      allPlus: ["7505", "7856", "8484"],
      image: "img/meals/black-garlic-and-mushroom-chicken-saute.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 1.07,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Boneless Skinless NAE Chicken Thighs, 2\" pieces", qty: 3.0, unit: "lb", raw: "3 lbs." },
        { name: "Black Garlic Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Baby Bella Mushrooms, 1\u20444\" slices", qty: 1.0, unit: "lb", raw: "1 lb." }
      ],
      steps: [
        "Cut 3 lb. boneless skinless thighs into 2\" pieces, cut 1 lb. mushrooms into 1/4\" slices.",
        "Mix chicken (3 lbs.) + mushrooms (1 lb.) + 1 ea. black garlic marinade in a clean & sanitized mixing bowl.",
        "Fill 4 small (22 oz.) trays with approx. 1 lb. chicken mixture + chopped parsley garnish.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "firecracker-chicken",
      name: "Firecracker Chicken",
      page: 43,
      plu: "7455",
      pluBySupplier: {"pitman": "7455", "perdue": "7453", "smart": "7458"},
      allPlus: ["7453", "7455", "7458"],
      image: "img/meals/firecracker-chicken.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.5,  targetWeightCheatSheetLb: 1.6,  // cheat sheet disagrees; card wins
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Firecracker Kit (#70013657)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Red Bell Peppers, 1\u20444\" strips", qty: 16.0, unit: "oz", perTray: 4.0, perTrayUnit: "oz", raw: "16 oz. (4 oz. per meal)" },
        { name: "\u2022 Broccoli Florets", qty: 14.0, unit: "oz", perTray: 3.5, perTrayUnit: "oz", raw: "14 oz. (3.5 oz. per meal)" },
        { name: "\u2022 Hot Honey Glaze Pouch", qty: 16.0, unit: "oz", raw: "16 oz." },
        { name: "Boneless Skinless NAE Chicken Thighs, cut in strips", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Korean BBQ Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Cut bell peppers into 1/4\" strips, cut 3 lbs. thighs into 3\" x 1/3\" strips. Fill four 4 oz. portion cups with 4 oz. glaze, top with lid.",
        "Mix pepper strips + broccoli in a clean & sanitized mixing bowl.",
        "Mix chicken strips (3 lbs.) + 1 ea. Korean marinade in a clean & sanitized mixing bowl.",
        "In 4 large family trays, place 12 oz. marinated chicken, 8 oz. vegetable mix + 1 cup glaze, sesame seeds garnish on chicken.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "hot-honey-chipotle-chicken",
      name: "Hot Honey Chipotle Chicken",
      page: 45,
      plu: "7521",
      pluBySupplier: {"pitman": "7521", "perdue": "7523", "smart": "7524"},
      allPlus: ["7521", "7523", "7524"],
      image: "img/meals/hot-honey-chipotle-chicken.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.4,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Cauli, Brocc & Brussels Kit (#7001343)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Broccoli Florets", qty: 12.0, unit: "oz", perTray: 3.0, perTrayUnit: "oz", raw: "12 oz. (3 oz. per meal)" },
        { name: "\u2022 Cauliflower Florets", qty: 12.0, unit: "oz", perTray: 3.0, perTrayUnit: "oz", raw: "12 oz. (3 oz. per meal)" },
        { name: "\u2022 Halved Brussels Sprouts", qty: 12.0, unit: "oz", perTray: 3.0, perTrayUnit: "oz", raw: "12 oz. (3 oz. per meal)" },
        { name: "Boneless Skinless Chicken Thighs", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal, about 3 thighs)" },
        { name: "Hot Honey Chipotle Marinade,", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Mix vegetables (36 oz.) with 1/2 pouch marinade in a clean and sanitized mixing bowl, set aside.",
        "Mix thighs with remaining 1/2 pouch marinade in a clean and sanitized mixing bowl, set aside.",
        "Right: In 4 large family trays, place tucked & rolled marinated thighs (12 oz.)",
        "Left: Add marinated vegetables (9 oz.)",
        "Place lid on meal and label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "marry-me-chicken",
      name: "Marry Me Chicken",
      page: 47,
      plu: "7492",
      pluBySupplier: {"pitman": "7492", "perdue": "7491", "smart": "7493"},
      allPlus: ["7491", "7492", "7493"],
      image: "img/meals/marry-me-chicken.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.71,
      shelfLifeDays: 4,
      shelfLifeSource: "One Pan Meals",
      shelfLifeCard: null,
      ingredients: [
        { name: "Marry Me Chicken Kit (#7001342)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Creamy Tomato Sauce", qty: 32.0, unit: "oz", raw: "32 oz." },
        { name: "\u2022 Parmesan Cheese, pouched", qty: 4.0, unit: "oz", raw: "4 oz." },
        { name: "\u2022 Roasted Garlic Cloves, pouched", qty: 4.0, unit: "oz", raw: "4 oz." },
        { name: "\u2022 Sundried Tomatoes, pouched", qty: 4.0, unit: "oz", raw: "4 oz." },
        { name: "\u2022 Parsley", qty: 0.5, unit: "oz", raw: "0.5 oz." },
        { name: "Boneless Skinless NAE Chicken Thighs", qty: 3.75, unit: "lb", perTray: 15.0, perTrayUnit: "oz", raw: "3.75 lbs. (15 oz. per meal, about 4 thighs)" },
        { name: "Herb Butter Marinade", qty: 1.0, unit: "ea", note: "5oz. pouch", raw: "1 ea. (5oz. pouch)" }
      ],
      steps: [
        "Fill eight 4 oz. portion cups with 4 oz. creamy sundried tomato sauce, place on top.",
        "Place 1 oz. each sundried lid tomatoes, garlic cloves, and Parmesan cheese into 4 resealable pouches and seal.",
        "In a clean and sanitized mixing bowl, mix chicken (3.75 lbs.) + herb butter marinade (5 oz.)",
        "In 4 large family trays, place chicken thighs, 2 cups sauce and 1 sundried tomato pouch. Garnish chicken with parsley.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "cajun-butter-shrimp-saut\u00e9",
      name: "Cajun Butter Shrimp Saut\u00e9",
      page: 51,
      plu: "9142",
      pluBySupplier: {"default": "9142"},
      allPlus: ["9142"],
      image: "img/meals/cajun-butter-shrimp-saute.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 1.05,
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "16/20 P&D Raw Shrimp, thawed", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per tray)" },
        { name: "Cajun Butter Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Jalapeno Peppers, diced", qty: 4.0, unit: "oz", perTray: 1.0, perTrayUnit: "oz", raw: "4 oz. (1 oz. per tray)" },
        { name: "Jalapeno Peppers, whole", qty: 2.0, unit: "oz", perTray: 3.0, perTrayUnit: "ea", raw: "2 oz. (3 slices per tray)" },
        { name: "White Onion", qty: 10.0, unit: "oz", perTray: 2.5, perTrayUnit: "oz", raw: "10 oz. (2.5 oz. per tray)" }
      ],
      steps: [
        "Cut off tops, split and seed jalapenos (4 oz.) , then dice 1/4 \", slice 1 whole jalapeno for garnish. Dice onions into 1\" dice, chop parsley. Set aside.",
        "Mix shrimp (3 lbs.) + 1 ea. marinade in a clean & sanitized mixing bowl.",
        "Mix 12 oz. marinated shrimp + 2.5 oz. onions + 1 oz. jalapenos in a clean & sanitized mixing bowl.",
        "Fill 4 small (22 oz.) trays with 16.75 oz. mixed product and garnish with chopped parsley and 3 sliced jalapeno rounds.",
        "Place lid on meal and label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "citrus-herb-salmon",
      name: "Citrus Herb Salmon",
      page: 53,
      plu: "7295",
      pluBySupplier: {"default": "7295"},
      allPlus: ["7295"],
      image: "img/meals/citrus-herb-salmon.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.7,
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Grilled Vegetable Kit (#70013661)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Mini Peppers", qty: 18.0, unit: "ea", perTray: 4.5, perTrayUnit: "ea", note: "4-5 per meal", raw: "4 - 5 ea. per meal" },
        { name: "\u2022 Zucchini, quartered", qty: 10.0, unit: "ea", perTray: 2.5, perTrayUnit: "ea", note: "2-3 per meal", raw: "2 - 3 quarters per meal" },
        { name: "\u2022 Red Onion, 1\u20444\" round slices", qty: 8.0, unit: "ea", perTray: 2.0, perTrayUnit: "ea", raw: "2 slices per meal" },
        { name: "\u2022 Lemon, quartered", qty: 4.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "4 wedges (1 wedge per meal)" },
        { name: "Atlantic Salmon 6 oz. portions", qty: 8.0, unit: "ea", perTray: 2.0, perTrayUnit: "ea", raw: "8 ea. (2 ea. per meal)" },
        { name: "Citrus & Lemon Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Cut zucchini into 4 equal pieces, cut red onion into 1/4\" slices, cut lemon into fourths.",
        "Mix 8 salmon portions + 1 ea. citrus marinade in a clean & sanitized mixing bowl.",
        "Right side: 4 large family trays with 2 salmon portions.",
        "Left side: 2 - 3 zucchini + 2 onion slices + 4 - 5 peppers (13 oz. veg), garnish with 1 lemon wedge.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "herb-butter-salmon",
      name: "Herb Butter Salmon",
      page: 55,
      plu: "9752",
      pluBySupplier: {"default": "9752"},
      allPlus: ["9752"],
      image: "img/meals/herb-butter-salmon.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 84.0,
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Atlantic Salmon 6 oz. portions", qty: 8.0, unit: "ea", perTray: 2.0, perTrayUnit: "ea", raw: "8 ea. (2 ea. per meal)" },
        { name: "Herb Butter Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Garlic Butter Dollop, frozen", qty: 4.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "4 ea. (1 ea. per meal)" }
      ],
      steps: [
        "Mix 8 salmon portions + 1 ea. herb butter marinade in a clean & sanitized mixing bowl.",
        "Place 2 salmon portions into 4 small (22 oz.) trays.",
        "Garnish 1 butter dollop + chopped parsley per tray.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "hot-honey-chipotle-salmon",
      name: "Hot Honey Chipotle Salmon",
      page: 57,
      plu: "9126",
      pluBySupplier: {"default": "9126"},
      allPlus: ["9126"],
      image: "img/meals/hot-honey-chipotle-salmon.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.4,
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Cauli, Brocc & Brussels Kit (#7001343)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Broccoli Florets", qty: 12.0, unit: "oz", perTray: 3.0, perTrayUnit: "oz", raw: "12 oz. (3 oz. per meal)" },
        { name: "\u2022 Cauliflower Florets", qty: 12.0, unit: "oz", perTray: 3.0, perTrayUnit: "oz", raw: "12 oz. (3 oz. per meal)" },
        { name: "\u2022 Halved Brussels Sprouts", qty: 12.0, unit: "oz", perTray: 3.0, perTrayUnit: "oz", raw: "12 oz. (3 oz. per meal)" },
        { name: "Atlantic Salmon 6 oz. Portions", qty: 8.0, unit: "ea", perTray: 2.0, perTrayUnit: "ea", raw: "8 ea. (2 ea. per meal)" },
        { name: "Hot Honey Chipotle Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Mix vegetables (36 oz.) with 1/2 pouch marinade in a clean and sanitized mixing bowl, set aside.",
        "Mix 8 salmon portions with remaining 1/2 pouch marinade in a clean and sanitized mixing bowl, set aside.",
        "Right: In 4 large family trays, place 2 salmon portions.",
        "Left: Add marinated vegetables (9 oz.)",
        "Place lid on meal and label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "spicy-island-jerk-salmon",
      name: "Spicy Island Jerk Salmon",
      page: 59,
      plu: "9754",
      pluBySupplier: {"default": "9754"},
      allPlus: ["9754"],
      image: "img/meals/spicy-island-jerk-salmon.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 0.83,
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Atlantic Salmon 6 oz. portions", qty: 8.0, unit: "ea", perTray: 2.0, perTrayUnit: "ea", raw: "8 ea. (2 ea. per meal)" },
        { name: "Jamaican Jerk Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Mix 8 salmon portions + 1 ea. jerk marinade in a clean & sanitized mixing bowl.",
        "Place 2 salmon portions into 4 small (22 oz.) trays.",
        "Garnish chopped green onions.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package. or less in cooler before",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "firecracker-shrimp",
      name: "Firecracker Shrimp",
      page: 61,
      plu: "7462",
      pluBySupplier: {"default": "7462"},
      allPlus: ["7462"],
      image: "img/meals/firecracker-shrimp.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.5,  targetWeightCheatSheetLb: 1.6,  // cheat sheet disagrees; card wins
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Firecracker Kit (#70013657)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "\u2022 Red Bell Peppers, 1\u20444\" strips", qty: 16.0, unit: "oz", perTray: 4.0, perTrayUnit: "oz", raw: "16 oz. (4 oz. per meal)" },
        { name: "\u2022 Broccoli Florets", qty: 14.0, unit: "oz", perTray: 3.5, perTrayUnit: "oz", raw: "14 oz. (3.5 oz. per meal)" },
        { name: "\u2022 Hot Honey Glaze Pouch", qty: 16.0, unit: "oz", raw: "16 oz." },
        { name: "40/60 PDTO Raw Gulf Shrimp, thawed", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Korean BBQ Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" }
      ],
      steps: [
        "Cut bell peppers into 1/4\" strips, fill four 4 oz. portion cups with 4 oz. glaze, top with lid.",
        "Mix pepper strips + broccoli in a clean & sanitized mixing bowl.",
        "Mix shrimp (3 lbs.) + 1 ea. Korean marinade in a clean & sanitized mixing bowl.",
        "Fill 4 large family trays with 12 oz. marinated shrimp, 8 oz. vegetable mix + 1 cup glaze. Garnish shrimp with sesame seeds.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "herb-butter-shrimp-saut\u00e9",
      name: "Herb Butter Shrimp Saut\u00e9",
      page: 63,
      plu: "9753",
      pluBySupplier: {"default": "9753"},
      allPlus: ["9753"],
      image: "img/meals/herb-butter-shrimp-saute.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Small Pans", items: 4 },
      targetWeightLb: 0.84,
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "16/20 P&D Raw Shrimp, thawed", qty: 3.0, unit: "lb", raw: "3 lbs." },
        { name: "Herb Butter Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Garlic Butter Dollop, frozen", qty: 4.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "4 ea. (1 ea. per meal)" }
      ],
      steps: [
        "Mix shrimp (3 lbs.) + 1 ea. herb butter marinade in a clean & sanitized mixing bowl.",
        "Fill 4 small (22 oz.) trays with 13 oz. marinated shrimp.",
        "Garnish 1 butter dollop + chopped parsley per tray.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    },
    {
      id: "shrimp-scampi",
      name: "Shrimp Scampi",
      page: 65,
      plu: "7294",
      pluBySupplier: {"default": "7294"},
      allPlus: ["7294"],
      image: "img/meals/shrimp-scampi.jpg",
      subRecipe: false,
      yield: { qty: 4, unit: "Large Pans", items: 4 },
      targetWeightLb: 1.56,  targetWeightCheatSheetLb: 1.5,  // cheat sheet disagrees; card wins
      shelfLifeDays: 4,
      shelfLifeSource: "Seafood One Pan Meals ALL",
      shelfLifeCard: 5,
      ingredients: [
        { name: "Scampi Kit (#7007905)", qty: 1.0, unit: "ea", raw: "1 ea." },
        { name: "16/20 P&D Raw Shrimp, thawed", qty: 3.0, unit: "lb", perTray: 12.0, perTrayUnit: "oz", raw: "3 lbs. (12 oz. per meal)" },
        { name: "Citrus & Lemon Marinade", qty: 1.0, unit: "ea", note: "5 oz. pouch", raw: "1 ea. (5 oz. pouch)" },
        { name: "Garlic Butter Dollop, frozen", qty: 4.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "4 ea. (1 ea. per meal)" },
        { name: "Lemon, quartered", qty: 1.0, unit: "ea", perTray: 1.0, perTrayUnit: "ea", raw: "1 ea. (1 wedge per meal)" }
      ],
      steps: [
        "Mix shrimp (3 lbs.)+ 1 ea. citrus marinade in a clean & sanitized mixing bowl.",
        "Fill 4 large family trays with 12 oz. marinated shrimp + 4 oz. asparagus + 5 oz. tomatoes each.",
        "Mix marinated shrimp + veg in EACH tray to combine.",
        "Garnish 1 butter dollop + 1 oz. garlic cloves + 1 lemon wedge.",
        "Place lid on meal, label with designated instructions, place scale label at the front and back of the package.",
        "CCP - Cool to 41\u00b0F or lower in 4 hours or less in cooler before merchandising, then display at 41\u00b0F or lower per schematic."
      ]
    }
  ];

  /* Match a scanned PLU to a recipe, checking EVERY supplier variant.
     A Perdue delivery must not read as an unknown product just because
     the store normally stocks Pitman. */
  function byPlu(plu) {
    var p = String(plu);
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].allPlus.indexOf(p) !== -1) return RECIPES[i];
    }
    return null;
  }

  /* Which supplier does this PLU belong to? Tells you what actually
     arrived when the scanned code is not the usual West one. */
  function supplierOf(plu) {
    var p = String(plu);
    for (var i = 0; i < RECIPES.length; i++) {
      var m = RECIPES[i].pluBySupplier;
      for (var k in m) if (m[k] === p) return { recipe: RECIPES[i], supplier: k };
    }
    return null;
  }

  return { RECIPES: RECIPES, byPlu: byPlu, supplierOf: supplierOf };
});
