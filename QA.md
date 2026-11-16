# QA.md — Dolce Nova

Measured 2026-11-16 on Windows 11 against the local Pages-like server (`node tools/serve.mjs`,
`http://localhost:4600/Dolce-Nova/`). Every number below comes from a script in `qa/` or `tests/` that
you can re-run (commands at the end). Failures are reported as failures.

**Scope note.** The original brief had a Stripe + Python + SQLite + nginx back end. On 2026-11-16 the
client changed scope to a static GitHub Pages site with a demo card checkout and no payment provider
(see BRIEF.md). The commerce acceptance criteria below were therefore **removed, not passed**.

## Summary

| Area | Criterion | Result |
|---|---|---|
| Design | ≤ 6 colours, exactly 2 families, scale-only font sizes, ≤ 3 radii, 8-px spacing | **PASS** · 6 colours, 2 families, 0 off-scale sizes, 2 radii, 1 shadow, 0 off-grid spacing (WebKit and Chromium) |
| Design | Images never distorted (≤ 1%) | **PASS** · max 0% over 44 rendered images |
| Design | Natural width ≥ 1.5× displayed | **PASS at DPR 2** (min 1.63×) · **FAIL at DPR 1** (min 1.12×, 20 instances; none upscaled) |
| Motion | No `transition: all`, only transform/opacity animated | **PASS** (static scan of CSS and JS) |
| Motion | Reduced motion: no running animations after load | **PASS** · 0 on 5 page states, 0 hidden reveal targets |
| Motion | ≥ 95% of frames < 20 ms, scripted scroll + drawer | **PASS on the Chromium proxy** (99.8%) · **FAIL in WebKit at 3×** (see below) · **not run on a real iPhone** |
| Quality | Lighthouse mobile Performance ≥ 90, LCP < 2.5 s, CLS < 0.05 | **PASS on the live site** · home 100, LCP 1.2 s, CLS 0, TBT 50 ms · checkout 100, LCP 1.2 s, CLS 0 (local server: 98 / 2.0 s) |
| Quality | axe WCAG 2.2 AA, no serious issues | **PASS** · 0 violations of any impact in 12 states |
| Quality | WebKit 390×844, 820×1180, 1440×900, 1920×1080: no clipped text, no horizontal overflow | **PASS** · 0 px overflow at all four (and reduced motion); 0 clipped text in the audit |
| Quality | Inputs ≥ 16px, tap targets ≥ 44px | **PASS** · inputs 16px; 0 targets under 44px (inline text links exempt, listed in `qa/out/audit.json`) |
| Logic | Cart totals in integer cents | **PASS** · `node --test`: 8/8, including 50 random carts against a hand-typed price table |
| Flow | Add → drawer → checkout → confirmation | **PASS** in WebKit at 390×844 and 1440×900, locally and on the live site (`BASE=https://shockwawe10.github.io/Dolce-Nova/ node qa/flow.mjs`) |
| Secrets | `git grep` finds no `sk_test_` / `whsec_` | **PASS** · tree clean; full history has no key-shaped strings |
| Skill gate | design-taste-frontend `gate.mjs` | **OPEN 35** after 3 rounds (60 → 60 → 35); see below |

## Design (qa/audit.mjs)

Walks every rendered element and its `::before`/`::after` in five page states (home; home with the
filter grind chosen and the cart drawer open; checkout with errors; confirmation; credits) at
390×844, 820×1180, 1440×900 and 1920×1080, reading computed styles.

- Colours (text, backgrounds, visible borders): `#f6f1e7` `#ebe3d4` `#2b241e` `#6b5f53` `#d6cbb8`
  `#a3472b`: 5 + 1 accent. Shadow colour counted separately (one shadow style, the drawer).
- Families: Fraunces, Figtree. Radii: 4px, 999px. Spacing: every margin, padding and gap a multiple of 8.
- Image resolution is read from the file actually served (`currentSrc`), not `naturalWidth`, which
  WebKit reports density-corrected.
- **Resolution at DPR 1 fails the literal criterion.** On a 1× screen the browser correctly picks a
  1.1× to 1.4× file; reaching 1.5× there would mean declaring inflated `sizes` and sending every 1×
  visitor about 2.25× the bytes. I chose not to. Every phone and every Retina laptop is DPR 2 or 3,
  where the criterion passes with a minimum of 1.63×. The audit originally found real upscaling (0.75×)
  because `sizes` described the box, not the `object-fit: cover` render; that was fixed.

## Motion (qa/motion.mjs, qa/webkit-baseline.mjs)

| Run | Frames < 20 ms | p95 |
|---|---|---|
| Chromium 390×844 @3×, 4× CPU throttle (**iPhone proxy**) | 99.8% of 507 | 16.8 ms |
| Chromium 1440×900 @2×, 4× CPU throttle | 99.8% of 513 | 16.8 ms |
| WebKit 390×844 @1× | 98.7% of 532 | 17.0 ms |
| WebKit 390×844 @3× | **12.6% of 239 (FAIL)** | 78 ms |
| *Baseline:* WebKit @3×, bare text page | 60.1% | 22 ms |
| *Baseline:* WebKit @3×, bare text + the site's photos | 42.9% | 31 ms |

Playwright's WebKit on Windows is software-rendered; at 3× even a page with nothing but text fails.
That does not prove the site is fine on an iPhone; it shows this machine cannot measure it.
**A real iPhone with Safari Web Inspector (Timelines → Rendering Frames) is the outstanding check.**
Investigating the WebKit numbers did find two real costs, both fixed: the roast crossfade wrote three
opacities per frame through a custom property and painted all four photos (now direct writes, skipped
when unchanged, at most two layers painted), and `will-change` on those layers measurably slowed it.

Frame-time measurements on this machine are noisy (a bare page ranged from 0% to 96% between runs
under background load); the table is one consecutive run.

## Accessibility (qa/a11y.mjs)

axe-core 4.10.3, tags wcag2a/aa, wcag21a/aa, wcag22aa, WebKit, 390 and 1440, six states each: home,
a row open with a grind chosen, the drawer open, checkout showing errors, confirmation, credits.
0 violations. axe also lists 0 to 2 "needs review" items per state (checks it cannot decide
automatically); these were **not reviewed one by one**. All text sits on flat grounds whose ratios are
computed in DESIGN.md, so none should fail, but that is an inference, not a check. Keyboard: the drawer traps focus, Esc closes it and returns
focus to the cart button, and the page behind is `inert` (asserted in `qa/flow.mjs`).

## Skill gate (design-taste-frontend)

Three rounds, then the kit says stop. Round 1: 60 FAIL; round 2: 60 (different mix after the
restructure); round 3: **OPEN 35**, with 3 waivers accepted (2 more matched nothing by round 3).

| Open | Count | Why it stays |
|---|---|---|
| `scroll-reveal` | 14 | **Your brief requires IntersectionObserver reveals**; you chose "brief wins where explicit". The kit cannot waive 14 findings. |
| `section-air`, `sparse`, `empty-area`, `section-gaps` | 6 | The roast peak is a two-screen sticky scroll moment (scroll-craft); a static checker sees its second screen as empty air. Also the closing screen's air above the footer links. |
| `split-pair` (shop head, coffee panel), `edge-right` | 3 | The grind preview and roast frames are capped at 480 to 504px by source resolution (no upscaling), so those splits do not reach the right edge. |
| `edge-left` | 2 | The hero photo and roast frames start on the 5/12 split line (623px), which the kit's `container-edges` check accepts but `edge-left` does not. |
| `container-edges` | 4 | The skip link (off-screen until focused) and the header measured with it; chip text starting inside its pill; the hero's `.wrap` not using the kit's `.hero-text` class name. |
| `product-shown` | 1 | Your brief fixes a split hero with one product image; the kit wants the product at 80% of the width. |
| `screen-height` (390) | 1 | The shop is 2.3 screens tall on a phone with a row open, so it is not exactly two screens. |
| `button-styles`, `focus-visible` ×2, `effect-kind` | 4 | **Fixed after round 3** (no rounds left to re-run the gate): one button size; focus ring on the whole row and on the whole pill; the unused `data-moment` mark removed. axe and the flow re-ran green afterwards. |

Waived (in `site/.taste-skill/waivers.json`, not deployed): `pinned` (the scroll-craft roast peak),
`no-visual` (shop visual capped by source resolution), `copy-headings` (the h3s are the product names).
The copy linter: 0 FAIL, 0 WARN.

## Skill rules I overrode, and why

| Rule | Skill | Override | Reason |
|---|---|---|---|
| No fade-in on scroll | taste | Reveals on headings, copy and photos, once, ≤ 60 ms stagger | Your brief, explicitly; your decision on conflicts |
| Dimensional, layered hero | scroll-craft | One photograph, with slight depth on mouse/trackpad only | Your brief: "one product image", "no parallax on touch" |
| Every page deals a kit moment | taste | A bespoke roast peak instead | scroll-craft requires a bespoke signature and peak; the interview chose them |
| Text left, visual right on every split | taste | Applied everywhere | (followed after round 1) |
| Product at 80% width on a product page | taste | Split hero | Your brief |

ub-mode names `crapper`, `dryer` and `mutator` tools that do not exist in this repository. A small
mutation tester was written for the old Python commerce code (12/12 killed); it was deleted with that
code when scope changed. The JavaScript logic is covered by `node --test` (8 tests, behaviour-level).

## Removed by the scope change (not passed)

Stripe Checkout, signature-verified idempotent webhooks, the SQLite orders table and state machine,
nginx proxy and rate limit, and the manual Stripe tests (success, decline, 3-D Secure, abandoned →
expired, `amount_total` match, Dashboard match). That work was built and tested (17 HTTP tests, 12/12
mutants killed, `nginx -t` OK) and remains in git history at commit `02c20db`.

## Assumptions and what is not verified

- **"Looks premium" is a judgement.** These checks only bound it: a page can pass all of them and still
  look ordinary. The bar used was the two measured references and the comp review in DESIGN.md.
- **No real iPhone was tested.** Touch scrolling, Safari's address-bar resizing (`svh`/`lvh` sections),
  and real GPU frame times are unverified until checked on a device.
- **Lighthouse on the live site** (https://shockwawe10.github.io/Dolce-Nova/, Lighthouse 12.8, mobile):
  home 100 / 100 / 100 / 100 (Performance, Accessibility, Best Practices, SEO); checkout 100 / 100 / 100,
  SEO 60 because the checkout page is deliberately `noindex`. Simulated throttling, one run each.
- **Photographs are licensed stand-ins**, not the brand's coffee (credits page). The library had no
  coarse-grind photograph under a free licence, so the cafetière grind was dropped rather than faked.
- **Roast temperatures** (first crack near 196 °C, second near 224 °C) and the 12-minute roast are
  general roasting knowledge, not measurements from a real roaster. The brew recipe is a common
  starting point.
- **Aesop**, the first reference choice, served a bot check to the measuring browser and was replaced.
- **The demo checkout validates the card format only** (Luhn, expiry, CVC). It never sends or stores
  card data; `qa/flow.mjs` asserts no card digits remain in storage after an order.

## Reproduce

```bash
npm ci                                   # Playwright 1.62.1, axe-core, Lighthouse (dev only)
npx playwright install chromium webkit   # if the browsers are not installed yet
node tools/serve.mjs &                   # http://localhost:4600/Dolce-Nova/
node --test "tests/*.test.mjs"                       # cart and card logic
node qa/flow.mjs                         # purchase flow, WebKit
node qa/audit.mjs                        # design audit (add --engine chromium, --dpr 1)
node qa/motion.mjs                       # motion criteria
node qa/webkit-baseline.mjs              # WebKit frame-time floor on this machine
node qa/a11y.mjs                         # axe
node tools/shoot.mjs                     # WebKit screenshots, 4 sizes -> qa/out/shots (add --reduced)
CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") \
  npx lighthouse http://localhost:4600/Dolce-Nova/ --only-categories=performance,accessibility,best-practices,seo
```
