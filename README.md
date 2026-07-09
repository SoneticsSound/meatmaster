# MeatMaster

An installable, offline-first phone app (PWA) for meat-department inventory
spot-checks: walk the case, scan each package, count it, export it.

- **Install:** open the site in mobile Safari → Share → **Add to Home Screen**.
- **Works offline** — the app runs entirely on the phone once installed.
- Plain HTML/CSS/JS, no build step. The whole app is in this folder.

Barcode scanning uses zbar WebAssembly (bundled in `vendor/zbar/`) because it
handles real package-label photos, rotation, and GS1/DataBar-style labels better
than the earlier ZXing prototype.
