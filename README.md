# Dolce Nova

A fictional single-origin coffee roastery: a static e-shop built as a portfolio piece. Plain HTML, CSS
and JavaScript with no framework and no runtime dependencies, deployed to GitHub Pages.

**Live:** https://shockwawe10.github.io/Dolce-Nova/ · **Demo shop:** nothing is charged, sent or stored.
Use the test card `4242 4242 4242 4242`, any future expiry, any CVC.

## What is in it

- **One page plus three:** `site/index.html` (hero, shop, origin, roast, brew, closing), `checkout.html`,
  `success.html`, `credits.html`.
- **Shop:** six coffees from `site/data/catalog.json` (prices in integer cents); grind and size choices;
  the grind preview swaps real photographs of each grind.
- **Cart drawer:** a modal dialog with focus trap, Esc to close, the page behind made `inert`, an
  iOS-safe scroll lock, and the count bumping on add.
- **Demo checkout:** local card checks (Luhn, expiry, CVC) only. Card fields never leave the page and
  never touch storage; only the order summary goes to `sessionStorage` for the confirmation page.
- **The roast path:** a real-time 3D bean (three.js, `site/assets/js/roast3d.js`) travels a drawn path as
  you scroll, turning green → light → medium → dark while the light warms, with a card for each stage. It
  loads only near the section, eases with a damped spring, renders only when something changed, adapts its
  resolution to the frame rate, and falls back to four real roast photographs without WebGL.

## Run locally

Requires Node 22+.

```bash
node tools/serve.mjs        # http://localhost:4600/Dolce-Nova/  (same base path as GitHub Pages)
node --test "tests/*.test.mjs"          # cart and card logic, no dependencies
```

The site itself needs no build step: `site/` is what gets deployed.

## Deploy (GitHub Pages)

1. Push to `main`.
2. Once only: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. `.github/workflows/pages.yml` runs the unit tests and publishes `site/`.

All asset paths are relative, so the site works under `/Dolce-Nova/` or at a domain root.

## QA tooling (dev only)

```bash
npm ci && npx playwright install chromium webkit
node qa/flow.mjs   node qa/audit.mjs   node qa/motion.mjs   node qa/a11y.mjs   node tools/shoot.mjs
```

Results and every failure are in **QA.md**.

## Rebuilding assets

- Photographs: `node tools/fetch-originals.mjs` (downloads originals to `assets-src/`, gitignored),
  then `node tools/images.mjs` (crops and encodes AVIF + WebP per width and writes the manifest), then
  `node tools/credits.mjs` (regenerates `credits.html`).
- Fonts: `node tools/fonts.mjs` (self-hosts the latin subsets and writes size-adjusted fallbacks).

## Documents

| File | What |
|---|---|
| `BRIEF.md` | The creative interview, journey, feeling curve, peak, scope change |
| `REFERENCE_NOTES.md` | Two reference sites measured from computed styles |
| `DESIGN.md` | Three comps, the pick and why, every token |
| `QA.md` | Acceptance results, overrides, what is not verified |

## Credits

Photographs are licensed stand-ins via Wikimedia Commons (CC0, CC BY, CC BY-SA); authors and licences
are on `credits.html`. Fonts: Fraunces and Figtree, SIL Open Font License. 3D: three.js r185.1, MIT
(`site/assets/vendor/three.LICENSE.txt`). Dolce Nova is fictional.
