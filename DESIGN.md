# DESIGN.md — Dolce Nova

## 1. Three comps, one pick

Built 2026-11-16 in `qa/comps/` from the taste skill's dealt palettes and type pairings (its rule: deal,
don't choose by taste), one palette, typeface and hero layout each, with identical copy and photographs.
Shot in WebKit at 390×844 and 1440×900 (`node tools/shoot-comps.mjs`, output in `qa/out/comps/`).

| Comp | Palette | Type | Hero layout | Verdict |
|---|---|---|---|---|
| **A** | Flour and terracotta | Fraunces / Figtree | Editorial split: copy on flat ground, photograph full height beside it | **Chosen** |
| B | Cobalt on sand (two-tone) | Archivo (wide) | Full-bleed photograph, copy in a solid panel | Rejected |
| C | Off-white, bottle green, yellow | Bricolage Grotesque / Figtree | Centred statement over a rounded photo band | Rejected |

**Why A.** The brief is "earthy, origin-led, honest" and premium-minimal. A's ground is the colour of
unbleached paper and its accent is fired clay, so the palette comes from the same world as the burlap
and the beans instead of competing with them. The photograph stays whole: no panel or scrim covers
the beans, and the copy sits on flat ground, so contrast is never a gamble. Fraunces at 400 gives the
quiet, crafted voice the reference measurements point to (La Cabra: 400-weight serif over a sans).

**Why not B.** Cobalt reads as a poster or a bank. It is cold against green coffee, and on a phone
the panel covers most of the sack. **Why not C.** Yellow-on-white and a rounded, centred stack read
as a consumer app. Bricolage is "playful" by the deal's own description, which is not premium-minimal.
The centred hero is the most template-like of the three.

**Carried over from the comp review.** Fraunces at −2.8% tracking ran the words together at 88px, so
the final uses −0.02em (La Cabra measured −0.02em). Nav over the photograph lost contrast, so the header sits on
the ground colour above the hero. A three-up grid of six near-identical bean squares read as stock
photography, so the shop became an editorial list where only the open coffee shows its image.

## 2. Tokens (defined once, `site/assets/css/site.css` `:root`)

### Colour: 5 + 1 accent

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--c-ground` | `#f6f1e7` flour | page ground | |
| `--c-surface` | `#ebe3d4` oat | quiet panels, notice bar, footer | |
| `--c-ink` | `#2b241e` roast | text, selected chips, drawer scrim (via `opacity`) | 13.58:1 on ground, 11.99:1 on surface |
| `--c-ink-soft` | `#6b5f53` husk | secondary text, **input borders** | 5.51:1 on ground, 4.86:1 on surface |
| `--c-line` | `#d6cbb8` parchment | decorative dividers only (1.42:1, so never an input edge) | |
| `--c-accent` | `#a3472b` terracotta | primary button, accent text | 5.34:1 either way round with ground |

(WCAG ratios computed from the hex values, not estimated.)

No pure black or white. Hover states use an `opacity` overlay of an existing colour, never a new colour.

### Type: 2 OFL families, self-hosted latin woff2, `font-display: swap`

- **Fraunces** 400 (optical-size axis, automatic): headings and the wordmark. 34 KB.
- **Figtree** 400–500: everything else. 20 KB.
- Fallbacks are size-adjusted local fonts (`Fraunces Fallback` = Georgia at 105.20%, `Figtree Fallback` =
  Arial at 100.72%, with ascent, descent and line-gap overrides) from published metrics (`tools/fonts.mjs`).

**Scale:** major third (×1.25) from 16px, rounded to whole pixels. These nine sizes are the only font sizes:

| Token | `--fs-1` | `--fs-2` | `--fs-3` | `--fs-4` | `--fs-5` | `--fs-6` | `--fs-7` | `--fs-8` | `--fs-9` |
|---|---|---|---|---|---|---|---|---|---|
| px | 13 | 16 | 20 | 25 | 31 | 39 | 49 | 61 | 76 |

Headings step through the scale at breakpoints instead of `clamp()`, so no in-between size ever
renders: h1 49 / 61 / 76, h2 39 / 49 / 61, h3 25 / 25 / 31 (phone / tablet / desktop), each level
smaller than the one above. Body copy is in the ink (13.58:1); the soft ink is for labels and metadata only. Headings: line height 1.05 to 1.15, tracking −0.02em, `text-wrap: balance`. Body 16 / 1.6.
Inputs are 16px.

### Spacing: 8-px grid

`--s-1` 8 · `--s-2` 16 · `--s-3` 24 · `--s-4` 32 · `--s-6` 48 · `--s-8` 64 · `--s-12` 96 · `--s-16` 128.
Page gutter 16 (phone) / 32 (tablet) / 64 (desktop); content width max 1280; 12-column grid gutter 24.

### Radius (3 at most) and shadow (one)

`--r-0` 0 (photographs) · `--r-1` 4px (buttons, inputs, panels) · `--r-pill` 999px (chips, count badge).
`--shadow`: `0 24px 64px -24px` roast at 35%, used only by the cart drawer (both references use no shadows).

### Motion

| Token | Value | Used for |
|---|---|---|
| `--d-1` | 150ms | press feedback, hover overlays |
| `--d-2` | 250ms | count bump, chip and label states |
| `--d-3` | 400ms | drawer, grind crossfade, scroll reveals |
| `--d-4` | 700ms | hero load sequence |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | every transition and animation (one ease-out) |

Only `transform` and `opacity` animate. Reveals stagger by 60ms at most. Under
`prefers-reduced-motion: reduce` nothing moves: no hero sequence, no reveals (content is visible at
once), the roast peak becomes a still grid of four stages, the drawer appears without sliding.

## 3. Layout

Revised after the taste skill's finish gate (QA.md). Every section is one or two screens tall, its h2
first at 120px (96px on a phone) under a fixed 64px header. Every split uses one line of a 12-column
grid with 24px gutters: text starts on the container's left edge (80px at 1440), and the picture
starts on the 5/12 line (623px at 1440). Columns are top-aligned.

| Section | Screens | Composition |
|---|---|---|
| Header | fixed, 64px | wordmark, Shop / Craft anchors, cart button with live count |
| Hero | 1 | demo notice line, h1, lede, button left; photograph right, ending 64px above the fold; phone: words, then the photograph fills what is left |
| Shop | 2 | h2 and lede on the split line; six rows on one left edge (name, then origin, process, roast and price); the open row: choices left, grind preview right |
| Origin | 1 | text left, photograph right (full content height) |
| Roast (peak) | 2 | sticky stage inside its own section: text and stage list left, four roast photographs crossfading right; phone: frames first, compact four-step row |
| Brew | 1 | text, recipe and button left, photograph right |
| Closing | 1 | the close (statement and button) on the oat ground, footer links and the demo/legal lines at its foot |

Rows of the list close with a 1px rule; sections are told apart by space and the closing ground,
never by rules. The demo notice also appears in the cart drawer, on the checkout page (a bar and a
box) and in the closing legal line.
