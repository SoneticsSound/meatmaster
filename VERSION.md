# MeatMaster Version Fidelity

Current app version: **v0.21.16**

- Any-angle barcode + hold card until sell-by resolves (v0.21.16): two tied-together bits of feedback. (1) "Barcode only really works at a 90° angle." zbar reads bars along horizontal scan lines, so a label held sideways fails on the upright frame. decodeFrame now has a rotation fallback: after the upright raw + Otsu passes miss, it rotates the crop 90° (rotate90) and tries raw + Otsu again, then un-rotates any hit's corner points back to source (unrotatePoints: rx,ry → ry, srcH−rx) so the sell-by OCR still anchors. Rotation only runs when the upright passes fail, so normal scans aren't slowed. Point-mapping verified empirically in-browser (x exact, y within block+antialias slop, far under the OCR crop's padding). (2) "The expiry-date read caused a dupe — delay the card auto-dismiss until the date locks or gives up." The RECORDED/dupe toast now holds until pendingSellBy clears (date confirmed OR OCR gave up), with a min on-screen time (1s ok / 2.5s dupe) and a 6s hard cap. Because the barcode stays locked (heldStuck) the whole time the card is up, the OCR window can no longer produce a phantom re-count — this closes the exact gap Kyle hit. Verified: loads clean, no console errors.

- Scanner precision batch — OCR confidence voting, price on card, frame-left gate (v0.21.15): three pieces of month-of-use feedback from Kyle. (1) OCR still confused 8↔9/other digits: findDate now carries each candidate date's Tesseract word-confidence, and runSbJob votes are CONFIDENCE-WEIGHTED (conf≥70 → weight 2, ≥45 → 1, else 0.4). A read only confirms when its tally reaches ≥3 AND clearly beats the runner-up (≥1.5 margin), so a low-confidence 8→9 misread can't stick; OCR_MAX_TRIES 12→16 for headroom. (2) Dupes on obviously-different prices: root cause was the SAME barcode re-counting after the card auto-dismissed while the label was still in frame (not a price-compare bug — codeText keeps the full price-bearing code, so different prices already never matched). Fixed by the frame-left gate. Also surfaced the embedded PRICE on the result card (big green $, turns amber on a dupe card) so a duplicate prompt is verifiable at a glance — same price = trust it, different = obviously wrong. (3) Duplicate scans under the card: HOLD_RELEASE_MS 250→900ms, so a barcode must genuinely LEAVE the frame ~0.9s before it can re-count — a single dropped-decode frame no longer looks like it left. Carries the earlier unshipped batch too: cooked shrimp (PLU 9022) added to the seafood case layout; big red PLU on the result card; immediate first OCR read on the scan frame. Verified: app loads clean (no console errors), result-plu (red) + result-price (green) render, 9022 present. NOT changed: session dupe rule stays whole-session same-code (correct for weighed items — each has a unique price); "Count Dupes as Units" remains the escape hatch for genuinely identical fixed-price packs.

- Fabrication primals-to-pull estimate (v0.21.14): answers Kyle's "estimate yield per package from weight". Each cut has an estimated cuts-per-primal = floor(primalLb·16·0.85 / cutOz) with per-cut typical primal/cut weights (ribeye ~10lb/14oz→9, NY ~11lb/13oz, etc.; roasts/brisket/short-rib special-cased). Meat Fabrication Production List now shows "≈ N primals to pull (~M/primal)" per cut when you enter a count (primals = ceil(count / cuts-per-primal)); the guide detail has an EDITABLE "cuts per primal" (stored mm.fab.cpp.v1) so Kyle tunes it to his store's actual primals. Verified: 20 ribeyes → 3 primals @ ~9/primal; edit persists. Still open: match the cut list to the Periscope checklist exactly.

- Meat Fabrication pair (v0.21.13): 3rd recipe pair done. 16 beef cutting guides parsed from the Beef Fabrication manual (backoffice/parse_fabrication.py → fabrication_guides.js): cut name, source primal, PRODUCTION (cutting) steps, CHILL/DISPLAY, TIPS. New fabrication.js: "Meat Fabrication Production List" (enter counts per cut, per-day) + "Recipes for Fabrication" (browsable cutting guides with count badges, tap → primal + cutting steps + chill/display + tips). Wired both buttons + precache. OPEN DESIGN ITEMS (Kyle): (1) the cut list should match the Periscope inventory checklist exactly (currently uses the 16 manual cuts); (2) primals-to-pull — "make N steaks → pull X primals" — the manual gives cutting THICKNESS not a fixed steaks-per-primal count (yield varies by primal size), so it needs an editable cuts-per-primal estimate or an average-primal-weight source. Proposed: per-cut editable "cuts per primal" so the app computes primals to pull.

- Recipes for Service Case + OCR cleanup (v0.21.12): NEW "Recipes for Service Case" button (2nd of Kyle's 3 recipe pairs). 33 service-case recipes parsed from the Meat Service Case manual (backoffice/parse_service_case.py → service_case_recipes.js): PLU(s), yield, shelf-life, ingredients (name + printed measure), production steps. New servicecaserecipes.js renders a browsable list grouped Beef/Chicken/Turkey with today's Service-Case-Production refill counts as badges, tap → ingredients + steps. Display names resolve from caselayout.js by PLU (curated names) with the manual name as fallback. Also (v0.21.11): removed the beta OCR-debug panel now that reads are confirmed, and hardened no-silent-dupes (barcode locked while ANY result card is up). STILL TO DO: 3rd pair — "Meat Fabrication Production List" + "Recipes for Fabrication" (Kyle prefers "Fabrication" over "Cutting"; the fabrication manual is procedure-style, not per-item recipes, so it needs a different structure).

- OCR reads the date! multi-token assembly + retry-on-sharp-frames (v0.21.10): Kyle's v0.21.9 debug proved OCR DID read the date — "saw: 3 2 08 20 26 1.325 8.39/" — but blur turned the dots into SPACES, so "08.20.26" came out as three tokens "08" "20" "26" and the extractor (single-token only) missed it; the "3 2" noise also fooled the fallback regex. Fix: findDate now considers 1-, 2- AND 3-token runs joined with "/" (so "08"+"20"+"26" → "08/20/26"), still rightmost + plausibility-filtered (noise "3/2/08"→2008 rejected; weight/price rejected). Verified on Kyle's EXACT tokens → 8/20/2026. ALSO (Kyle's idea): OCR now RETRIES across frames while the item is in view and ONLY on SHARP frames (st.sharp ≥ 7, reusing the barcode sharpness metric) up to 12 tries, stopping the instant a date reads — the frame captured at decode is often the blurry one as you move, but a sharp one comes along. Row stays "Expiry scanning…" through retries, only "No date read" on give-up.

- OCR read = digit-only + position anchor (v0.21.9): the v0.21.8 letter-whitelist approach BACKFIRED on-device — letters corrupted the date (Kyle's read: "0B 20 26" = 8→B) and added "See el leesbeey" noise. Reverted to a DIGITS-ONLY read (accurate, no 8→B) and anchor the date by POSITION: the Sell By is top-right, so findDate takes the RIGHTMOST plausible date (weight is left, price centre), tie-broken by closest-to-today, with a space-tolerant text fallback. Also tried Kyle's explicit two-pass (find "Sell By" text → re-crop → re-read digits) but re-OCRing a sub-region of the already-binarized crop read WORSE than one clean pass, so position-anchoring won. Verified: synthetic weight+price+date labels → returns the date, ignores weight/price. NOTE: motion blur still defeats it — hold steady. The tighter crop from v0.21.8 stays.

- OCR "Sell By" anchor + tighter crop (v0.21.8): Kyle's working-engine screenshot showed the crop was HUGE (whole package top: nutrition panel, cooking text) so OCR fragmented and never got a clean look at the date; and it confused weight (1.325)/price (8.99) with the date. Fixes: (1) crop is now a TIGHT band around the barcode (padUp=max(4·bh, 0.5·bw) above it, right-biased) instead of the whole frame above it; (2) the reader now also sees the letters S/E/L/B/Y (whitelist) so it can find the "Sell By" label and ANCHOR the date to it — takes the plausible date token nearest "Sell By", with rightmost-date and closest-to-today as fallbacks. Verified end-to-end: synthetic label with weight+price+SellBy → correctly returns the date, not the weight/price. This is Kyle's anchor idea.

- Recipe button restructure — labels (v0.21.7): renamed toward Kyle's 3-pair structure — "Production List" → "One-Pan Meals Production List", "Recipes For Production" → "Recipes for One-Pan Meals", "Case Production" → "Service Case Production List" (buttons + screen titles). Still to add (need the manual ingests already extracted to backoffice/extracted/): "Recipes for Service Case", "Meat Cutting Production List", "Recipes for Cutting" — gated on Kyle confirming OCR works.

- OCR engine path fix — THE bug (v0.21.6): the Tesseract loader used origin-ROOT paths (`/vendor/tesseract/…`), which 404 on GitHub Pages (app lives under `/meatmaster/`), so `tesseract.min.js script failed to load` — the engine had NEVER loaded on the live site (worked on localhost served at root). Now resolves against `document.baseURI` via `new URL('vendor/tesseract/…', document.baseURI)` for the script src AND the worker/core/lang paths. Kyle's OCR-debug screenshot confirmed the crop + Otsu binarize is perfect ("Sell By 08.20.26" crystal clear), so OCR should now actually read once the engine loads.

- OCR engine load diagnosis (v0.21.5): Kyle's device reports "OCR engine not ready" even on Wi-Fi — Tesseract is failing to LOAD on iOS (not a crop/read problem). Now captures the real createWorker error and shows it: the Sell-By readout says "OCR engine didn't load — details below" and a new beta OCR-debug panel on the Scan tab prints the actual error (ENGINE FAILED: <reason>) plus, once it loads, the crop image it read + raw text. Screenshot it to see the real iOS failure reason. ocr.js now exposes lastError() and returns errMsg.

- Dupe-while-card-up fix + OCR diagnostics + Sell-By/Markdown button removed (v0.21.4): (1) REAL dupe bug fixed — the "possible duplicate" card is a non-pausing toast, so a wobbling label flickered past the 250ms hold-release and silently re-counted. Now while that card is up the held barcode is STUCK (`heldStuck`) — only a different item or a tap (Done/Rescan/Count-as-unit) clears it. (2) OCR readout now reports the failure mode so we can debug on-device: "OCR engine not ready" (didn't load) vs "nothing in crop" (blank/no text) vs "couldn't read (saw: …)" (text but no date). (3) Removed the standalone Sell-By/Markdown reference button + markdown.js — expiry is auto now via the scan readout (pull today / markdown tomorrow logic lives in dates.js). (4) Also v0.21.3: OCR crop = top band + Otsu binarize.

- OCR crop overhaul (v0.21.3): the earlier crop was anchored too tight to the barcode and missed the Sell By (which sits in the label's TOP band), so OCR came back empty ("couldn't read", no raw). Now crops the whole top band — from the top of the frame down past the barcode, barcode-left to the right edge — upscales, and Otsu-binarizes it (clean black-on-white) before reading. Should actually find the date now; still to be confirmed on-device.

- Expiry per-row + count-once-per-presentation (v0.21.2): (1) the Sell By now prints on each Scan-tab log row — "Expiry scanning…" placeholder the moment you scan, then the dated PULL/MARK DOWN/OK (coloured) or "No date read". A latest-only OCR queue keeps rows from hanging (superseded rows show nothing). Still flashes in the readout bar too. (2) A barcode now counts ONCE PER PRESENTATION: after it counts, it's suppressed until it's been out of view ~250ms (loop-released), instead of silently ticking "possible dupes" while you linger. Replaces the time-based debounce. Count path otherwise untouched.

- Scan fixes (v0.21.1): (1) HELD-BARCODE DUPE FLOOD fixed — the debounce window now slides on every sighting, so a continuously-held barcode stays suppressed until it leaves the frame ~1.5s (was re-firing a duplicate row every ~1s, silently). (2) Sell-By readout is no longer silent: it always shows a status (reading… / the date / "couldn't read (saw: …)") so you can see what OCR is doing; the "saw:" raw text is the tuning signal. (3) OCR now crops a band around the barcode (using its decoded corner points) and upscales it before reading, instead of the whole frame — a better shot at the small date. Read still needs on-device tuning; count path untouched.

- OCR folded into the MAIN scanner (v0.21.0): removed the separate "Sell-By Scanner" screen (sellbyscanner.js deleted). The date read now happens on the main count scanner — after each scan it reads the label's Sell By off the same frame (new shared ocr.js, no DOM, guarded/throttled, never touches the count) and shows it inline below the camera as a coloured PULL/MARK DOWN/OK readout. Satisfies Kyle's "one scanner" + "show expiry on the scan confirm inline." OCR still needs on-device tuning; barcode/count path unchanged.

- dates.js rule fix (v0.20.1): `classify()` updated to Kyle's confirmed rule — sell-by today or overdue = PULL, tomorrow = MARK DOWN, later = OK (was today=markdown). The Sell-By Scanner's verdicts use this, so it now matches the Sell-By/Markdown reference screen. test_dates.js still encodes the OLD boundary and needs updating (can't run node locally to re-verify).

- Sell-By Scanner BETA + offline OCR engine (v0.20.0): new Products-tab "Sell-By Scanner (beta)" (sellbyscanner.js) — camera locks the barcode (product ID, works today), then Tesseract.js reads the Sell By date as a best-effort; you confirm or type it; dates.js gives PULL/MARK DOWN/OK and adds to a per-day list. Tesseract vendored fully offline in vendor/tesseract (LSTM simd core + eng fast model, ~8.7MB), LAZY-LOADED on first open + runtime-cached (open once on Wi-Fi → works offline after). OCR read is UNVERIFIED on hardware — needs on-device tuning against real scan frames; barcode ID + manual confirm are the solid parts. Also: bourbon salmon marked absent in seafood_schematic.js (on planogram, not physically in case — physical is canon).

- Marinated salmon case data confirmed (v0.19.3): the Seafood marinated section in caselayout.js was confirmed + corrected from Kyle's 2026-08-16 close-up case photos. Name refinements (9038 Wild Alaskan, 9128 Atlantic, 9105 Lemon Pepper Roasted Garlic Wild Alaskan, 9165 Red Chimichurri Wild); 9587 resolved from the uncertain "Lemon Pepper Steelhead" guess to the tag's actual "Lemon Citrus Salmon Portion"; new PLU 9173 Garlic Lemon Pepper Atlantic Salmon added. Front/back rows confirmed correct. Photos also confirmed the full marinated-chicken layout and reinforced the Sell By label position (top-right, MM.DD.YY) for future OCR.

- Recipe kit grouping + markdown wording (v0.19.2): recipe detail now groups kit contents under the kit line like the recipe book — the "Kit" ingredient reads as a header (accent bar + KIT tag) and its "•"-prefixed contents render as indented children beneath it, still listed (Kyle sometimes grabs them loose from produce/grocery). Display-only change in production.js; scaler/data untouched. Also clarified the Sell-By/Markdown screen wording: it's a passive daily reference (no OCR yet), so it can't auto-alert — match the two dates by eye.

- Sell-By/Markdown reworked + haptics removed (v0.19.1): the Sell-By/Markdown screen is now a zero-entry daily reference — PULL = today's date, MARK DOWN = tomorrow's date (Kyle's rule: pull on the Sell By day, mark down the day before). Manual date entry removed. NOTE: dates.js classify() still encodes the OLD boundary (past=pull/today=markdown) and must be updated to this rule when OCR auto-flagging is built. Web haptics confirmed non-working on Kyle's iPhone (iOS has no Vibration API; the 17.4+ switch trick didn't fire), so the Test Haptics button + hapticstest.js were removed and the iOS hack dropped from haptics.js (now a guarded Android-only no-op).

- Case Production + Test Haptics (v0.19.0): new Products-tab "Case Production" button (caseproduction.js) — a Production-List-style refill worksheet whose line items come straight from the case layout (caselayout.js), grouped by section, +/- steppers, per-day localStorage, "Copy refill list" as text. New "Test Haptics" button (hapticstest.js) — per-pattern buzz buttons + Vibration-API support indicator, for on-device QA. Both self-contained; do not touch scan/count/session.

- One Pan Meals reference (v0.18.1): new Products-tab "One Pan Meals" button opens a photo + PLU reference of every one-pan meal (grouped Beef/Chicken/Seafood, tap-through to the recipe), rendered from recipes_data via production.js. Digital version of the corporate label sheet (reference.js DECK 2) to help place ready-pan meals in the right case spot so counts line up.

- Sell-By / Markdown (v0.18.0): new Products-tab "Sell-By / Markdown" screen (markdown.js) over the tested dates.js engine — type the Sell By date off the label and it flashes RED "PULL — SHRINK" (past), YELLOW "MARK DOWN" (today), or green OK, and builds a per-day pull list sorted by urgency. New shared haptics helper (haptics.js): Android vibrate patterns per verdict; iOS best-effort via the 17.4+ switch trick (Vibration API is Android-only — the likely reason earlier haptics didn't fire on iPhone). Scanner feedback now routes through the same helper. Both new modules are self-contained and do not touch scan/count/session.

Last synced: 2026-08-15

- Garnish Walk (v0.17.1): the Products-tab "Garnish Walk" button now renders a single, numbered walk order derived from the case layout (far row, near row, then step right — `buildGarnishWalk()` in reference.js) instead of the old static sheet. Correcting a case position re-sorts the garnish order automatically. 16 items placed; 2 seafood service-case items with no PLU are surfaced under "No case position yet." Reference-only, does not touch scan/count.

## Version Sources

The app is a cached offline PWA, so version fidelity matters. When any app file changes, bump all active version stamps together:

- `service-worker.js` -> `CACHE_VERSION`
- `index.html` -> visible `.build-stamp`
- this file -> `Current app version`

`manifest.webmanifest` does not currently carry a version field.

## Current Capability

- Installable offline app shell.
- Bottom tabs: Scan, Products, Session, Export.
- Bundled zbar WASM barcode scanner.
- Camera decode path reads real-world barcode photos and live camera frames.
- Local seed product database seeded from `../Reference/IMG_7236.jpeg`.
- Saved local product edits and unknown-scan quick-add via browser storage.
- Scan results show friendly product names when the barcode exists in the seed or saved database.
- Recognized scans auto-record into a persistent count session without requiring Confirm.
- Session tab shows grouped counts plus removable scan evidence rows.
- Export tab downloads a CSV with product name, PLU, count, store code, and category.
- Exact same barcode reads are debounced for 1 second to prevent duplicate-toast loops.
- Duplicate scan rows are marked with a small badge and can be swiped to Count Unit or Remove.
- Rescan now clears toast state, resets same-code cooldown, and restarts the decode loop if needed.
- Duplicate entries in both scan logs use red warning styling and show product names when a barcode is mapped.
- Sessions can be saved locally, cleared from the Session tab, and selected from Export.
- Scan tab recent entries use the same red duplicate styling and swipe actions as Session.
- Save Session auto-names sessions from the local saved date and time.
- Counting a duplicate as a unit now only affects duplicate rows and leaves a green Counted Unit badge.
- Swipe actions wait for clear horizontal intent so Scan and Session logs can scroll normally.
- Unconfirmed duplicate scans remain visible as evidence but are excluded from counts and CSV export.
- Seed DB now includes ready-made PLUs 7411 Black Truffle Saute and 7492 Marry Me Chicken.
- Product list now handles PLU-only items cleanly and product edits can set category.
- Result-card Done resumes scanning without adding a second recent-log row.
- Products tab has local search across name, PLU, barcode, sheet name, and category.
- Session stats show pending duplicate rows separately from counted scans.
- Session tab can copy counted product totals as compact text.
- Old manual-confirm wording was cleaned up now that scans auto-record.
- Session tab has a Periscope Report view with large counted quantities for manual checklist entry.
- Count, CSV, Copy Counts, and Periscope Report now sort by checklist/case position before product name.
- Periscope Report shows both the normal product name and the checklist/store-code name.
- Opening Periscope Report scrolls the report into view.
- Periscope Report warns when unresolved duplicate rows still need review.
- Session tab can sweep-remove all unresolved duplicate rows.
- Session tab can sweep-count all unresolved duplicate rows as physical units for fixed-UPC items.
- Periscope Report is limited to meat-dept checklist categories, so saved grocery/produce items do not appear there.
- Duplicate sweep buttons are visually separated: green for counting units, red for removing dupes.
- Duplicate warning card on the Scan tab has a Unit button to count that duplicate immediately.
- Same-code ignore window is 1.0s and duplicate classification window is 2.0s for faster unit-count workflows.
- No-price/fixed-UPC duplicate scans automatically count as units; priced variable-weight labels still get duplicate protection.
- Clear Session also clears the Scan tab's in-memory recent scan log.
- No-price Beef/Ready-Made PLU repeats still get duplicate protection because they are likely checklist/reference barcodes.
- Removing duplicate scans from Session also removes matching duplicate rows from the Scan tab recent log.
- Counting an individual duplicate as a unit from Session also updates the matching Scan tab row.
- Priced variable-weight labels (weighed meat / ready-made meals) now treat an exact-barcode repeat as a duplicate for the whole count, not just a 2-second window, since the embedded price fingerprints each physical package. Genuinely different packages have different weights/prices/codes and still count separately; a rare exact-weight collision can still be kept via Count Unit.
- Show Periscope Report button moved to the top of the Session tab (with the report itself), so the count entry view is reachable without scrolling past the scan log.
- Counts list and Periscope Report now show category section headers (Beef / Ready-Made Meals) so the two sections read as distinct groups. Rows are grouped by category first, so a custom-saved item without a case position no longer splits its section with a duplicate header.
- New "View Case Layout" button on the Products tab (above the search bar) opens a paged, swipeable reference overlay of where each PLU sits in the physical cases, oriented from the clerk's side: Case 1 (Meat then Chicken, left) and Case 2 (Seafood, right), plus a Garnish Guide page. Flip with the arrows/swipe/left-right keys, close with X or Esc. Fully self-contained in caselayout.js — it does not touch the scan/count/session logic. Layout data is a best-effort transcription from case photos and is meant to be verified/edited against the physical case.
- Case Layout pages now use a top-down orientation: a Customer Glass banner on top, a Front row and a Back row (each left-to-right), and a Service Glass banner on the bottom — matching how the case physically sits. Known items are seeded into the Front row; Back rows are placeholders to be filled per case.
- The "possible duplicate" scan card now stays up (with its "Count as unit" button) until you tap it or scan the next item, instead of vanishing after 1.5s. This matters for the rare-but-real case of a second package that shares the exact same PLU AND weight — you now always have time to count it as a separate unit. The button label is clearer ("Count as unit").
- Case Layout rotated to two side-by-side columns — Customer Glass (front) on the left, Service Glass (back) on the right — so each row shows two PLUs (one front, one back).
- Ready-Made checklist reordered to column-major (straight down the columns) so the Counts / Periscope Report reads the same way as the beef sheet. Both sections are now consistent: read straight down each column.
- The Scan-tab "Scanned this session" log now rebuilds from the saved session after a reload or crash, so a mid-count refresh restores the visible scan list too (it used to go blank even though the counts survived). The session stays the single source of truth; the scan log just mirrors it on load.
- Case Layout is now a 2x2 grid per page (4 PLUs), from the clerk's side: top row = customer glass (far), bottom row = the PLUs closest to you (service glass), left to right. Each section chunks into as many 2x2 pages as it needs. Frosted plastic-divider markers are drawn between the pans (vertical + horizontal), matching the real case dividers.
- Case Layout data now has real front/back rows per position, transcribed from Kyle's full left-to-right case photos. front[i] and back[i] are the same physical position (front = customer/far, back = service/closest-to-you); a PLU can appear in both rows (e.g. Pollo Asado). Each 2x2 page shows two adjacent positions with their front (top) and back (bottom) pans. Still a best-effort DRAFT to verify against the case.

- Case Layout correction: PLU 8328 is Hot Honey Chipotle Thighs, and PLU 8349 Jamaican Jerk Thighs is now placed to the left of the wings group in Marinated Chicken.
- Case Layout now collapses odd one-position tail pages into 3-column pages, adds a separate Garnish Reference button, spaces the Products tools away from search, and uses accent-colored vertical case dividers instead of grey cross dividers.
- Case Layout paging control replaced the crowded one-dot-per-page row with a compact "N / total" page counter (a case can span ~14 pages).

## Fidelity Notes

- Scanner engine is **zbar WASM**, not ZXing.
- Known seed dataset is approximate because it was transcribed from a phone photo of the Periscope count sheet. Treat names as useful working labels, not final retail-display truth.
- If the phone appears stuck on old behavior, verify the build stamp in the lower-right corner and clear/reinstall the home-screen app if needed.
