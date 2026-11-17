# DESIGN.md — Dolce Nova

## 0. History

| Date | Version | What decided it |
|---|---|---|
| 2026-11-16 | First build: flour and terracotta, Fraunces/Figtree, a split hero, a shop list | Three dealt comps (section 4) |
| 2026-11-17 | Adjustment after Coffee Collective and Canyon Coffee: EB Garamond, colour blocks, full-bleed sack hero | REDESIGN-GUIDE.md, owner decisions D1 to D5 |
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

`--c-ember` (`#9a6a3a`, the bags' gold darkened) colours only the glow gradients behind the 3D bean; the
3D path itself is the same bronze (in `roast3d.js`). It is never text, a ground or a border, so the design
audit's colour count (6) does not include it. The bags' own colours (kraft, terracotta, navy, burgundy)
appear only in the photographs: the page stays quiet so six different bags can sit side by side.

### Type: 2 OFL families, self-hosted latin woff2, `font-display: swap`

- **Instrument Serif** 400: headings, product names, notes on the product page, the wordmarks. 21 KB.
  A narrow editorial serif, chosen to echo the condensed capitals printed on the bags.
- **Instrument Sans** 400–600: everything else. 29 KB. A plain grotesk, Coffee Collective's register.
- Fallbacks are size-adjusted local fonts (`Instrument Serif Fallback` = Georgia at 76.49%, `Instrument Sans
  Fallback` = Arial at 102.74%, with ascent, descent and line-gap overrides) from published metrics
  (`tools/fonts.mjs`).

**Scale:** major third (×1.25) from 16px: 13 · 16 · 20 · 25 · 31 · 39 · 49 · 61 · 76. Headings step at
breakpoints: h1 49 / 61 / 76, h2 39 / 49 / 61 (phone / tablet / desktop); the narrow serif is set one step
larger than the Garamond was. Tags: 13px Instrument Sans 500, uppercase, +0.08em. Buttons: 48px tall, 13px
uppercase, +0.08em, square.

**The header wordmark:** Instrument Serif 20px in capitals, +0.14em, like the arched "DOLCE NOVA" on the bags.

**The one size off the scale: the footer wordmark.** "DOLCE NOVA" spans the container exactly:
`font-size: calc(100cqi / R)`. Measured in WebKit and Chromium after the font loaded: the word in capitals
with 0.04em tracking is 4.864 wide at 1px, of which 0.04 is the tracking after the last letter. That letter
sits in a span with no tracking, so the word is 4.824 wide; `R` is set to 4.84 so rounding never
overflows. `qa/audit.mjs` allow-lists `.footer__mark` and its span for font size only.

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
canvas appears at once when ready (no fade as it scrolls in). Under `prefers-reduced-motion: reduce` nothing
moves; the roast path snaps between its five states.

## 3. Pages

### Home (`index.html`)

| Section | Height | Composition |
|---|---|---|
| Header | fixed 64px | Coffees / Roast / Brew left (phone: Coffees only), DOLCE NOVA centred, Cart (0) right; paper words on the hero's ink until the page scrolls, then the paper ground |
| Hero | 1 screen, ink | 1440: the words on columns 1–6 at the foot (notice, h1, lede, a paper button and an outline button); the Cerrado bag on 7–12, 640px, its edges faded into the ink. Phone: the bag above, cut and faded, the words under it, one button |
| The coffees | 1 screen | h2 and lede in a head row; the carousel: 3.4 slides at 1440, 2.4 on a tablet, 1.3 on a phone; each slide a 4:5 bag on its own backdrop, the roast tag, the name, the notes, "from" price; each links to its product page |
| Manifesto | 1 screen | one centred serif sentence, then three photographs (two in black and white) |
| Origin | 1 screen | photograph half and forest half (Coffee Collective) |
| Roast path (peak) | 5 screens | the sticky 3D bean on a bronze path; the ground walks from paper to ink with a gold glow; square paper cards with tags |
| Brew at home | 1 screen | ink half with the recipe as a chevron list; photograph half |
| Close | 1 screen | a paper card over a still life: tag, h2, the forest button |
| Footer | auto | three columns (the six coffees, craft, about and the demo lines), then the wordmark across the page |

### Product page (`coffee-<id>.html`, generated)

At 1440 the bag fills columns 1–6 (628px square, sticky while the details scroll); columns 8–12 hold the
breadcrumb, the tag line, the name as h1, the 340 g price, the notes in the serif, the paragraph about the
coffee, the grind and size chips, a full-width Add button with the live price, and a ruled list of facts.
Under it, "More coffees": the same carousel with the other five. Phone: stacked in the same order.

The pages are generated by `tools/pages.mjs` from `site/data/catalog.json`, which also fills the shared
header, carousel, footer and drawer into the hand-written pages, so names and prices have one source.
`tests/pages.test.mjs` fails if a page drifts from the catalog. Build order after a catalog or image change:
`node tools/images.mjs && node tools/credits.mjs && node tools/pages.mjs`.

### Sizes and prices

The bags are printed "Whole bean · 12 oz · 340 g", so the shop sells 340 g and 1 kg (BRIEF.md). The old
250 g prices were scaled by 340/250 and rounded to the nearest €0.50; 1 kg prices are unchanged.

## 4. The first build's comps (history)

Built 2026-11-16 in `qa/comps/` from the taste skill's dealt palettes and type pairings: A (flour and
terracotta, Fraunces/Figtree, editorial split) was chosen over B (cobalt on sand, Archivo) and C (off-white,
bottle green and yellow, Bricolage). Both later versions replaced it; the files remain for the record.
