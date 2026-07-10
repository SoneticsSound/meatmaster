# MeatMaster Version Fidelity

Current app version: **v0.13.0**

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

## Fidelity Notes

- Scanner engine is **zbar WASM**, not ZXing.
- Known seed dataset is approximate because it was transcribed from a phone photo of the Periscope count sheet. Treat names as useful working labels, not final retail-display truth.
- If the phone appears stuck on old behavior, verify the build stamp in the lower-right corner and clear/reinstall the home-screen app if needed.
