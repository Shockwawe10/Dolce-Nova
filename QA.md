# QA.md — Dolce Nova

Measured 2026-11-16 and **re-measured 2026-11-17 after the redesign** (REDESIGN-GUIDE.md) on Windows 11 against the local Pages-like server (`node tools/serve.mjs`,
`http://localhost:4600/Dolce-Nova/`). Every number below comes from a script in `qa/` or `tests/` that
you can re-run (commands at the end). Failures are reported as failures.

**Scope note.** The original brief had a Stripe + Python + SQLite + nginx back end. On 2026-11-16 the
client changed scope to a static GitHub Pages site with a demo card checkout and no payment provider
(see BRIEF.md). The commerce acceptance criteria below were therefore **removed, not passed**.

## Summary

| Area | Criterion | Result |
|---|---|---|
| Design | ≤ 6 colours, exactly 2 families, scale-only font sizes, ≤ 3 radii, 8-px spacing | **PASS** · 6 colours, 2 families (EB Garamond, Figtree), 0 off-scale sizes (one listed exception, the footer wordmark), 1 radius plus square corners, 1 shadow, 0 off-grid spacing (WebKit and Chromium) |
| Design | Images never distorted (≤ 1%) | **PASS** · max 0% over 106 rendered images |
| Design | Natural width ≥ 1.5× displayed | **PASS at DPR 2** (min 1.53×) · DPR 1 **not re-run after the redesign** (it failed before, see below) |
| Motion | No `transition: all`, only transform/opacity animated | **PASS** (static scan of CSS and JS) |
| Motion | Reduced motion: no running animations after load | **PASS** · 0 on 5 page states (scroll reveals were removed by the owner, D3) |
| Motion | ≥ 95% of frames < 20 ms, scripted scroll + drawer | **PASS on the Chromium proxy with a GPU** (99.0% phone, 98.7% desktop, with the 3D section) · **FAIL with software WebGL** (88.0% to 94.0%) and **in WebKit at 3×** · **not run on a real iPhone** |
| Quality | Lighthouse mobile Performance ≥ 90, LCP < 2.5 s, CLS < 0.05 | **PASS on the live site after the redesign** · home 100 / 100 / 100 / 100, LCP 1.5 s, CLS 0, TBT 40 ms (before: 100, LCP 1.2 s) · local server 97, LCP 2.4 s; three.js not requested at load |
| Quality | axe WCAG 2.2 AA, no serious issues | **PASS** · 0 violations of any impact in 12 states |
| Quality | WebKit 390×844, 820×1180, 1440×900, 1920×1080: no clipped text, no horizontal overflow | **PASS** · 0 px overflow at all four; 0 clipped text in the audit; no coffee name overlaps its price at 320 to 430 px (`qa/shop-overlap.mjs`) |
| Quality | Inputs ≥ 16px, tap targets ≥ 44px | **PASS** · inputs 16px; 0 targets under 44px (inline text links exempt, listed in `qa/out/audit.json`) |
| Logic | Cart totals in integer cents | **PASS** · `node --test`: 8/8, including 50 random carts against a hand-typed price table |
| Flow | Add → drawer → checkout → confirmation | **PASS** in WebKit at 390×844 and 1440×900, locally and on the live site (`BASE=https://shockwawe10.github.io/Dolce-Nova/ node qa/flow.mjs`) |
| Secrets | `git grep` finds no `sk_test_` / `whsec_` | **PASS** · tree clean; full history has no key-shaped strings |
| Skill gate | design-taste-frontend `gate.mjs` | **OPEN 64** after the redesign (77 → 64 → 64); most are the kit's grid rules against the reference layout you chose; see below |

## Design (qa/audit.mjs)

Walks every rendered element and its `::before`/`::after` in five page states (home; home with the
filter grind chosen and the cart drawer open; checkout with errors; confirmation; credits) at
390×844, 820×1180, 1440×900 and 1920×1080, reading computed styles.

- Colours (text, backgrounds, visible borders): `#f6f1e7` `#ebe3d4` `#2b241e` `#6b5f53` `#d6cbb8`
  `#a3472b`: 5 + 1 accent. Shadow colour counted separately (one shadow style, the drawer).
- Families: EB Garamond, Figtree. Radii: square (0) and 999px. Spacing: every margin, padding and gap a multiple of 8.
- Image resolution is read from the file actually served (`currentSrc`), not `naturalWidth`, which
  WebKit reports density-corrected.
- **Resolution at DPR 1 fails the literal criterion.** On a 1× screen the browser correctly picks a
  1.1× to 1.4× file; reaching 1.5× there would mean declaring inflated `sizes` and sending every 1×
  visitor about 2.25× the bytes. I chose not to. Every phone and every Retina laptop is DPR 2 or 3,
  where the criterion passes with a minimum of 1.63×. The audit originally found real upscaling (0.75×)
  because `sizes` described the box, not the `object-fit: cover` render; that was fixed.

## Motion (qa/motion.mjs, qa/webkit-baseline.mjs)

**With the 3D roast path (current page).** Default headless Chromium renders WebGL in *software*
(SwiftShader), which no phone does, so the 3D page was also measured with this machine's GPU (ANGLE D3D11).
"First visit" includes the one-time 3D setup during the scroll; "already set up" measures steady state.

| Run | Frames < 20 ms | p95 | Worst |
|---|---|---|---|
| Chromium 390×844 @3×, 4× CPU, **hardware GPU**, first visit (**iPhone proxy**) | **99.0% of 667 (PASS)** | 16.8 ms | 217 ms (setup) |
| Chromium 1440×900 @2×, 4× CPU, **hardware GPU**, first visit | **98.7% of 691 (PASS)** | 16.8 ms | 217 ms (setup) |
| Chromium 390×844 @3×, 4× CPU, software GL, first visit | **89.8% of 451 (FAIL)** | 83.4 ms | 850 ms |
| Chromium 390×844 @3×, 4× CPU, software GL, already set up | **92.1% of 517 (FAIL)** | 83.3 ms | 233 ms |
| Chromium 1440×900 @2×, 4× CPU, software GL, first visit | **88.0% of 266 (FAIL)** | 233 ms | 2.3 s (setup) |
| Chromium 1440×900 @2×, 4× CPU, software GL, already set up | **94.0% of 430 (FAIL)** | 183 ms | 383 ms |
| WebKit 390×844 @1× | 97.6% of 665 (PASS) | 16.0 ms | 770 ms (setup) |
| WebKit 390×844 @3× | **18.0% of 239 (FAIL)** | 94 ms | |

Measured after the redesign (2026-11-17). Against the run before it: the GPU proxy held (98.7 / 98.8 → 99.0 /
98.7), software phone rose (82.9 → 89.8), and **software desktop first visit fell (98.7 → 88.0)**, with the same
2.3 s setup frame. Not investigated further: no visitor's browser renders WebGL in software, and runs on this
machine vary widely (see below). It is reported, not explained away.

Each first visit has one long frame while three.js is parsed and the scene is built (up to 0.25 s with a GPU,
longer in software). The setup starts in idle time after the first scroll, in short tasks, so on a real visit
it normally finishes while the visitor is still in the shop; a scripted 1,400 px/s fling reaches it sooner.
Finding and fixing: the first version re-rendered the 3D scene on every scroll event anywhere on the page;
it now renders only while the section is on screen and progress actually changed.

*Before the 3D section* (photo crossfade), for comparison: Chromium proxy 99.8% / 99.8%, WebKit @1× 98.7%,
WebKit @3× 12.6%; baselines in the same engine at 3×: bare text page 60.1%, bare text plus photos 42.9%.

Playwright's WebKit on Windows is software-rendered; at 3× even a page with nothing but text fails.
That does not prove the site is fine on an iPhone; it shows this machine cannot measure it.
**A real iPhone with Safari Web Inspector (Timelines → Rendering Frames) is the outstanding check.**
Investigating the WebKit numbers did find two real costs, both fixed: the roast crossfade wrote three
opacities per frame through a custom property and painted all four photos (now direct writes, skipped
when unchanged, at most two layers painted), and `will-change` on those layers measurably slowed it.

Frame-time measurements on this machine are noisy (a bare page ranged from 0% to 96% between runs
under background load); the table is one consecutive run.

## The 3D roast path

Added 2026-11-16 at your request ("a single bean ... from light green to light to medium to dark ... 3D").
three.js r185.1 (MIT), vendored in `site/assets/vendor/`. The whole 3D payload (three.js, RoomEnvironment,
the scene module) is 757 KB minified, 193 KB gzipped (measured), loaded only near the section.

- **Not on the first screen:** Lighthouse requests neither three.js nor the scene module at load
  (mobile: Performance 99, LCP 2.1 s, CLS 0, TBT 80 ms on the local server).
- **Stage pinned:** the sticky stage's top stays at 0 px across the scroll range (ios-sticky-stage check);
  it is sized in `lvh`, so Safari's toolbar cannot move it. Not verified on a device.
- **Fallbacks:** no WebGL, a failed import, a refused shader or a lost context all show the four real roast
  photographs (`qa/roast-fallback.mjs`: PASS, 4/4 photos). Without JavaScript the same photographs show.
- **Reduced motion:** progress snaps to the five states (intro, green, light, medium, dark) without
  easing; no CSS animation runs (`qa/motion.mjs`: 0 running).
- **Kit findings it adds** (`consistency.mjs`, not a gate round): `effect-kind` (the taste kit allows WebGL
  on a shop page only when the brief asks for 3D; you asked for it), `shader-lint` ×5 (it flags reserved
  words inside three.js's own shader library, `gl_DrawID`, `sampler3D`, `#include <common>`, code that runs
  on every major GPU; vendored code not edited), and `gl-fallback`, which was real and is fixed (a refused
  shader now shows the photographs instead of a bare gradient). The section is 4.6 screens, over the kit's
  two-screen limit, by design.
- **The bean is a render, not a photograph**: procedural geometry and physically based materials, colours
  chosen to match the roast photographs. The roast temperatures are general roasting knowledge.

**Checked against 3D-AND-DESIGN-GUIDE.md** (applied 2026-11-16 at your request):

| Guide rule | Check | Result |
|---|---|---|
| 6 / 10.2 Pixels, not state; pair `?qa` with an unlocked run and a forced quality step | `qa/roast-pixels.mjs` (bean pixels with the canvas shown vs hidden, at three stages) | **Found a real bug:** WebKit stopped presenting the WebGL canvas after any resize (0 bean pixels after a quality step, though the GL buffer held 24,660). Fixed with the guide's 7.1 architecture: off-screen renderer, frame copied into a 2D canvas. Now PASS in Chromium and WebKit, 1440 and 390, locked and unlocked |
| 8.2 No bare half screen in a pinned section | `qa/roast-coverage.mjs` (121 positions) | **Failed first** (text half bare at 27% of positions on desktop, 17% on a phone); fixed with sticky cards; now 121/121 at both sizes |
| 7 Compare against HEAD, interleaved | `qa/frames-compare.mjs`, 3 rounds, Chromium + GPU, 4x CPU | tree 98.9% / 98.6% of frames < 20 ms (phone / desktop) against HEAD 98.7% / 98.6%: the off-screen copy costs nothing measurable |
| 12 Phones at 360, 390 and 430 | `qa/roast-shots.mjs` | read by eye; a sliver of the previous card at 430 fixed (a full screen per card on phones) |
| 11 Live check in Chrome and WebKit | `BASE=<live> node qa/roast-pixels.mjs chromium` and `webkit` | **PASS** on https://shockwawe10.github.io/Dolce-Nova/ (deploy 430ad79, and again after the redesign, deploy 21d4f0a): bean pixels at every stage in both engines, at 1440 and 390, locked and unlocked |

## Accessibility (qa/a11y.mjs)

axe-core 4.10.3, tags wcag2a/aa, wcag21a/aa, wcag22aa, WebKit, 390 and 1440, six states each: home,
a row open with a grind chosen, the drawer open, checkout showing errors, confirmation, credits.
0 violations. axe also lists 0 to 2 "needs review" items per state (checks it cannot decide
automatically); these were **not reviewed one by one**. All text sits on flat grounds whose ratios are
computed in DESIGN.md, so none should fail, but that is an inference, not a check. Keyboard: the drawer traps focus, Esc closes it and returns
focus to the cart button, and the page behind is `inert` (asserted in `qa/flow.mjs`).

## Skill gate (design-taste-frontend)

**Redesign session (2026-11-17), project root, `site/index.html`: 77 → 64 → OPEN 64.** Real defects it found,
all fixed: the header's ink words over the hero photograph read 3.3:1 on a phone (now light words on a dark
top scrim); the hero's light words had an oat fallback ground (now roast, readable if the photo fails); the
recipe block's words started 16 px left of the page line at 1440 (the text half now sits on the `.wrap` line at
every width); "Huehuetenango" ran over its price at 320 px (the price drops under the meta on the narrowest
lists; `qa/shop-overlap.mjs` fails without the fix); the closing section had no button; the footer wordmark's
font box was clipped (room added below). Waivers changed: `product-shown` dropped (the hero is no longer a
split), `effect-kind` added (you asked for the 3D bean).

What stays open, by cause:

| Open | Count | Why it stays |
|---|---|---|
| `edge-left`, `edge-right`, `container-edges`, `split-pair`, `row-lines`, `flush` | 40 | The reference layout you chose: a thumbnail before each coffee name (Coffee Collective), half-and-half colour splits and full-bleed photographs, the asymmetric collage and the floating card (Canyon). The kit wants every block on one left line and inside the container. |
| `section-height`, `section-gaps`, `section-air`, `screen-height`, `one-section`, `empty-area`, `sparse` | 15 | The roast path is five screens by design (the 3D peak); the colour splits and the photo card are one viewport tall rather than the kit's measured screens; the manifesto on a phone fills 49% of its screen (the aim is 55%). |
| `shader-lint` | 4 | Reserved words inside three.js's own shader library (vendored, not edited). |
| `off-grid` | 2 | The recipe's hanging indent (wrapped lines align with the first word) and the second grind chip. |
| `text-contrast` | 1 | Ground on the terracotta block is 5.34:1: passes WCAG AA (4.5:1), not the kit's 7:1 for body text. Meeting it means dropping the colour block, a REDESIGN-GUIDE decision. |
| `collide` | 1 | The transparent header over the full-bleed hero (both references). |
| `scroll-reveal` | 1 | The 3D canvas fades in over the still once three.js is ready (a load crossfade, not a reveal). |

**Earlier sessions (before the redesign):**

Two gate sessions ran, three rounds each (the kit stops after three).

- **`site/` session:** 60 → 60 → **OPEN 35**, which drove the layout restructure.
- **Project-root session** (the one the Claude Code stop hook enforces): 37 → 27 → **OPEN 25 (final)**.
  Between rounds: the h1 now names what is sold ("Coffee that starts as a green bean."); the skip link sits
  inside the header's `.wrap`; the hero is one `.hero-text` block; the phone shop fits two screens; and two
  real keyboard bugs were fixed. Page-wide `scroll-behavior: smooth` made focus scrolling animate, so a
  Tab landed on a control still off-screen (now instant; smooth scrolling only on anchor clicks). And the
  focus ring of a selected radio was accent on roast at 2.54:1 (now `currentColor`).

| Open (final) | Count | Why it stays |
|---|---|---|
| `scroll-reveal` | 14 | **Your brief requires IntersectionObserver reveals**; you chose "brief wins where explicit". The kit cannot waive 14 findings. |
| `section-air`, `sparse`, `empty-area` | 5 | The roast peak is a two-screen sticky scroll moment (scroll-craft); a static checker sees its second screen as empty air. Also the closing screen's air above the footer links. |
| `split-pair` (shop head, coffee panel), `edge-right` | 3 | The grind preview and roast frames are capped at 480 to 504px by source resolution (no upscaling), so those splits do not reach the right edge. |
| `edge-left` | 2 | The hero photo and roast frames start on the 5/12 split line (623px), which `container-edges` accepts but `edge-left` does not. |
| `container-edges` | 1 | Chip text starts inside its pill (9px past the container line). |

Waived (5, in `.taste-skill/waivers.json`, not deployed): `pinned` (the scroll-craft roast peak),
`moment-none` (the bespoke peak replaces a kit moment), `no-visual` (shop visual capped by source
resolution), `product-shown` (the brief's split hero), `copy-headings` (the h3s are the product names).
The copy linter: 0 FAIL, 0 WARN. After the final round: design audit 0 violations, axe 0 in 12 states,
flow green.

## Skill rules I overrode, and why

| Rule | Skill | Override | Reason |
|---|---|---|---|
| No fade-in on scroll | taste | None now: reveals were removed on 2026-11-17 | Your decision D3 in REDESIGN-GUIDE.md |
| Dimensional, layered hero | scroll-craft | One full-bleed photograph, with slight depth on mouse/trackpad only | Your brief ("no parallax on touch") and decision D2 (the sack hero) |
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
node qa/shop-overlap.mjs                 # no coffee name over its price, 320 to 430 px
node tools/shoot.mjs                     # WebKit screenshots, 4 sizes -> qa/out/shots (add --reduced)
CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") \
  npx lighthouse http://localhost:4600/Dolce-Nova/ --only-categories=performance,accessibility,best-practices,seo
```
