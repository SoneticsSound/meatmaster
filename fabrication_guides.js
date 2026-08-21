/* MeatMaster - Beef Fabrication (Cutting) Guides
   ==================================================================
   Parsed from the "Beef Fabrication Manual" PDF by
   backoffice/parse_fabrication.py (do not hand-edit; re-run the parser).
   Each guide: cut name, source primal, PRODUCTION (cutting) steps,
   CHILL/DISPLAY steps, and TIPS. These are cutting PROCEDURES, not
   count-scaled recipes.
   ================================================================== */
(function (root) {
  'use strict';
  var GUIDES = [
  {
    "id": "angus-beef-petite-sirloin-steaks-boneless",
    "name": "Angus Beef Petite Sirloin Steaks, Boneless",
    "primal": "Beef Ball Tip",
    "production": [
      "· Begin by removing fat wedge and lightly removing membrane tissue by hand. Lightly separate muscle tissue with the edge of the blade",
      "· Square off the primal with your first cut; the ends can be used in stir fry or stew meat",
      "· Trim steaks to 1/4-inch standard if needed",
      "· Separating your red trim from white trim is an essential part of good shrink habits",
      "· Red trim can be cut into stew or stir-fry with small pieces utilized in the taco meat recovery program Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room."
    ]
  },
  {
    "id": "boneless-beef-ny-holiday-roast-seasonal",
    "name": "Boneless Beef NY Holiday Roast, (Seasonal)",
    "primal": "Boneless Beef NY Roast",
    "production": [
      "· Do not pre trim or face primal prior to cutting, this includes both ends. Excess fat over ¼\" is to be removed. · Using 3\" roast bands, apply to roast 1 ½\" apart as shown. · Order roast bands through Bunzl Order Supply- Item # 41400015 · Apply bands so that the knots are on the bottom of the roast, so they are not visible to the customer. · Display Roasts in a 4 tray. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-rib-roast-bone-in-seasonal",
    "name": "Beef Rib Roast, Bone In (Seasonal)",
    "primal": "Bone in Beef Rib Roast",
    "production": [
      "· Do not pre trim or face primal prior to cutting, this includes both ends. Excess fat over ¼\" is to be removed.",
      "· Separate bones from primal, then use roast bands to attach the bones back on spacing 1 ½\" apart.",
      "· Cut roast between ribs for desired roast size.",
      "· Display Roasts in 4 tray or 8 tray depending on size. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Steaks are NOT to be cut from this primal unless otherwise directed by support office. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-bottom-round-boneless",
    "name": "Beef Bottom Round, Boneless",
    "primal": "Bottom Round",
    "production": [
      "· Do not pre-trim primal. Remove heavy fat by hand, lightly separating with your knife",
      "· Trim off any bone-skin that remains on the primal",
      "· Square end of primal for stew meat needs and cooking consistency",
      "· Take the first cuts, as needed, for boneless short-rib production needs",
      "· Cut rump roasts 2.5 to 3.5 lbs. Primal will produce 3-4 roasts at this size",
      "· Use ends (if stew meat is needed), cut into 1\"x1\" cubes and display in a 2 tray.",
      "· Be mindful that red trim will be used in taco meat",
      "· Cut boneless beef strips 1\" wide for boneless short-ribs when needed",
      "· Separate your cuts and utilize all red trim in Carne Picada (taco meat) Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-chuck",
    "name": "Beef Chuck",
    "primal": "Beef Chuck",
    "production": [
      "· Do not squareup primal.",
      "· Cut chuck roasts between 2.0 to 3.0 lbs. (approximately 2\" thick)",
      "· Cut roasts or steaks in half if needed to fit tray.",
      "· Wedge out any large pieces of fat from first cut.",
      "· Cut steaks to a ¾ to 1\" thickness from center of primal.",
      "· Display chuck roasts in 4 and Steaks in 2PZ tray.",
      "· Merchandise excess as stew meat cutting into 1x1\" pieces. No connective tissue in stew. Display in black 2 tray."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-brisket",
    "name": "Beef Brisket",
    "primal": "Beef Brisket",
    "production": [
      "· Begin by inspecting the top (meat side) and bottom (fat side)",
      "· Remove large fat cap from point end",
      "· Trim the fat top layer that separates the point from the flat cut",
      "· Trim any scalding around the brisket",
      "· Trim fat on bottom of primal to ¼ inch",
      "· Cut brisket into 3 pieces",
      "· Display brisket in a 4 tray. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self - service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-flap-meat",
    "name": "Beef Flap Meat",
    "primal": "Beef Flap Meat",
    "production": [
      "· Remove loose fat by hand and angle your blade to `lightly shave' the silver from primal, being careful to not cut into the meat. This should produce minimal trim.",
      "· Cutting with the grain, cut primal into 3-4 equal pieces (depending on the size of the primal).",
      "· Fillet the sections of flap meat into ¼\" slices. Thicker pieces may require you fillet the piece twice.",
      "· Flap meat is to be used for the fresh case in addition to steak with Chimichurri and/or Carne Asada",
      "· Pieces should be 7-8 inches long and 7-10 oz",
      "· When packaging for the side case, where authorized per schematic, the target weight is 14 - 18 oz per package. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-inside-round-boneless",
    "name": "Beef Inside Round, Boneless",
    "primal": "Beef Inside Round",
    "production": [
      "· Begin by cutting a portion of the primal with the grain as shown, this portion can be merchandised into stew meat",
      "· After taking a small face cut, slice breakfast steaks ¼ inch",
      "· Cut London Broils 1 ¼-1½\" thick, regular top round steaks minimum 1\" thick",
      "· The inside round portions can be merchandised into stew meat or boneless short ribs",
      "· Gauge your cuts off your daily production needs",
      "· Grass Fed boneless short ribs and stew meat may be cut from this primal",
      "· Clean up London Broil steaks by trimming away excess and membrane fat",
      "· Separate red trim from white trim to utilize in carne picada (taco meat)",
      "· Merchandise excess as stew meat cutting into 1x1\" pieces ensuring there is no connective tissue.",
      "· Display in 2 tray or use in value added items that call for this ingredient. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Updated 5/15/24"
    ]
  },
  {
    "id": "beef-ribeye-boneless",
    "name": "Beef Ribeye, Boneless",
    "primal": "Boneless Beef Ribeye",
    "production": [
      "· Do not pre trim or face primal prior to cutting ribeye steaks. Fat is to be trimmed, if needed' from each individual steak.",
      "· Cut boneless ribeye steaks 1 ¼\" thick for the Service Case and a minimum of 1\" thick for the Self- Serve Case. Trim exterior fat to ¼.\" Leave tail on not to exceed 1 ½\" past the eye.",
      "· Display 1 ribeye steak in a 2 tray as shown.",
      "· Steaks are not to be split for the multideck case. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Fat is to be trimmed from each individual steak. Not to exceed 1.5\" inches past the eye Updated 5/15/24"
    ]
  },
  {
    "id": "beef-striploin-ny-boneless",
    "name": "Beef Striploin/NY, Boneless",
    "primal": "Boneless Beef Striploin",
    "production": [
      "· Do not pre trim or face primal prior to cutting New York strip steaks. Fat is to be trimmed from each individual steak.",
      "· Cut first New York strip steak 1\" thick from the heavy gristle large end. Immediately apply markdown on first cut only for sell through. (note; half of the primals will have the large gristle end, half will not)",
      "· Cut New York strip steaks 1¼\" thick for the Service Case and a minimum of 1\" thick for the Self- Serve Case. Trim exterior fat to ¼.\" Leave tail on not to exceed 1½ inch past the eye.",
      "· Display in 2 tray. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Fat is to be trimmed from each individual steak. Not to exceed 1.5\" inches past the eye Updated 5/15/24"
    ]
  },
  {
    "id": "beef-tenderloin-whole-pismo-boneless",
    "name": "Beef Tenderloin Whole PISMO, Boneless",
    "primal": "Beef Tenderloin",
    "production": [
      "· Peel and remove any loose fat by hand without removing chain or silver skin",
      "· Remove hard fat located on butt end next to chain and clean up any loose fat along chain line going towards the tail",
      "· Turn over primal to inspect both sides and remove bone skin, if any, without cutting into red meat",
      "· Use the roast bands to tie tenderloin leaving a 4\" tail, until what is left is too small to cut into steaks. Strings should be 1 1/4\" apart",
      "· Cut steaks 1 ¼\" for Service Case and Cut to a minimum of 1\" for the Self-Serve case. Adjust strings as needed while cutting Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room. Do Not Remove Chain"
    ]
  },
  {
    "id": "beef-tenderloin-butt-boneless",
    "name": "Beef Tenderloin Butt, Boneless",
    "primal": "",
    "production": [
      "· Product arrives with 2 butt tenderloins per bag. Do not square or face ends.",
      "· Do not remove chain or silver skin. Peel and remove loose fat by hand.",
      "· Cut out the fat wedge as needed on wide end of primal.",
      "· Using roast bands, cut 1 ¼\" thick for the service case and 1\" for the self-serve case.",
      "· Place 2 tenderloin steaks in 4 tray Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room."
    ]
  },
  {
    "id": "beef-top-sirloin-coulotte-boneless",
    "name": "Beef Top Sirloin Coulotte, Boneless",
    "primal": "Beef Top Sirloin Coulotte",
    "production": [
      "· Coulotte muscle comes in peeled. No trimming necessary.",
      "· Cut top sirloin steaks minimum of 1\" thick across the grain. Use excess ends for stir fry or stew meat.",
      "· Display top sirloin steaks in 2 trays.",
      "· Cut additional protein beyond your selling needs into ½\" x 3\" strips for stir fry, 1\" x 1\" cubes for stew meat, or use for Value Added items/One Pan Meals. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room."
    ]
  },
  {
    "id": "beef-top-sirloin-filet-boneless",
    "name": "Beef Top Sirloin Filet, Boneless",
    "primal": "Beef Top Sirloin",
    "production": [
      "· Remove heavy cap fat, staying mindful to not to cut into the meat",
      "· Along the grain, cut primal into 3 equal size pieces",
      "· Place elastic roast bands 1.25\" to 1.5\" apart",
      "· Check for consistency with the bands on both sides",
      "· Cut between the bands for 1¼\" steaks for service case",
      "· If cutting for the Self- Serve case, use roast bands and cut to 1\" steaks, tray 2-3 steaks",
      "· Top Sirloin can be used for Stir-Fry and/or Kabob meat; ½\" x 3\" strips for stir fry Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service or service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room."
    ]
  },
  {
    "id": "trimmed-beef-tri-tip",
    "name": "Trimmed Beef Tri-Tip",
    "primal": "Beef Tri-Tip",
    "production": [
      "· Begin by lightly trimming away the heavy top fat to ¼\", keeping your blade angled to avoid cutting into the meat",
      "· Trim bottom fat to ¼ inch",
      "· Cut two 1\" steaks from the roast, stay against the grain as much as possible",
      "· Inspect and trim the bottom of the roast",
      "· Additional steaks may be cut if necessary to meet production needs",
      "· Trim steaks to ¼\" standard",
      "· Pro Tip: Always separate red trim from white trim to avoid shrink opportunities Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less.",
      "· Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room."
    ]
  },
  {
    "id": "beef-short-ribs-bone-in",
    "name": "Beef Short Ribs - Bone In",
    "primal": "Bone In Beef Short Ribs",
    "production": [
      "1. Do not trim short ribs before or after cutting. 2. Cut each short rib into 3 equal portions by cutting in between each bone as shown. 3. Place 3 ribs into a 2 tray and display in your self-service meat case. 4. Do not display in cryovac, cut in between the bones, and display in tray as pictured below. Clean and Sanitize work area and equipment when changing Proteins."
    ],
    "chillDisplay": [
      "*CCP - Place in cooler and bring to an internal temperature of 41deg degrees or lower in 4 hours or less. · Once product is 41deg or lower, merchandise in the self-service meat case following your stores current schematic."
    ],
    "tips": [
      "Combined cutting and wrapping time should not exceed 30 minutes in the cutting room."
    ]
  }
];
  root.MMFabricationGuides = { GUIDES: GUIDES };
})(typeof self !== 'undefined' ? self : this);
