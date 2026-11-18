# QA.md — Dolce Nova

Measured on Windows 11 against the local Pages-like server (`node tools/serve.mjs`,
`http://localhost:4600/Dolce-Nova/`) and on the live site. Every number comes from a script in `qa/` or
`tests/` that you can re-run (commands at the end). Failures are reported as failures.

**Scope note.** The original brief had a Stripe + Python + SQLite + nginx back end. On 2026-11-16 the
client changed scope to a static GitHub Pages site with a demo card checkout and no payment provider
(see BRIEF.md). The commerce acceptance criteria below were therefore **removed, not passed**.

## Current version: the global redesign (2026-11-17)

The bag carousel, a product page per coffee, the palette and type from the bags (DESIGN.md). The QA
scripts were moved to the new purchase path (carousel → product page → cart → checkout) before measuring.

| Area | Criterion | Result |
|---|---|---|
| Design | ≤ 6 colours, exactly 2 families, scale-only sizes, ≤ 3 radii, 8-px spacing | **PASS** · 6 colours, Instrument Serif + Instrument Sans, 0 off-scale sizes (the footer wordmark is the one listed exception), radii 0 and 999px, 1 shadow, 0 off-grid spacing, 0 violations (WebKit, 4 sizes × 5 states, home and a product page) |
| Design | Images never distorted; natural width ≥ 1.5× displayed (DPR 2) | **PASS** · 73 images, max distortion 0%, min density 1.58×. The bag renders are 1024px, so the hero bag is held to 640px and the product-page bag to 628px |
| Motion | No `transition: all`; only transform/opacity animate | **PASS** (static scan; the header's colour change is instant, not animated) |
| Motion | Reduced motion: nothing running | **PASS** · 0 animations on 5 page states |
| Motion | ≥ 95% of frames < 20 ms | **PASS with a GPU** (Chromium proxy, 4× CPU: 98.4% phone, 98.6% desktop, first visit with the 3D setup; still-life bean) · **FAIL with software WebGL**: phone 91.1% / 94.8%, desktop 98.2% first visit and **82.1% steady state** (77.1% with the path, 94.0% before the global redesign; not investigated) · WebKit 1× 96.2% (PASS), 3× 15.4% (FAIL, software-rendered here) · **not run on a real iPhone** |
| Quality | Lighthouse mobile ≥ 90, LCP < 2.5 s, CLS < 0.05 | Local server: home 98, LCP 2.2 s, CLS 0 · product page 97, **LCP 2.6 s (FAIL locally)**: Lighthouse attributes 600 ms to render-blocking CSS sent uncompressed by the local server (GitHub Pages compresses). Live results in "Live checks" below. three.js is not requested at load on either page |
| Quality | axe WCAG 2.2 AA | **PASS** · 0 violations in 12 states (home, a product page with a grind chosen, a product page with the drawer open, checkout with errors, confirmation, credits; at 390 and 1440) |
| Quality | No horizontal overflow at 390, 820, 1440, 1920 | **PASS** · 0px on the home page and a product page at all four |
| Quality | Captions never overlap, 320 to 430px | **PASS** · `qa/shop-overlap.mjs` (carousel captions and the product title) |
| Logic | Cart totals in integer cents; pages agree with the catalog | **PASS** · `node --test`: 20/20 (11 shop and page tests, 5 roast-state, 4 order) (the hand-typed price table moved to 340 g; `tests/pages.test.mjs` checks every product page and the carousel against `catalog.json`) |
| Flow | Home → carousel → product page → espresso, 1 kg, ×2 → drawer → checkout → confirmation | **PASS** in WebKit at 390×844 and 1440×900 (desktop uses the next arrow; phone swipes) |
| Carousel by wheel, plain arrows; oat origin (2026-11-18) | Hover and scroll moves the row, not the page; the page scrolls on at the row's end; arrows plain, under the line, landing on slides | **PASS** · `qa/carousel-check.mjs` in Chromium and WebKit at 1440 (it failed on every point against the previous carousel). The origin block on oat: its tag reads 5.55:1 (soft ink on oat); audit 0; axe 0 in 12 states; flow and parallax PASS |
| Parallax and a shorter close (2026-11-17) | Background photographs drift; no edge shows; still sharp; still under reduced motion; no cost | **PASS** · `qa/parallax-check.mjs`: all 4 home frames and the product page's landscape drift, no frame edge shows and every photograph stays 1.5× or sharper at 1280, 1440 and 1920 (the brew photographs gained 2880 and 3600px files for it); nothing moves under reduced motion. Hero alignment still PASS at six sizes. Against HEAD (Chromium + GPU, 4× CPU, 3 rounds): tree 98.5% / 98.3% of frames under 20 ms, HEAD 98.8% / 98.2%. The close is 694px at 1800×964 (was the full window) |
| Demo markings removed (2026-11-17) | No demo or "fictional" wording left on the pages | **PASS** · a search of every page finds none; one line stays at the payment step and one on the confirmation (BRIEF.md says why); the flow checks the confirmation line |
| Origin on product pages (2026-11-17) | A licensed landscape, a story and facts on every coffee page | **PASS** · `tests/pages.test.mjs` (each page shows its own landscape and title, two paragraphs, four facts); audit 0 at 4 sizes with the landscapes measured (2880px files cover the 1920 band at 1.5×); axe 0; no overflow |
| Roast slider (2026-11-17) | Four batches, one slider: words, keys, marks and the 3D in step; beans and slider on one screen | **PASS** · `tests/roast-state.test.mjs` (6, written first: the slider's 20 to 230 °C scale with the marks at 60, 75 and 90; the batches start green together and each stops at its stage, never lightening, never passing it; poses constant; the phases in order; every grain lands in time). `qa/roast-slider.mjs` at 1440×900, 390×844, 360×640: End, Home, ArrowRight and the 196 °C mark set the readout, aria-valuetext, note and each batch's status; the 3D settles on the slider's value; beans and slider span 331 to 493px of a 576 to 836px screen. Bean pixels PASS in WebKit and Chromium at 20, 196 and 230 °C, locked and unlocked with a forced quality step. Fallback 4/4 photographs. Smoothness against HEAD (Chromium + GPU, 4× CPU, 3 rounds): tree 98.8% / 98.8%, HEAD 98.7% / 98.7%. The page is 7.8 screens at 1440 (11.9 with the pinned roast). `qa/roast-coverage.mjs` and `qa/roast-shots.mjs` retired with the pinned section |
| Brew tabs (2026-11-17) | Three recipes by click and keyboard; the photograph follows; no layout shift | **PASS** · `qa/brew-tabs.mjs` at 1440 and 390: click, ArrowRight (and its wrap), End and Home each select one recipe, show only it and its photograph, move focus; the section stays 928px (1440) and 1317px (390) throughout. axe 0 on the home page with the tabs; audit 0 |
| Collage and bean pose (2026-11-17) | All collage photographs in black and white and larger; the bean's cut visible | Audit 0 at 4 sizes (min density 1.5× or more, the tall frame now has 1920 and 2400px files); bean pixels PASS in WebKit and Chromium with the face-on pose (115k to 142k pixels); roast words 61/61 at three sizes |
| Hero alignment (2026-11-17) | The words line up with the bag on desktop | **PASS** · `qa/hero-align.mjs` at 1024, 1280, 1440, 1876, 1920 and 2560: centres 7 to 10px apart, text top and bottom within 7 to 63px of the bag's printed body; before the change 67 to 162px apart (it failed at every size). The hero is 623 to 804px, under the window, which the kit's "hero is exactly one screen" rule does not want: the owner's request wins |
| Checkout (2026-11-17) | Contact, address, shipping, card; totals with shipping; the confirmation email | **PASS** · `qa/flow.mjs`: an empty form marks all eight required fields and focuses the email; Standard is Free at €112.00, Express adds €9.90 (€121.90); the arrival window is shown; a bad card is caught; the confirmation's email preview carries the address, Express, €9.90, €121.90, the arrival dates and the lines; no card digits in storage. `tests/order.test.mjs` (4): the €40 threshold, working days skipping weekends, the two windows from a fixed date, every required field and the email shape. axe 0 on the checkout with errors and on the confirmation with its email |
| Email | A real email to the customer | **Not built, by choice** (preview only, BRIEF.md): a static site needs an outside sender and the owner's account |
| 3D (still-life bean, 2026-11-17) | The bean never turns; it gathers at the start; pixels; words always whole; fallback | **PASS** · `tests/roast-state.test.mjs` (5: one pose at 1,001 positions, assembly 0 to 1 by p = 0.2, stages reached exactly, every grain lands before the assembly ends, reduced motion snaps to the four stages; written first and failing). Bean pixels in WebKit and Chromium, 1440 and 390, locked and unlocked with a forced quality step (89k to 133k pixels, about five times the old path's bean). `qa/roast-coverage.mjs` rewritten for the new layout: the words whole under the header, one stage marked and its own note shown, 61/61 positions at 1440×900, 390×844 and 360×640. Fallback 4/4 photos |
| 3D smoothness against the previous commit | Guide rule 7: tree vs HEAD, interleaved, Chromium + GPU, 4× CPU, 3 rounds | tree 98.2% / 98.5% of frames < 20 ms (phone / desktop) against HEAD 98.8% / 98.6%: the larger bean and the grains cost 0.6 points on the phone proxy, 0.1 on desktop, both above 95% |
| Skill gate | design-taste-frontend `gate.mjs` | **OPEN 60** after the still-life roast (63 → 61 → 60; the version before: OPEN 55); see below |

**Gate session after the still-life roast (2026-11-17): 63 → 61 → OPEN 60.** One real finding, fixed: the stage
list faded on a timer whenever the stage changed, which the kit reads as a scroll reveal; the list and the notes
now follow the bean's eased roast continuously (no timed fades), so the words and the bean move as one. The five
findings more than the version before come from the two changes asked for: the shorter origin block lets 64px of
the roast section show under it (`neighbour`, plus `section-air`, `one-section`, `sparse`), and the pinned
bean screen is flagged at 390 as well as 1440 (`pinned`; one waiver names one finding, and five are allowed).
`section-tile`: the carousel section is 1.09 screens at 1440 (before this change too).

**Gate session for this version.** Real defects it found, all fixed: the carousel's off-screen bags were
lazy and never loaded at 390 (they now load with the page at low priority; lazy only on product pages,
where the row is far below the fold); the footer wordmark's box ran 10px past the page line (the tracking
after its last letter is gone, R re-measured); the hero had lost its load entrance; the 3D canvas faded in
as it scrolled into view (now shown at once). Its four `focus-visible` findings were the checker reading
the page's paper behind the clear header, while the ring is paper on the hero's ink (15.8:1, seen in a
screenshot); the bar now carries that ink as its own background, which changes nothing on screen.

| Open (final) | Count | Why it stays |
|---|---|---|
| `edge-left`, `edge-right`, `container-edges`, `row-lines`, `flush`, `split-pair` | 27 | The reference layout: the carousel bleeding off the right edge (Canyon), full-bleed colour halves and photographs (Coffee Collective), the collage and the floating card (Canyon) |
| `section-gaps`, `section-height`, `section-air`, `one-section`, `empty-area`, `sparse` | 22 | The five-screen roast path (the owner's 3D peak); colour splits and the photo card sized to the viewport, not the kit's measured screens; the manifesto on a phone |
| `shader-lint` | 4 | Reserved words inside three.js's own shader library (vendored, not edited) |
| `button-styles` | 1 | Paper on the ink hero, forest on paper, and the outline: one shape and size, two fills because a paper button disappears on paper and a forest one sinks into ink |
| `off-grid` | 1 | The recipe list's hanging indent |

Waived (5): `pinned` and `moment-none` (the roast path), `effect-kind` (the 3D the owner asked for),
`copy-headings` (the slide headings are the coffees' names), `product-shown` (the kit wants the hero product
at 80% of the content width; the bag renders are 1024px, so that would upscale past the 1.5× rule).

**Live checks** (deploy 343a00d, https://shockwawe10.github.io/Dolce-Nova/): Lighthouse mobile, home
94 / 100 / 100 / 100, LCP 1.5 s, CLS 0, TBT 280 ms; product page (Nyeri) 98 / 100 / 100 / 100, LCP 1.4 s,
CLS 0. Bean pixels PASS in Chromium and WebKit (8 runs); no caption overlaps at six phone widths.
**The flow FAILED at 1440 live:** the price on the Add button stayed at €22.50 after choosing 1 kg.

**Two real bugs found by that failure, both fixed, both older than this redesign in part:**

1. *Product page:* the form's listeners attached only after `catalog.json` had downloaded, so a size picked
   on a slow connection left the old price on the button (and an early Add did nothing). Each size now
   carries its price in the markup, the listeners attach at once, and Add waits for the catalog.
2. *Checkout (present since the first build):* before `checkout.js` ran, pressing Enter in a card field
   submitted the form natively as a GET and **put the typed card number in the page URL**
   (`checkout.html?number=4242+4242+4242+4242`), into history and server logs. The pay button now ships
   `disabled` in the HTML, which blocks implicit submission, and the script enables it once the order is
   ready.

`qa/flow.mjs` now delays `catalog.json` by 1.5 s on every run (it failed at both sizes without fix 1) and
blocks `checkout.js` once to press Enter in the card field (it showed the card number in the URL without
fix 2; with it, the URL is unchanged). **Re-checked live after the fix (deploy 4bd89e0): flow PASS at 390 and 1440, no native submit PASS.**

## Previous versions (kept for the record)

### Summary

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
node qa/shop-overlap.mjs                 # no caption or title overlaps, 320 to 430 px
node qa/roast-slider.mjs                 # the roast slider: keys, marks, words and the 3D in step; one screen
node qa/hero-align.mjs                   # the hero's words line up with the bag, 1024 to 2560 px
node qa/brew-tabs.mjs                    # the brew recipes switch by click and keyboard without moving the page
node qa/parallax-check.mjs               # background photographs drift, never show an edge, stay sharp
node qa/carousel-check.mjs               # the coffee row scrolls with the wheel; plain arrows land on slides
node tools/shoot.mjs                     # WebKit screenshots, 4 sizes -> qa/out/shots (add --reduced)
CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())") \
  npx lighthouse http://localhost:4600/Dolce-Nova/ --only-categories=performance,accessibility,best-practices,seo
```
