## Browser worker assets

These files are copied from the exact package versions in `package-lock.json`
so vinext serves them as static browser assets instead of evaluating them as
application modules:

- `pdf.worker-6.2.108.min.mjs` from `pdfjs-dist` 6.2.108
- `tesseract-7.0.0.min.js` and `tesseract-worker-7.0.0.min.js` from
  `tesseract.js` 7.0.0

Both upstream projects are distributed under the Apache License 2.0. Their
license notices remain embedded in the copied files and are also available in
the installed packages.
