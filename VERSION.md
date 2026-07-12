# MeatMaster Version Fidelity

Current app version: **v0.16.1**

Last synced: 2026-07-09

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
- Exact same barcode repeats are suppressed for 10 seconds to prevent duplicate-toast loops.
- Duplicate scan rows are marked with a small badge and can be swiped to Confirm or Remove.
- Rescan now clears toast state, resets same-code cooldown, and restarts the decode loop if needed.
- Duplicate entries in both scan logs use red warning styling and show product names when a barcode is mapped.
- Sessions can be saved locally, cleared from the Session tab, and selected from Export.
- Scan tab recent entries use the same red duplicate styling and swipe actions as Session.
- Save Session auto-names sessions from the local saved date and time.
- Confirming a duplicate now only affects duplicate rows and leaves a green Confirmed badge.
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

## Fidelity Notes

- Scanner engine is **zbar WASM**, not ZXing.
- Known seed dataset is approximate because it was transcribed from a phone photo of the Periscope count sheet. Treat names as useful working labels, not final retail-display truth.
- If the phone appears stuck on old behavior, verify the build stamp in the lower-right corner and clear/reinstall the home-screen app if needed.
