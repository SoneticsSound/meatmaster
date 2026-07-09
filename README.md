# MeatMaster

An installable, offline-first phone app (PWA) for meat-department inventory
spot-checks: walk the case, scan each package, count it, export it.

- **Install:** open the site in mobile Safari → Share → **Add to Home Screen**.
- **Works offline** — the app runs entirely on the phone once installed.
- Plain HTML/CSS/JS, no build step. The whole app is in this folder.

Barcode scanning uses [ZXing](https://github.com/zxing-js/library) (bundled in
`vendor/`). See in-code comments in `scanner.js` for two important workarounds.
