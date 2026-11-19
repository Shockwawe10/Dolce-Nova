# DESIGN.md — Dolce Nova

## 0. History

| Date | Version | What decided it |
|---|---|---|
| 2026-11-16 | First build: flour and terracotta, Fraunces/Figtree, a split hero, a shop list | Three dealt comps (section 4) |
| 2026-11-17 | Adjustment after Coffee Collective and Canyon Coffee: EB Garamond, colour blocks, full-bleed sack hero | REDESIGN-GUIDE.md, owner decisions D1 to D5 |
| 2026-11-17 | The roast path becomes a still life: one bean, no path, no turning; the origin block shortened | The owner, after seeing the path (BRIEF.md) |
| **2026-11-17** | **Global redesign (this document)**: the owner's bag renders, a carousel, a product page per coffee, a palette and type taken from the bags | The owner: "global redesign based on that two references ... replace the Coffe selection with the like carousel"; four answers recorded in BRIEF.md |

The owner judged the second version "an old version of the site with a bit of changes". What changed
this time is the system itself (colour, type, the hero, how coffee is chosen and bought), not only the
layout. The 3D roast path stays, as asked, and takes the new palette.

## 1. Where each idea comes from

| Idea | Source | How it appears here |
|---|---|---|
| The product as a dark still life in the hero | Canyon (the bag on a mirrored tray) | The Cerrado bag render on its own black, faded into the page's ink |
| Bestsellers as a sideways row with a progress line and two round arrows | Canyon | The coffee carousel: six bags, 4:5, a 1px progress line, 48px arrows |
| Small uppercase tags over product names | Coffee Collective | "Light roast · Kenya" over every name, on cards and product pages |
| Links left, wordmark centred, cart right | Coffee Collective | The header on every page |
| Colour-block chapters, a photograph half and a solid half | Coffee Collective | Origin (forest) and the recipe (ink) |
| A centred serif sentence and a black-and-white collage | Canyon | The manifesto |
| A card floating over a photograph | Canyon | The close |
| The footer ending on the wordmark set across the page | both | "DOLCE NOVA" in the bags' spaced capitals |
| A product page: the bag large, the facts in a ruled list, more coffees under it | both | `coffee-<id>.html` |

Not taken: either brand's logo, wordmark, glyphs, photographs, colours or copy (3D guide 2.4).

## 2. Tokens (defined once, `site/assets/css/site.css` `:root`)

### Colour: 5 + 1 accent, from the bags

| Token | Value | Use | Contrast (computed) |
|---|---|---|---|
| `--c-ground` | `#f7f5f0` paper | page ground, header once scrolled, cards | |
| `--c-surface` | `#ebe7df` | footer, quiet panels | |
| `--c-ink` | `#1b1b19` | text; the hero, the recipe block, the dark roast stage. Sampled from the black behind the Cerrado bag render (`#181818`), so the hero photograph meets the page without a seam | 15.83:1 on ground, 13.99:1 on surface |
| `--c-ink-soft` | `#5f5a52` | tags, notes, input borders | 6.28:1 on ground, 5.55:1 on surface |
| `--c-line` | `#d8d3c9` | rules; tags on ink and forest | 11.57:1 on ink |
| `--c-accent` | `#2f4a33` forest | the primary button, the origin block. From the Huila bag (`#344d2f`) | ground on it 8.97:1 |

`--c-ember` (`#9a6a3a`, the bags' gold darkened) colours only the warm glow behind the 3D bean as it roasts. Since 2026-11-19 it also fills **the lion mark**: the medallion from the Huehuetenango render, its gold line work cut to an alpha mask (`assets/lion.png`, 176 px, so at most 88 px on screen), used four times: the seal over the home statement (80 px, 64 on a phone), beside the copyright line in every footer, the stamp on the confirmation's parcel label, and over an empty cart (drawer and checkout). Always aria-hidden; the audit names it beside the six palette colours. It is never text, a ground or a border, so the design
audit's colour count (6) does not include it. `--c-error` (`#9b3a24`, the bags' terracotta darkened, 6.37:1 on
ground) is the one state colour: field error borders, messages and their alert mark, nothing else (2026-11-19). The bags' own colours (kraft, terracotta, navy, burgundy)
appear only in the photographs: the page stays quiet so six different bags can sit side by side.

### Type: 2 OFL families, self-hosted latin woff2, `font-display: swap`

- **Instrument Serif** 400: headings, product names, notes on the product page, the wordmarks. 21 KB.
  A narrow editorial serif, chosen to echo the condensed capitals printed on the bags.
- **Instrument Sans** 400–600: everything else. 29 KB. A plain grotesk, Coffee Collective's register.
- Fallbacks are size-adjusted local fonts (`Instrument Serif Fallback` = Georgia at 76.49%, `Instrument Sans
  Fallback` = Arial at 102.74%, with ascent, descent and line-gap overrides) from published metrics
  (`tools/fonts.mjs`).

**Scale:** major third (×1.25) from 16px: 13 · 16 · 20 · 25 · 31 · 39 · 49 · 61 · 76 · 95 (95 only for the hero h1 at 1280 and wider, since 2026-11-19, so the hero outranks the sections). Headings step at
breakpoints: h1 49 / 61 / 76, h2 39 / 49 / 61 (phone / tablet / desktop); since 2026-11-19 the section h2s carry loud and quiet beats: the roast (the peak, `.h-loud`) one step up, 49 / 61 / 76, origin and brew (`.h-quiet`) one step down on tablet and desktop, 39 / 39 / 49; no small tag sits above a section heading any more (tags stay over product names); the narrow serif is set one step
larger than the Garamond was. Tags: 13px Instrument Sans 500, uppercase, +0.08em. Buttons: 48px tall, 13px
uppercase, +0.08em, square.

**The favicon** (2026-11-18): the bags' gold lion medallion on their navy, cropped from the owner's Huehuetenango render
(`site/assets/icon-32.png`, `icon-192.png`, and `icon-180.png` for home screens).

**The header wordmark:** Instrument Serif 20px in capitals, +0.14em, like the arched "DOLCE NOVA" on the bags.

**The one size off the scale: the footer wordmark.** "DOLCE NOVA" spans the container exactly:
`font-size: calc(100cqi / R)`. Measured in WebKit and Chromium after the font loaded: the word in capitals
with 0.04em tracking is 4.864 wide at 1px, of which 0.04 is the tracking after the last letter. That letter
sits in a span with no tracking, so the word is 4.824 wide; `R` is set to 4.84 so rounding never
overflows. `qa/audit.mjs` allow-lists `.footer__mark` and its span for font size only.

### Photographs: one grade

Every photograph is graded in `tools/images.mjs` (2026-11-19, design critique: four registers): mapped into the page's own range, the darkest shadow the ink and the brightest light the paper, so they read as printed on this site. Colour photographs also lose a little saturation (0.82); the collage (black and white since 2026-11-17) is an ink-to-paper duotone in the files, no CSS filter. The roast references keep true colour, since they show roast degree; the owner's bag renders are never graded.

### Spacing, radius, shadow

8-px grid: 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Page gutter 16 / 32 / 64; content max 1280; 12 columns,
24px gutters. Corners are square everywhere (`--r-0`, `--r-1` = 0) except the grind and size chips and the
round carousel arrows (`--r-pill`). One shadow, the cart drawer's.

### Motion

| Token | Value | Used for |
|---|---|---|
| `--d-1` | 150ms | press feedback, hover overlays |
| `--d-2` | 250ms | header ground, link underlines, the cart count |
| `--d-3` | 400ms | the drawer |
| `--d-4` | 700ms | the hero's words entering on load, the slide photograph's hover zoom |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | every transition and animation |

Only `transform` and `opacity` animate. No scroll reveals. The hero's words rise once on load and the bag
settles from 1.04 scale (transform only: it is the largest image, never hidden). The carousel moves by native
scrolling; its arrows scroll one slide (smooth unless reduced motion), its progress line is a `scaleX`. The 3D
canvas appears at once when ready (no fade as it scrolls in). **Parallax** (2026-11-17): the photograph inside
every [data-parallax] frame drifts against the page by up to 10% of the frame's height (the hero bag 5%, anchored to
the page top so it is still at rest); the picture is 12% taller at each end so no edge shows; transform only, only
while on screen, on a mouse or trackpad only, never under reduced motion. No bean ever turns: each has one constant pose
(`POSES` in `roast-state.js`: face-on, so the S-shaped cut runs down the middle, leaning on a diagonal; the four rolled
a little differently so the row reads as beans, not copies). The slider value follows a critically damped spring, so a
tap on a mark glides there; the 3D draws only while it moves or while the grains gather; during the intro, green grains fly in and the surface fills in exactly where they land
(one formula in JS and in the shader), then scrolling changes only the roast, held at each stage while its note is read. Under `prefers-reduced-motion: reduce` nothing
moves; the roast path snaps between its five states.

## 3. Pages

### Home (`index.html`)

| Section | Height | Composition |
|---|---|---|
| Header | fixed 64px | Coffees / Roast / Brew left (phone, since 2026-11-19: a Menu button that opens the three in a paper panel under the bar; a link or Esc closes it; without script, Coffees), DOLCE NOVA centred, Cart (0) right; paper words on the hero's ink until the page scrolls, then the paper ground |
| Hero | one screen up to 1000px (since 2026-11-19: the bag-height hero left a 96px band of paper at 1440x900); the words and the bag centred together; a full screen on phones; ink. h1 "Six coffees, each with a bag worth keeping." | 1440: the words on columns 1–6, centred on the bag (notice, h1, lede, a paper button and an outline button: the notice starts level with the bag's top, the buttons end near its base); the Cerrado bag on 7–12, 628 to 640px, its edges faded into the ink. Shorter than the window at the owner's request (2026-11-17), so the words and the bag line up on wide screens. Phone: the bag above, cut and faded, the words under it, one button |
| The coffees | 1 screen | h2 and lede in a head row; the carousel: 3.4 slides at 1440, 2.4 on a tablet, 1.3 on a phone; each slide a 4:5 bag on its own backdrop, the roast tag, the name, the notes, "from" price; each links to its product page. Under the row, a scrollbar: its thumb is the share of the row in view; drag it (it keeps the grab point) or press the line to jump; the wheel scrolls the page, the bags are plain links. Plain chevrons under the line step one bag at a time; touch keeps its native swipe |
| Manifesto | about 1.3 screens | one centred serif sentence, then three photographs, all in black and white: one tall frame on columns 1–7, two stacked on 8–12 (phone: one wide, two squares) |
| Origin | 72% of a screen (560 to 720px) | photograph half and oat half (Coffee Collective's split; oat, not forest, since 2026-11-18, so the page runs light to dark: coffees, story and origin in paper and oat, then roast and brew in ink), one paragraph |
| Roast (peak) | one screen (897px at 1440; 1270px on a phone) | four batches under one temperature slider: four 3D beans in a row (two by two on a phone, 4:3 slots, since 2026-11-19: in one row they were 60px; qa/roast-slider.mjs keeps the beans and the slider within one screen down to 360x640), each over a slot with its name, where it is pulled and its status (Waiting, Roasting, Done); the readout in the display serif; a slider from 20 to 230 °C with marks at 20, 196, 210 and 224; a note naming the phase (raw, drying, yellowing, first crack, development, second crack). The slider opens at 217 °C, where the batches already differ (light and medium out, dark roasting), not at 20 °C where all four were the same green. The grains gather into the beans once as the section arrives. The section ends on the coffees by roast (Light, Medium, Medium-dark, from the catalog via tools/pages.mjs). Without WebGL the slots show the four roast photographs and the slider still drives the words. Replaced the pinned three-screen scroll (owner, 2026-11-17) |
| Brew at home | up to one screen (928px at 1440) | "Three ways to brew it": pour-over, moka pot and espresso as tabs on the ink half; each recipe has a card (coffee, water, grind, time), five numbered steps and a coffee to try; the photograph half crossfades to the chosen method. The recipes share one place, so switching never moves the page. Without script, all three in turn |
| Close | 520 to 760px (72% of a screen) | a paper card (h2, the forest button) beside a still life of three of the owner's bags on the ink (Yirgacheffe, Huila forward, Sugarcane Decaf; their grounds faded into the ink as in the hero), on columns 6 to 12 at desktop, above the card on a phone. Replaced the stock photograph on 2026-11-19 (design critique: it read as any roaster's) |
| Footer | auto | five columns (the six coffees; craft; help: privacy, terms, shipping and returns, cookies; follow: Facebook, Instagram, X; about), a bar with the copyright line and the photograph credits, then the wordmark across the page. Checkout, confirmation and credits carry a slim version: the copyright line and the policy links |

### Product page (`coffee-<id>.html`, generated)

At 1440 the bag fills columns 1–6 (628px square, sticky while the details scroll); columns 8–12 hold the
breadcrumb, the tag line, the name as h1, the 340 g price, the notes in the serif, the paragraph about the
coffee, the grind and size chips, a full-width Add button with the live price, and a ruled list of facts.
Under it, **the origin**: a full-width landscape of the region (up to 680px tall, a small caption naming the place), then
the region as h2 with a tag ("Origin · Kenya") on columns 1–5 and, on 7–12, two paragraphs about the land and how the
coffee is grown, and four facts typical of the region. Then "More coffees": the same carousel with the other five.
Phone: stacked in the same order.

The grind chips carry one line of help ("Whole bean for your own grinder. Espresso is fine, for machines and moka
pots. Filter is medium, for pour-over and drip.") and the Process fact a line on what the process does to the cup.
The bag renders print "ESTD. · 2023 · NAT. PROC." over the name, true only for Cerrado; on the other five,
`tools/images.mjs` rebuilds the two side labels from the paper around them (ffmpeg `delogo`, grain added back), so
the bags read "· 2023 ·" (the owner's choice, 2026-11-19). The "WHOLE BEAN · 12OZ · 340G" line at the foot stays.

After Add, "View cart" (opens the drawer) and "Checkout →" appear under the button. On a phone, until the Add button
comes into view, a **buy bar** is fixed to the foot of the screen: the name, "from" the lowest price, and "Choose grind
& size", which scrolls to the choices and focuses the grind; it never adds by itself. The drawer's foot counts down to
free standard shipping ("€17.50 more for free standard shipping.") over a 2px line that fills in the accent
(2026-11-19, from the critique: the only way on after adding was the small cart link up top).

The pages are generated by `tools/pages.mjs` from `site/data/catalog.json`, which also fills the shared
header, carousel, footer and drawer into the hand-written pages, so names and prices have one source.
`tests/pages.test.mjs` fails if a page drifts from the catalog. Build order after a catalog or image change:
`node tools/images.mjs && node tools/credits.mjs && node tools/pages.mjs`.

### Checkout and confirmation

The checkout is one form in four groups, in the order both references use: **Contact** (email), **Delivery
address** (first and last name, street, optional apartment, postcode, town, country from the 27 EU states, optional
phone), **Shipping** (two radio cards, each with its price and its arrival dates computed in working days), and
**Payment** (the demo card). The order summary shows the lines, subtotal, shipping (Free once Standard passes
EUR 40), total and "Arrives Wed 18 Nov – Thu 19 Nov". It comes before the form in the source: on desktop it is the
right column, sticky under the header while the form scrolls; below 1024 it folds into a bar under the heading,
"Your order · 2 items" and the total with a chevron, that opens the lines (2026-11-19, after the critique found a
phone buyer filled ten screens before seeing the order). Without the script, or with an empty cart, it stays open. Address fields use the standard `autocomplete` tokens, so
browsers fill them; card fields do not (it is a demo card). Every field says what it needs; focus goes to the first.

The confirmation (reworked 2026-11-19 after the Impeccable critique: the ending was the least designed screen)
shows **the bag(s) just bought**, square crops on their own grounds (one large over two when there are three), under
a **parcel label** stuck over the foot of the photograph (the one shadow): who it is for, the lines, the order
number. On desktop the bags take columns 8–12 beside the words; on a phone they follow the heading. Then **what
happens next** in three dated steps (placed; roasted and sent *by* the next working day; arrives in the window),
the total, a **brew card** for the first line's grind (filter: pour-over; espresso: espresso, or the moka pot;
whole bean: a grind note), each linking to its tab on the home page (`./#recipe-<name>`, brew.js opens it), and,
folded behind "See the confirmation email", **the email** as a message (From, To, Subject, then the body). One
line under the heading says nothing was charged and no email was sent. Opened without an order, the page is the
heading, that line and "Back to the coffees".
Under the pay button, a **trust row** of three true statements with small line icons (lock, parcel, bag) in the soft
ink, in place of payment-provider logos, which the checkout could not honour. The sender is `orders@dolcenova.example`, a
reserved example domain. Rules and prices live in `site/assets/js/order.js` (tested by `tests/order.test.mjs`).

### Legal pages (generated)

`privacy.html`, `terms.html`, `shipping.html` and `cookies.html`, written by `tools/pages.mjs` from
`tools/legal-content.mjs`: the "last updated" tag, the title and a lede on columns 1–5 (sticky on desktop), the
sections on 7–12 in a reading column of at most 42rem. They describe what the site really does; a test checks that
the cookie page names exactly the storage keys the code uses.

### Sizes and prices

The bags are printed "Whole bean · 12 oz · 340 g", so the shop sells 340 g and 1 kg (BRIEF.md). The old
250 g prices were scaled by 340/250 and rounded to the nearest €0.50; 1 kg prices are unchanged.

## 4. The first build's comps (history)

Built 2026-11-16 in `qa/comps/` from the taste skill's dealt palettes and type pairings: A (flour and
terracotta, Fraunces/Figtree, editorial split) was chosen over B (cobalt on sand, Archivo) and C (off-white,
bottle green and yellow, Bricolage). Both later versions replaced it; the files remain for the record.
