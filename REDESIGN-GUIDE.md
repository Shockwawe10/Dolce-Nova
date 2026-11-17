# REDESIGN-GUIDE.md — Dolce Nova × two references

How to rebuild Dolce Nova so it carries the principles and feeling of **Coffee Collective**
(coffeecollective.dk) and **Canyon Coffee** (canyoncoffee.co), without copying either. Written so a model or a
developer can build it step by step and prove each step.

Owner's words (2026-11-17, verbatim): "I found two reference websites that which designs I really liked. I want
you to go through each one of them and, you know, combine the ideas and the styling from each of them and apply
it to our website. I don't want to make the exact copy, but I want to make I want to catch the principles and
feeling of each of them and do it here. Write exactly guide how to do that for the models to actually able to
build it."

**Read first, in this order:** `CLAUDE.md` (project rules), `LESSONS.md`, `3D-AND-DESIGN-GUIDE.md` (binding
for all design and 3D work), `BRIEF.md`, `DESIGN.md` (current tokens), then this file. Where this guide and
those files disagree, **section 3 lists the conflicts; stop and ask the owner** (3D guide rule 2.2: record
their answer verbatim in BRIEF.md).

---

## 1. What each reference does, measured

Measured 2026-11-17 in Chromium from computed styles (`node tools/ref-measure.mjs <url> <label>`) and read
screen by screen (`node tools/ref-frames.mjs <url> <label>`, sheets in `qa/out/refs/frames/`, not committed).
Both sites show a newsletter pop-up that covers part of every frame; it is theirs, not a principle.

### 1.1 Coffee Collective: Nordic, calm, a working shop

| Measured | Value | The principle behind it |
|---|---|---|
| Families | **one** grotesk (NB International Pro) for everything | One voice. Hierarchy comes from size and space, not from mixing faces |
| Text sizes | 12, 14, 16 for nearly all text; headings 25.6 / 48 / 54 (desktop), 30 (phone) | **UI type is small and quiet**; only a few headings are large |
| Headings | weight 400, tracking −0.46 px, line height ≈ 1.0 to 1.15 | Large type is light and tight, never bold |
| Grounds | `#faf6ed` cream and `#f1ede3` (a step darker) | Two near-identical warm grounds separate sections without lines |
| Ink | `#4c4341` warm brown-grey (not black) | Soft contrast, warm everywhere |
| Colour blocks | deep green `#343e3b`, wine `#a35056` | **Whole half-screens of solid colour** carry a chapter (a coffee's notes, the subscription) |
| Radii, shadows | none, none | Square photos, square tiles, square outline buttons |
| Spacing | 8, 16, 40, 56, 80, 112 px | A strict 8-px rhythm, wide section padding |
| Sections | ≈ 1 screen each, 7.5 screens in all | One idea per screen |
| Motion | 200 to 300 ms, `ease`, opacity and transform only, no scroll reveals | Motion is hover feedback, nothing else |
| Composition | full-bleed photo hero with a small headline bottom-left and one outline button; product tiles on a tinted ground with a tiny uppercase tag; **split chapter: photo half + colour half**; arrow-bullet lists; a strip of real place photos; footer ends on the wordmark set huge | A shop that feels made by people, organised like a newspaper |

### 1.2 Canyon Coffee: editorial, still life, a magazine

| Measured | Value | The principle behind it |
|---|---|---|
| Families | **two**: a geometric sans (Circular) for UI at 13 to 14 px, a classic serif (Adobe Garamond) for statements | **The serif speaks, the sans labels** |
| Statement type | serif 28 px on line height 44.8 (1.6), tracking −0.56; larger 44 to 56 on desktop | Long sentences set large and airy read like a magazine standfirst |
| Ground | ≈ `#f4f2ee` (measured lab(95.9 0.2 2.2)), white panels | Almost white, slightly warm |
| Ink | ≈ `#333333` (lab 21.2), grey ≈ `#6e6e6e` (lab 46.6) | Neutral dark grey, never pure black |
| Radii | almost none; pills only for small controls | Square editorial frames |
| Motion | 400 ms `cubic-bezier(0.25, 1, 0.5, 1)` and `cubic-bezier(0.22, 1, 0.36, 1)` on colour and opacity; no load or scroll animation | Slow, soft hover; the page itself never moves on its own |
| Composition | full-bleed **dark still life** hero (the bag on a mirrored tray) with a two-line caption bottom-left; a **centred serif manifesto** paragraph; an **asymmetric collage** of black-and-white texture photos; bestsellers in a horizontal row on pale tiles; a large serif "VISIT US:" statement beside a photograph; a **white card floating over a photograph**; journal entries as small date + serif title; footer ends on the wordmark set huge | Art direction first: objects photographed like sculpture, words set like a magazine |

### 1.3 What both share (the strongest signals)

1. **Small, quiet UI type** (12 to 14 px) and **few, light, large headings**. No bold display type.
2. **Square everything**: no rounded cards, no shadows.
3. **Warm off-white grounds, softened ink** (never `#000` on `#fff`).
4. **Full-bleed photography as the hero**, text small and in a corner.
5. **No scroll animation.** Motion is hover feedback only, 200 to 400 ms, ease-out.
6. **The footer ends on the wordmark, set as large as the page is wide.**

---

## 2. The combined direction

**Feeling in five words:** *quiet, warm, editorial, tactile, honest.*

**One sentence:** Coffee Collective's calm structure (one idea per screen, colour-block chapters, small square UI)
carrying Canyon's voice (a serif that speaks in sentences, still-life photographs, white cards over pictures).

Keep what is already Dolce Nova's and stronger than either reference: the **roast path** (3D bean, peak of the
page), the **grind preview** (signature), the demo checkout, the palette's warmth.

**Do not copy** (3D guide 2.4, REFERENCE_NOTES rule): their logos and wordmarks, Canyon's squiggle bag
illustration, Coffee Collective's triangle bag pattern and arrow glyph, any of their photographs, their copy,
their product names, their layouts pixel for pixel. Take proportions and principles only.

---

## 3. Decisions the owner must make before building

Each option states its cost (3D guide 2.3). Ask all of them in one pass; record the answers verbatim in
BRIEF.md's revisions log; do not start section 6 before they are answered.

| # | Decision | Options and cost | Recommendation |
|---|---|---|---|
| D1 | **Typeface** (3D guide 8.3: never change it without three snapshots) | **A** keep Fraunces + Figtree: 0 h. **B** EB Garamond (OFL, closest to Canyon's serif) for statements + Figtree for UI: ≈ 1 h, +≈ 40 KB font. **C** EB Garamond + Instrument Sans (OFL, closer to the references' plain grotesks): ≈ 1.5 h, +≈ 60 KB, every UI string re-checked | Build 390 and 1440 PNG snapshots of the hero, a statement and the shop list in A, B and C; let the owner pick. Lean **B** |
| D2 | **Hero picture** | **A** keep the green-bean sack, full-bleed (fits "every cup starts as a green bean"): 0 extra. **B** a dark still life, `m61713103` (filter coffee dripping on a scale, warm low light, CC0, Thomas Martinsen), the Canyon mood: ≈ 20 min to encode | **A**; B as the alternate if the owner wants the Canyon darkness |
| D3 | **Scroll reveals** | Neither reference uses them, the taste skill bans them, the original brief requires them. **Keep**: 0 h, gate stays OPEN. **Remove**: ≈ 15 min, QA reports the brief's reveal criterion as dropped by the owner | **Remove** (it is what both references do) |
| D4 | **Demo notice placement** | **A** keep the line in the hero (taste kit rule: no bar above the header). **B** a thin top announcement bar like Coffee Collective's: taste gate FAIL, ≈ 15 min | **A** |
| D5 | **Colour-block chapters** | Two new half-screen colour blocks (terracotta, roast) as in Coffee Collective; uses existing palette colours, no new colour: ≈ 2 h | **Yes** |

---

## 4. Tokens: the exact changes

Edit `site/assets/css/site.css` `:root` only (tokens are defined once). Constraints that stay: ≤ 5 colours +
1 accent, 2 families, the 9-step scale, 8-px grid, ≤ 3 radii, one shadow, motion tokens.

```css
/* colour: unchanged values, new roles */
--c-ground:  #f6f1e7;   /* page (Coffee Collective's cream role) */
--c-surface: #ebe3d4;   /* tiles behind products, the second ground */
--c-ink:     #2b241e;   /* text; also the DARK colour block */
--c-ink-soft:#6b5f53;   /* labels, meta */
--c-line:    #d6cbb8;   /* row rules only */
--c-accent:  #a3472b;   /* primary button; also the TERRACOTTA colour block */

/* type: only if D1 = B or C */
--f-display: "EB Garamond", "EB Garamond Fallback", Georgia, serif;     /* statements, product names */
--f-text:    "Figtree", "Figtree Fallback", Arial, sans-serif;          /* or "Instrument Sans" for C */

/* radius: square, like both references */
--r-1: 0;               /* was 4px: buttons, cards, inputs, panels become square */
/* --r-pill stays for chips and the cart count only. Radii in use: 0, 999px */
```

**Type roles** (sizes stay on the existing scale; nothing new):

| Role | Size (phone / desktop) | Face | Line height | Tracking | Case |
|---|---|---|---|---|---|
| UI label, nav, tag, meta | 13 / 13 | text | 1.4 | +0.06em | UPPERCASE for tags only |
| Body | 16 / 16 | text | 1.6 | 0 | sentence |
| Statement (manifesto, card titles) | 25 / 31 | display | 1.45 | −0.01em | sentence |
| Section heading h2 | 31 / 49 | display | 1.1 | −0.02em | sentence |
| Hero h1 | 39 / 61 | display | 1.05 | −0.02em | sentence (**smaller than today's 76**) |
| Footer wordmark | sized to the container width (see 5.8) | display | 0.9 | −0.03em | as the name |

Weight 400 everywhere. No bold display type (both references).

**Motion** (unchanged tokens, new rule): hover and press only. `--d-2` 250 ms for colour-like overlays,
`--d-3` 400 ms for image zoom, `--ease` `cubic-bezier(0.22, 1, 0.36, 1)` (Canyon uses this exact curve). No
load or scroll animation except the hero entrance and the roast path (and reveals, if D3 = keep).

---

## 5. Components

Build each once in `site.css` / `site/assets/js`, reuse everywhere. Class names below are the contract.

### 5.1 Header `.header` (both references)
- Height 64. Wordmark left in the **text face, 16 px, sentence case** ("Dolce Nova"), not the display face.
- Links 13 px: Shop, Craft. Cart right as text "Cart (0)" in 13 px (Canyon), the count still live and bumping.
- Over the hero it is **transparent with ground-coloured text**; after 8 px of scroll it gets the ground colour
  (existing `is-scrolled` hook; switch background by toggling a class, no colour transition).
- Phone: wordmark left, "Cart (0)" and a 48×48 menu button right.

### 5.2 Buttons and links
- `.btn` primary: square (`--r-1: 0`), 48 px tall, padding 0 24, text 13 px UPPERCASE +0.06em, accent ground.
- `.btn--outline` (new, Coffee Collective's "LEARN MORE"): 1 px border in currentColor, transparent ground.
- `.link` (Canyon's "Come visit", "Shop Now"): 13 px, underline 1 px, offset 4; hover draws the underline
  thicker via a `::after` `scaleY` (transform only).

### 5.3 Tag `.tag` (Coffee Collective's "ONLINE EXCLUSIVE")
13 px uppercase, padding 0 8, height 24, background `--c-surface` or `--c-ground`, ink. Content is a true
fact from `catalog.json` only: the roast ("LIGHT ROAST"), never "bestseller" or "new" (no data behind them).

### 5.4 Statement `.statement` (Canyon's manifesto)
- Display face, 25 / 31 px, line height 1.45, max 24ch per line, **centred on desktop, left on phone**.
- One per page at most twice (manifesto, close). Padding-block 128 desktop / 96 phone. No heading above it.

### 5.5 Colour-block split `.block-split` (Coffee Collective's "Fruity and sweet")
- Full-bleed, 1 screen tall on desktop: left half a photograph (`object-fit: cover`), right half solid
  `--c-accent` or `--c-ink` with ground-coloured text. Phone: photograph 50svh on top, colour block below.
- Inside the colour half: a 13 px tag, a 49 px display heading, one 16 px paragraph, an outline button in
  ground colour. Text sits on the 7/12 grid line, top-aligned at 120 px (taste kit split rules).
- Contrast: ground `#f6f1e7` on accent `#a3472b` = 5.34:1, on ink = 13.58:1 (DESIGN.md).

### 5.6 Product tile (Coffee Collective) layered onto the existing list (Canyon)
The shop keeps its **list with the grind preview** (signature). Restyle each row:
- Left: a 96×96 square texture of the coffee's roast on `--c-surface` (desktop; 64 on phone), then the
  name in the display face 25 / 31, then a 13 px meta line "Ethiopia · Washed", then the `.tag` roast.
- Right: "from €14.50" 16 px.
- The open row's panel is unchanged in function; square corners, chips stay pills.

### 5.7 Card over a photograph `.photo-card` (Canyon's "Canyon to your door")
A full-bleed photograph, 1 screen, with a white-ish card (`--c-ground`, padding 32, square, width 5/12 on
desktop, full width minus 32 on phone) anchored bottom-left 64 px in. Card: tag, statement-size title,
16 px line, `.link`. Use it once (section 6.6).

### 5.8 Footer wordmark `.closing__mark` (both)
"Dolce Nova" in the display face, sized so it spans the container width exactly, with CSS only:

```css
.closing__wrap { container-type: inline-size; }
.closing__mark { font-size: calc(100cqi / R); line-height: 0.9; white-space: nowrap; }
```

`R` is the word's width at a 1 px font size, measured once in the browser after the font has loaded:
`ctx.font = '100px "EB Garamond"'; R = ctx.measureText('Dolce Nova').width / 100` (use the chosen family).
Write the number in DESIGN.md. Because the size is not on the type scale, list `.closing__mark` as the one
documented exception in `qa/audit.mjs` (an explicit allow-list entry with a comment, never a silent skip).
It sits at the very bottom of the closing screen, cropped by nothing. This is the page's "type moment" (the
taste kit asks for one).

---

## 6. The page, section by section

Heights in screens at 1440×900. Copy is final unless marked. **Only true facts** (3D guide 9): every number
comes from `catalog.json`, BRIEF.md or QA.md.

| # | Section | From | Screens | Build |
|---|---|---|---|---|
| 6.1 | Hero | CC + Canyon | 1 | Full-bleed photograph (D2). Bottom-left, 64 px in: notice line 13 px ("Demo shop: nothing is charged at checkout."), h1 61/39 "Coffee that starts as a green bean.", one `.btn` "Shop the coffees". Scrim: a gradient **only under the text block** (scroll-craft rule), roast at 0 → 55% opacity over 40% of the height. Header transparent over it |
| 6.2 | Manifesto | Canyon | 1 | `.statement`, centred: "Six single-origin coffees, roasted in small batches and sold whole or ground. One bean's journey, from a green seed to your cup." Below it, a 3-photo **asymmetric collage** (see 7): widths 5/12, 4/12, 3/12, tops offset 0, 96, 48 px, `filter: grayscale(1)` on two of three |
| 6.3 | Shop | CC tiles + Canyon list | 2 | h2 "Six coffees. Three grinds." left, 13 px `.link` "How the grinds differ" right (anchors to the open row). List restyled per 5.6. The grind preview and add-to-cart unchanged |
| 6.4 | Featured coffee | CC colour block | 1 | `.block-split`, terracotta half: tag "LIGHT ROAST · KENYA", heading "Nyeri Gatomboya", line "Blackcurrant, grapefruit, cane sugar.", outline button "Choose a grind" (opens that row in the shop). Photo half: `roast-light` crop is too small for a half screen (760 px), so use `c75` (a spoonful of roasted beans, CC BY-SA 4.0, Jameswasswa, 6000 px) |
| 6.5 | Origin | Canyon | 1 | Existing split, restyled: display h2, 16 px body, photo square-cornered |
| 6.6 | Roast path | ours | 4.6 | **Keep** the 3D bean. Restyle only its cards: square, tag "FIRST CRACK · NEAR 196 °C" as `.tag`, title in the display face 31 px |
| 6.7 | Brew | CC dark block | 1 | `.block-split` with the **roast (dark) half**: tag "AT HOME", h2 "A filter recipe", the recipe as an arrow-bullet list (draw the arrow as an inline SVG of our own, a simple 8×8 corner, never their glyph): "15 g coffee", "250 g water just off the boil", "About 3 minutes", then `.btn--outline` "Shop the coffees". Photo half: `brew` (existing) |
| 6.8 | Close | Canyon card | 1 | `.photo-card` over `m61713103` (dark still life) or `c140`: tag "DOLCE NOVA", title "Six coffees, roasted in small batches.", `.link` "Back to the coffees" |
| 6.9 | Footer | both | 0.6 | Ground `--c-surface`. Three 13 px link columns (Shop, Craft, Photograph credits / The demo / Fictional brand line), then `.closing__mark` across the full width at the bottom |

**Phone (390):** every split stacks picture first, then words (colour blocks: photo 50svh, block below).
The collage becomes two photos side by side, 1:1.25, the third dropped. Statements left-aligned. Shop rows
keep the 64 px thumbnail. Footer wordmark still spans the width (it scales by itself).

---

## 7. Photographs

Use the existing pipeline (`tools/fetch-originals.mjs` → `tools/images.mjs` → `tools/credits.mjs`). Add each new
source id to `IDS` in `fetch-originals.mjs`, add an entry to `IMAGES` in `images.mjs` with widths up to 2560 for
full-bleed and half-screen slots, write a new alt (never the source's title). **Look at every crop at the size
it appears** (3D guide 3.5) and **check `qa/audit.mjs` density ≥ 1.5× at DPR 2**.

| Slot | Source | Licence | Treatment |
|---|---|---|---|
| Hero (D2 A) | `c69` (existing) | CC BY-SA 2.0 | full-bleed, `object-position: 60% 60%` |
| Hero (D2 B) / close card | `m61713103` | CC0 | full-bleed, dark |
| Collage | `m62054123` (hand, green beans), `c96` (pour-over), `766` (roasted beans) | CC0 / CC0 / Unsplash licence (check the library entry before use) | two in greyscale (`filter: grayscale(1)`, not animated) |
| Featured coffee | `c75` | CC BY-SA 4.0 | half screen, cover |
| Brew block | `brew` (existing, `c96`) | CC0 | half screen, cover. If `c96` is in the collage, use `m61713103` here and `c140` for the close |

**Never** reuse one photograph in two slots on the page (taste kit `photo-repeat`).

---

## 8. Build order

One unit at a time; each unit is verified, then committed (`git add <files by name>`, `git show --stat HEAD`),
with the commit message saying why (the owner's words), what changed, and how it was proved (3D guide 11).

1. **Decisions**: ask D1 to D5 (section 3), record answers verbatim in BRIEF.md. If D1 ≠ A, build the three
   snapshots first (`qa/out/type-snapshots/`), get the pick, then run `node tools/fonts.mjs` with the new
   family (add it to `FONTS`; add its metrics import from `@capsizecss/metrics`, checking the module name in
   `node_modules/@capsizecss/metrics`).
2. **Tokens and components** (sections 4 and 5) on the current page, no new sections yet. Run the audit and
   look at 390 and 1440. Commit.
3. **Hero, header, manifesto** (6.1, 6.2). Before editing CSS read `layout-v4.md` sections 2 and 3 (CLAUDE.md).
   After: `node .claude/skills/design-taste-frontend/scripts/consistency.mjs site/index.html --quick --widths
   1440,390 --page product --category "single-origin coffee beans" --primary "Shop the coffees"`. Commit.
4. **Shop restyle** (6.3). Run `qa/flow.mjs` (the purchase path must still pass). Commit.
5. **Colour blocks** (6.4, 6.7) with their photographs (section 7). Commit.
6. **Origin, roast-path cards, close, footer wordmark** (6.5, 6.6, 6.8, 6.9). Run `qa/roast-coverage.mjs` and
   `qa/roast-pixels.mjs chromium` and `webkit` (the roast path must not regress). Commit.
7. **Full acceptance** (section 9), update DESIGN.md (tokens, roles, the wordmark's measured ratio) and QA.md.
   Commit, push, wait for the Pages run, then the live checks. Commit the live result.

---

## 9. Acceptance: what must pass, and how

Run with `node tools/serve.mjs` (port 4600). Quote numbers from runs on the exact committed tree.

| Check | Command | Pass |
|---|---|---|
| Design system | `node qa/audit.mjs` and `--engine chromium` | 0 violations: ≤ 6 colours, 2 families, scale sizes only, radii `0` and `999px` only, 8-px spacing, images ≥ 1.5× at DPR 2, 44-px targets, 16-px inputs |
| Purchase flow | `node qa/flow.mjs` | PASS at 390 and 1440 |
| Accessibility | `node qa/a11y.mjs` | 0 violations in all 12 states; ground on accent and ground on ink blocks ≥ 4.5:1 (they are 5.34 and 13.58) |
| Motion | `node qa/motion.mjs` | static scan PASS; reduced motion 0 running; frames as before or better (compare with HEAD: `qa/frames-compare.mjs`) |
| Roast path | `qa/roast-coverage.mjs`, `qa/roast-pixels.mjs chromium` / `webkit` | 121/121; all PASS |
| Overflow and sections | `node tools/shoot.mjs` (all 4 sizes) | 0 px overflow; read every screenshot for empty areas, not only collisions (3D guide 12) |
| Phones | 360, 390, 430 screenshots | nothing clipped; the footer wordmark fits exactly |
| Performance | Lighthouse mobile, interleaved with HEAD, 4 runs each (3D guide 10.3) | ≥ 90, LCP < 2.5 s, CLS < 0.05 |
| Taste kit | the consistency command in step 3 | No new FAIL beyond those QA.md already lists; every new one fixed or reported to the owner |
| Live | after deploy: `BASE=https://shockwawe10.github.io/Dolce-Nova/ node qa/flow.mjs` and `qa/roast-pixels.mjs` in both engines | PASS |

**Look at it like the owner will.** Put the new 1440 and 390 sheets beside the two references' sheets. The
test is the feeling words in section 2: quiet, warm, editorial, tactile, honest. If a screen reads like either
reference's layout copied, change its proportions; if it reads like a template, it needs a stronger photograph
or a sentence instead of a label.

---

## 10. Known conflicts (report, don't resolve alone)

| Reference principle | Conflicts with | Default until the owner decides |
|---|---|---|
| No scroll reveals | Original brief (requires them) | D3 |
| Announcement bar above the header (CC) | Taste kit layout rule | D4 = no bar |
| Hero text bottom-left, small | Taste kit: h1 top at 120 px | Follow the references; report the gate finding |
| Colour-block halves (solid colour grounds) | Taste kit "flat grounds", "no inset coloured box" | Full-bleed halves are grounds, not boxes; report if flagged |
| Giant footer wordmark | none (taste kit asks for one type moment) | Build it |
| Serif statement as a "section" with no h2 | Taste kit `one-heading` (every section starts with an h2) | Give the manifesto a visually hidden h2 ("About Dolce Nova") |
