# MeatMaster Version Fidelity

Current app version: **v0.16.19**

Last synced: 2026-07-13

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

## Fidelity Notes

- Scanner engine is **zbar WASM**, not ZXing.
- Known seed dataset is approximate because it was transcribed from a phone photo of the Periscope count sheet. Treat names as useful working labels, not final retail-display truth.
- If the phone appears stuck on old behavior, verify the build stamp in the lower-right corner and clear/reinstall the home-screen app if needed.
