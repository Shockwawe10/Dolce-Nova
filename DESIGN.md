# DESIGN.md — Dolce Nova

**Redesign, 2026-11-17.** The layout and type below follow REDESIGN-GUIDE.md, built from two references you
chose (Coffee Collective and Canyon Coffee) and your decisions D1 to D5. The palette, the spacing grid, the
motion tokens and the 3D roast path carried over. Section 1 is the history of the first build.

## 1. Three comps, one pick (first build, 2026-11-16)

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

- **EB Garamond** 400: headings, the manifesto statement, product names, the footer wordmark. 24 KB.
  (Fraunces until 2026-11-17; D1 = B chose a quieter old-style serif, nearer both references.)
- **Figtree** 400–500: everything else, including the header wordmark (text face, 16 px), tags, buttons. 20 KB.
- Fallbacks are size-adjusted local fonts (`EB Garamond Fallback` = Georgia at 86.36%, `Figtree Fallback` =
  Arial at 100.72%, with ascent, descent and line-gap overrides) from published metrics (`tools/fonts.mjs`).

**Roles.** Tags (`.tag`): 13 px Figtree 500, uppercase, +0.06em, soft ink (ink on colour blocks). Buttons:
48 px tall, 13 px uppercase, +0.06em; solid terracotta, or a 1 px outline in the current colour on photos
and colour blocks.

**The one size off the scale: the footer wordmark.** "Dolce Nova" spans the container exactly:
`font-size: calc(100cqi / R)` with `R` = the word's width at 1 px. Measured in the browser after the font
loaded: R = 4.245 (EB Garamond, −0.03em tracking); set to 4.26 so rounding never overflows. `qa/audit.mjs`
allow-lists this one selector.

**Scale:** major third (×1.25) from 16px, rounded to whole pixels. These nine sizes are the only font sizes:

| Token | `--fs-1` | `--fs-2` | `--fs-3` | `--fs-4` | `--fs-5` | `--fs-6` | `--fs-7` | `--fs-8` | `--fs-9` |
|---|---|---|---|---|---|---|---|---|---|
| px | 13 | 16 | 20 | 25 | 31 | 39 | 49 | 61 | 76 |

Headings step through the scale at breakpoints instead of `clamp()`, so no in-between size ever
renders: h1 39 / 49 / 61, h2 31 / 39 / 49, h3 25 / 25 / 31 (phone / tablet / desktop; one step smaller than the
first build, because both references set headlines small and let photographs carry the scale), each level
smaller than the one above. Body copy is in the ink (13.58:1); the soft ink is for labels and metadata only. Headings: line height 1.05 to 1.15, tracking −0.02em, `text-wrap: balance`. Body 16 / 1.6.
Inputs are 16px.

### Spacing: 8-px grid

`--s-1` 8 · `--s-2` 16 · `--s-3` 24 · `--s-4` 32 · `--s-6` 48 · `--s-8` 64 · `--s-12` 96 · `--s-16` 128.
Page gutter 16 (phone) / 32 (tablet) / 64 (desktop); content width max 1280; 12-column grid gutter 24.

### Radius (3 at most) and shadow (one)

`--r-0` and `--r-1` 0 (photographs, buttons, inputs, panels and cards are square, like both references) ·
`--r-pill` 999px (grind and size chips only).
`--shadow`: `0 24px 64px -24px` roast at 35%, used only by the cart drawer (both references use no shadows).

### Motion

| Token | Value | Used for |
|---|---|---|
| `--d-1` | 150ms | press feedback, hover overlays |
| `--d-2` | 250ms | count bump, chip and label states |
| `--d-3` | 400ms | drawer, grind crossfade |
| `--d-4` | 700ms | hero load sequence |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | every transition and animation (one ease-out) |

Only `transform` and `opacity` animate. There are no scroll reveals (removed 2026-11-17, D3): content is
on the page when it scrolls in. Under `prefers-reduced-motion: reduce` nothing moves: no hero settle, no hero
depth, the roast path snaps between its five states, the drawer appears without sliding.

## 3. Layout (redesign, 2026-11-17)

A fixed 64 px header, transparent over the hero with light words on a dark top scrim, the ground colour once
the page scrolls. Text blocks sit on the `.wrap` line (80 px at 1440); the 12-column grid (24 px gutters)
places the shop head, the origin split and the footer columns. Full-bleed photographs and colour halves run
edge to edge, as in both references.

| Section | Height | Composition | From |
|---|---|---|---|
| Hero | 1 screen | full-bleed green-bean sack; the demo notice, a small h1, the lede and one button in the lower left over a bottom scrim | both (D2, D4) |
| Manifesto | 1 screen | a centred serif statement, then an asymmetric collage of three photographs (one in black and white) | Canyon |
| Shop | 2 screens | h2 and lede on the split line; six rows: a 64/96 px roast thumbnail, the name, a roast tag and origin, the price; the open row shows grind and size chips and the grind preview | Coffee Collective |
| Featured | 1 screen | photo half and a terracotta half: tag, the coffee's name, notes, "Choose a grind", which opens its row in the shop | Coffee Collective |
| Origin | 1 screen | text left, photograph right on the 5/12 line | first build |
| Roast path (peak) | 5 screens | kept from the first build and restyled: square cards with tags, the sticky 3D bean on its path, backdrop from oat to ember | first build |
| Brew | 1 screen | an ink half with the recipe as a chevron list and an outline button; photograph half on the right | Coffee Collective |
| Close | 1 screen | a ground-coloured card floating over a still life: tag, h2, "Choose a coffee" | Canyon |
| Footer | auto | three link columns on the grid, the demo and fictional-brand lines, then the wordmark across the full width | both |

**How the 3D section fits in.** It keeps its own mechanics (the 3D guide) and takes the redesign's surface: the
same square cards on the ground colour, the same uppercase tags for stage labels, the same type roles, and a
backdrop that starts in the page's own oat and ends in the brew block's roast ink, so the page darkens into the
recipe instead of cutting to a new palette.

The demo notice appears in the hero, the cart drawer, on the checkout page (a bar and a box) and in the footer.
