# REFERENCE_NOTES.md

Measured 2026-11-16 with `tools/ref-measure.mjs`: Chromium (Playwright 1.62.1), 1440×900 and
390×844, from **computed styles** and `document.getAnimations()`, after one full scroll so lazy
content and reveals register. Raw data: `qa/out/refs/*.json` (regenerate with the script; not committed).
Principles only: no code, asset or text from either site is used.

## Why these two

| Site | Why it is a reference |
|---|---|
| **La Cabra** (lacabra.com), Aarhus roaster | Premium-minimal coffee retail: warm off-white ground, a near-black olive ink, a serif display over a geometric sans. The closest existing statement of the look the brief asks for. |
| **Onyx Coffee Lab** (onyxcoffeelab.com) | A specialty roaster whose shop is organised around origin and tasting notes, with long cinematic load and reveal motion. Useful for the opposite end: how far motion can go before it costs speed. |

**Aesop (aesop.com) was the first choice and was dropped.** Its homepage served a Cloudflare bot
check to the headless browser. I did not try to get around it. La Cabra's cookie dialog locks
scrolling, so the script clicked "Decline all", as a visitor would, before measuring.

## Measurements

### Type scale (rendered text sizes, by frequency)

| | La Cabra 1440 | La Cabra 390 | Onyx 1440 | Onyx 390 |
|---|---|---|---|---|
| Body / UI | 16, 13, 11 | 14, 13, 11 | 14, 12, 16 | 14, 12, 16 |
| Headings | H1 44, H2 33, H3 16 (500) | H3 24 | H2 68, 24, 16 | H2 68, 24, 16 |
| Display | 44 | 44 / 36 | 115.2 (marquee type) | 70 |
| Families | serif display ("Anth") + Gotham | same | Bajern display + Montserrat | same |

- La Cabra's display steps (11 → 13 → 16 → 24 → 33 → 44) are close to a **1.33 ratio**: a real
  modular scale, headline weight 400, tracking **−0.02em** (−0.66px at 33, −0.88px at 44).
  Line height 1.2 on H2, 1.3 on H1.
- Onyx uses no consistent ratio (12, 14, 16, 22, 24, 68, 115) and line height 1.0 on all headings.

### Spacing rhythm

- La Cabra: dominant values 10, 5, 8, 2, 16, 20 px. Not on an 8-px grid; spacing reads loose and
  even rather than systematic.
- Onyx: 8, 12, 20, 60, 10 px at 1440; 8, 12, 20, 25, 60 at 390. Mostly a 4-px rhythm with 60-px
  section padding.

### Section heights (in viewport heights, top to bottom)

- La Cabra: 0.68, 0.68, 0.76, 0.66, 0.87, 0.97, 0.81, 0.81, 1.02 at 1440. **6.8 screens** in all
  (7.7 on a phone). Sections rarely fill a screen; the page reads as a calm catalogue.
- Onyx: 1.0 hero, then alternating 0.86 / 0.65. **17.8 screens** (22.2 on a phone).

### Colour, radius, shadow

- La Cabra: ink rgb(52,53,42) and soft ink rgb(91,92,83) on rgb(248,241,236) and rgb(235,227,222):
  **two warm grounds, two inks**, no saturated accent. Radii only 50% (round icons) and 40px (pills).
  **No box-shadows at all.**
- Onyx: black and white with cream rgb(251,250,243); radii mostly 0 (one arched 720px top). No shadows.

### Motion (computed transitions and running animations)

| | La Cabra | Onyx |
|---|---|---|
| Durations | 300 ms (37 elements), 400 ms (13), 100 ms (11), 150 ms | 1.1 s / 1.7 s reveals (159), 600 ms, 300 ms, 200 ms, 400 ms |
| Easing | `ease`; `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (an ease-out) | `ease`, `ease-out` |
| Properties | **opacity** (50), color, filter, transform | opacity + transform (most); also `all` (34) |
| On load | `slideIn` 600 ms linear | opacity 1000 ms, transform 5000 ms (hero video drift), marquees 30 s |

## Principles taken

1. **One modular scale, 400-weight serif display, −0.02em tracking**, line height 1.05 to 1.2 on headings (La Cabra).
2. **Warm off-white ground, a warm near-black ink, one soft ink**; colour comes from the photographs (La Cabra).
3. **No shadow as decoration.** Both use none, so ours is reserved for the drawer, the one surface that floats.
4. **Short durations for interface (150 to 400 ms), one longer step for the hero (about 600 to 700 ms)**,
   ease-out, opacity first (La Cabra). Onyx's 1.1 to 1.7 s reveals feel slow on a shop; ours cap at 700 ms.
5. **Calm page length.** La Cabra's 6.8 screens is the right order for six products, one story and a
   checkout. Ours aims for 7 to 9 at 1440 (the roast peak takes two of them).
6. **Avoid what both do that the brief forbids:** Onyx's `transition: all` (34 elements), its "Scroll" cue,
   marquees, and a 5-second hero drift; La Cabra's linear easing on load.

## Second pair (2026-11-17, chosen by the owner)

Coffee Collective (coffeecollective.dk) and Canyon Coffee (canyoncoffee.co), measured the same way plus
screen-by-screen frames (`tools/ref-frames.mjs`). Measurements, principles and the build plan are in
**REDESIGN-GUIDE.md**.

## Not taken

Anything recognisable: no layout, logo treatment, copy, iconography, photograph or effect from either site.
