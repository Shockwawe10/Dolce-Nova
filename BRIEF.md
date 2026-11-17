# BRIEF.md — Dolce Nova

**Interviewed, 2026-11-16.** The user answered all ten questions by choosing from options Claude
proposed (an "Other" free-text choice was available on each). Answers are quoted exactly as chosen.
Everything under "Derived" is Claude's reading of those answers, not the user's words.

The fixed brief (structure, motion rules, acceptance checks) is the user's pasted spec; where it is
explicit it wins over the repo's skills, by the user's decision. Overrides are listed in QA.md.

**Scope change (user, 2026-11-16):** no Stripe, no Python, no server. A static site on GitHub Pages
(`shockwawe10.github.io/Dolce-Nova/`). Checkout is a manual demo form: the visitor enters card
details, nothing is charged, sent or stored. "The main focus right now is the design and premium
quality of the product itself." All commerce-server acceptance checks are dropped; design, motion and
quality checks stay.

Demo checkout safety rules (Claude's, so a public page never harvests real cards):
- The form has no `action`, makes no network request and never writes card fields to storage.
- Card inputs avoid `cc-*` autocomplete, so the browser does not offer the visitor's saved real cards;
  a "Use test card" button fills `4242 4242 4242 4242`.
- A visible notice on the page and in the checkout: demo shop, no payment is taken, do not enter a real card.

## Answers

| # | Topic | Answer (verbatim choice) |
|---|---|---|
| 1 | Vibe | **"Earthy, origin-led, honest"**: farm, soil, hands, sacks of green beans; a documentary photo essay |
| 2 | Journey | **"One bean's story"**: follow a single bean, green, roasted, ground, brewed; each section is one stage of its life |
| 3 | Energy curve | **"Bold open, calm shop, warm close"** |
| 4 | The one moment | **"The roast colour shift"**: in the craft section the beans visibly go from green to dark brown as you move through the roast step |
| 5 | Signature move | **"Grind preview"**: picking a grind shows the actual grind texture at macro scale, so the choice is visual, not a dropdown |
| 6 | Range | **"Premium-minimal"** |
| 7 | World | **"One continuous place"** |
| 8 | Assets | **"I will do it later"**: the user will supply logo, colours or fonts later. Build them as swappable tokens and a text wordmark |
| 9 | Name | **"Dolce Nova"** |
| 10 | The belief | **"Expensive and safe"**: "This person ships e-shops that look expensive and never lose an order." |

Photos: licensed stand-ins (earlier decision); grind macros: search Wikimedia Commons, credit each,
report if no consistent set of four exists.

## Derived

### The journey (one bean, one continuous place)

The continuity comes from the subject, not a camera flight: one bean's life is the thread, and the
ground, light and palette carry through every section. No pinned stage, no scroll-jacking, native
scroll throughout, as the fixed brief requires. scroll-craft forbids a continuous chain unless the brief
is literally one journey; here it is, and the chain is built from the story, not from video.

| Beat | Section | Stage of the bean | What the visitor learns |
|---|---|---|---|
| 1 Arrival | hero | green, at origin | this is a roastery that starts at the farm, and it sells coffee |
| 2 Choice | shop | roasted, bagged | six coffees, what each tastes of, and that the grind is a visual choice |
| 3 Ground | craft: origin | green, picked and sorted | where it grows and who handles it |
| 4 Transformation | craft: roast | green to brown | roasting is where the flavour is made (the peak) |
| 5 Warmth | craft: brew | ground, brewed | how it ends up in a cup |
| 6 Rest | footer | in the cup | honest close: test mode, credits |

### Feeling curve

1. **Hero: anticipation.** The headline, a raw green-bean photograph and one action arrive in a
   composed sequence (bold open).
2. **Shop: calm confidence.** Quiet cards, real prices, the grind preview answering every choice. Nothing moves unless the
   visitor acts (calm shop).
3. **Origin: groundedness.** Hands and green beans, slow and still: the quiet act before the peak.
4. **Roast: awe (peak).** Moving through the roast step, the beans shift from green through
   yellow and cinnamon to dark brown in real photographs, crossfaded with opacity only.
5. **Brew: warmth.** The cup, steam, a short recipe (warm close).
6. **Footer: trust.** Plain test-mode notice and credits; the page resolves rather than fading out.

No two adjacent beats share a feeling. Origin is deliberately the quietest beat, right before the peak.

### The peak

> "You scroll down and the beans actually roast, green to dark brown, right in front of you."

Lives in craft, step 2 (roast). It gets the largest scroll span of any step, and the best photographs.
Under reduced motion it shows the final roasted state (or a stepped fade), never a hidden image.

## Revisions log (the owner's words, verbatim, dated)

- **2026-11-16**, the roast section: "change the next session, next section of the design. So when we have a
  section when we talk about like roasting, I want this section to be like, you know, the path from the light to
  the dark. So, for example, we have while scrolling the single bean, like, yeah, and it while scrolling comes from
  light green to light to medium to dark, maybe changing environment, maybe changing like light or something like
  that, maybe using 3 VGS. I don't know how to better do that, but I wanted like to have background like a parallax
  effect or something like that, and have like a path when we scrolling, and on each stage I describing about this
  stage."
  Asked how to build the bean, the owner chose: "Real-time 3D bean (Recommended)" (over cut-out photographs).
  Built as a three.js bean on a drawn path; the four roast photographs remain as the fallback.
- **2026-11-16**, working rules: "now you have a new file, 3D, and design guide. There was used on my previous
  projects, analyze it and apply these rules whenever you will be working with 3D animations or design."
  Applied: `3D-AND-DESIGN-GUIDE.md` is loaded by CLAUDE.md for all 3D, animation and design work.
- **2026-11-17**, the redesign after two references (coffeecollective.dk, canyoncoffee.co): "go with your
  recommendations and start building I don't want you to also remove the $3D section that we have, but I want
  to this section to be coexistive and coherent with the rest of the design."
  Decisions taken from REDESIGN-GUIDE.md section 3: D1 = B (EB Garamond for statements and headings, Figtree for
  UI), D2 = A (keep the green-bean sack, full-bleed), D3 = remove the scroll reveals (the original brief's reveal
  criterion is dropped by the owner), D4 = A (demo notice stays in the hero), D5 = yes (two colour-block
  chapters). The 3D roast path stays and is restyled to match.
- **2026-11-17**, a global redesign, not an adjustment: "I want to like global redesign based on that two
  references ... Also, I want to replace the Coffe selection with the like carousel, and I prepared the
  references images for each Coffe in the zip folder called Dolcinova Coffe Blends."
  The zip (`dolce_nova_coffee_blends.zip`) holds nine owner-supplied bag renders for the six coffees.
  Decisions (asked and answered the same day):
  - one bag per coffee: Cerrado Natural with the lion emblem, Huila La Plata in forest green (the other three
    label variants are not used);
  - sizes follow the printed bag: **340 g and 1 kg** (250 g prices rescaled by 340/250, rounded to €0.50);
  - **a product page per coffee** (photo, notes, grind, size, add to cart, more coffees), reached from the
    carousel;
  - **the palette comes from the bags**: paper ground, near-black ink, the bags' forest green as the one
    accent, gold only inside photographs and the 3D path. Terracotta and the Garamond/Figtree pair are retired
    (type: Instrument Serif for display, Instrument Sans for text, my recommendation).
  The 3D roast path stays (earlier instruction) and takes the new palette.
- **2026-11-17**, the roast section: "I don't need the bean to be turned around. I need to him to be smooth. And on
  the beginning stage, it just appears like combining from the little particles ... Also the section before that
  is very big when you say bring coffee sorted by hand." Then: "think about whether we need the 3D section and
  whether it really fits in the whole conception of the design ... using just the 3D model of the bin itself, but
  made it more refined, maybe with no path ... still appears while scrolling, but just changing the color itself".
  Offered: a still-life bean (recommended) or the four roast photographs without 3D. Chosen: "still life".
  Built: one large bean on the hero's dark ground, one fixed pose, gathering from green grains during the intro,
  then only its roast changes; a numbered stage list beside it; three screens instead of five; no path, markers,
  chaff or turning. The origin block is shorter (72% of a screen at most, one paragraph).
- **2026-11-17**, checkout: "there is to be a mail name second name as always, like the standard process checkout
  shipping and if there is possible to like actually send the letter with all the information at the checkout
  price, shipping to the user whenever he enters his email, how long will it take."
  Explained that a static site needs an outside service to send email, and asked. Chosen: **preview only for now**
  (no real email; the confirmation page shows the exact email a live shop would send) and **Standard + Express**
  shipping: Standard 3-5 working days, EUR 4.90, free from EUR 40; Express 1-2 working days, EUR 9.90; EU addresses.
  A real sender (EmailJS from the browser, or a small serverless function with Resend) can be added later without
  rebuilding the checkout; it needs the owner's own account.
- **2026-11-17**, three refinements: "Either make all the images black and white, maybe make them a little bit
  bigger ... improve the 3D section ... turn around the bean itself, to be more visible of the cut, and also I would
  like to add some filter recipe ... a little bit bigger, and maybe add a brew, like for example, for a filter, for
  a mocha pot, or something like other".
  Built: the collage all in black and white and larger (one tall frame, two beside it); the bean's one fixed pose
  turned face-on so the S-shaped cut runs down its middle (the bean still never turns while scrolling); the brew
  block becomes "Three ways to brew it": pour-over, moka pot and espresso as tabs, each with its own photograph,
  recipe card, steps and a coffee to try. The French press was left out: we sell no coarse grind and the only
  free photograph was a cluttered kitchen counter.

### Tell-someone sentence

> "It's the site where you watch the coffee roast before you buy it."

### Signature move

**Grind preview.** In the shop, the grind choice is four real macro photographs (whole, espresso,
filter, cafetière) in a segmented control; picking one crossfades the card's texture image. It is
bespoke page code, compositor-only (opacity), and keyboard-operable as a radio group.

### Authored silence

The origin step is intentionally still (no motion beyond its one reveal) so the roast shift lands.
It is not dead scroll.

### Open

- Name check: "Dolce Nova" is the user's choice; search for clashes with real coffee brands before
  launch and report the result (not a veto).
- Logo, brand colours and fonts arrive later from the user: everything is a token in one `:root` block.
