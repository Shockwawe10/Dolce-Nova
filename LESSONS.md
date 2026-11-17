# Lessons

Written by /aar-loop after each session's After Action Review. Read this file before starting a new task in this project. Every entry should be concrete and checkable, never vague.

## 2026-11-16 -- Run every design-taste-frontend script (start.mjs deal, gate.mjs) from the project root and pass the page as site/index.html; never cd into site/ to run the gate.
- Expected: Three gate rounds in site/ would close the taste-skill build.
- Actual: start.mjs deal had armed a second gate session at the project root (build.json page: null); the Stop hook enforced that one, so three more rounds had to be run by hand.
- Why: The gate arms in the folder it runs in; the Stop hook checks the project-root .taste-skill, not site/.taste-skill.
- tags: taste-skill,gate,fix-applied (CLAUDE.md)

## 2026-11-16 -- Before writing a page's CSS, read design-taste-frontend references/layout-v4.md sections 2-3 and run gate.mjs once the hero and one section exist.
- Expected: The finished page would pass the taste gate with a few fixes.
- Actual: First gate run: 60 FAIL, including the section box (1-2 screens, h2 at 120px, fixed header), 12-col/24px split lines and text-left/visual-right; the whole layout was restructured after the site was done.
- Why: SKILL.md step 4 says to read layout-v4.md, system.md and sections.md before the first page; that step was skipped and the gate only ran at the end.
- tags: taste-skill,layout,fix-applied (CLAUDE.md)

## 2026-11-16 -- Never set html { scroll-behavior: smooth } globally; smooth-scroll only on in-page link clicks via scrollIntoView, so keyboard focus scrolls instantly.
- Expected: Tab to the first coffee row would show a visible focus ring.
- Actual: The gate's focus probe found the focused button off-screen (r.top > innerHeight) at Tab stop 7.
- Why: Page-wide smooth scrolling also animates focus scrolling, so focus lands on a control still below the viewport. Fixed in 15c0468 (mountAnchors in motion.js).
- tags: a11y,focus,css,fix-applied

## 2026-11-17 -- When the owner asks to redesign from references, change the system the references share (palette, fonts, hero, the main product component) and show a 1440 screenshot of the current page beside the new one before building past the hero; if the palette, fonts and section order would stay the same, ask the owner first.
- Expected: The reference-led redesign (REDESIGN-GUIDE.md, decisions D1-D5) would read as a new site.
- Actual: The owner said it felt like the old site with a few changes; the global redesign (bag carousel, product pages, palette and type from the owner's bags) was built after that, the same day.
- Why: The first pass kept the flour and terracotta palette, the section order and most of the copy, and swapped only fonts and layout; no side-by-side of old and new was shown before it shipped.
- tags: redesign,process,fix-applied (CLAUDE.md)

## 2026-11-17 -- A form that script handles ships its submit button disabled in the HTML and script enables it once its data has loaded; qa/flow.mjs delays data/catalog.json by 1.5 s on every run and blocks checkout.js once to prove no native submit happens.
- Expected: The product page and the checkout would work for every visitor, as they did locally.
- Actual: The live flow at 1440 kept the old price after choosing 1 kg; on checkout, Enter before checkout.js ran submitted a native GET and put the card number in the URL (checkout.html?number=4242+4242+4242+4242), present since the first build.
- Why: Listeners attached only after await load(); the local server answers in milliseconds, so local runs never hit that window. The checkout form had no action, so its native submit was a GET to itself.
- tags: forms,security,load-order,fix-applied (qa/flow.mjs, checkout.html, product.js, CLAUDE.md)

## 2026-11-17 -- On this Windows machine, write any multi-line node script that holds backticks or nested quotes to a file with the Write tool and run node <file>; never pass it through a Bash heredoc. For strings in files that may hold non-ASCII spaces (a no-break space in '250 g'), replace by index (indexOf between two anchors) instead of matching the typed text.
- Expected: node - <<'EOF' blocks would apply multi-file edits in one step.
- Actual: Four runs failed with 'unexpected EOF while looking for matching' or a 'missing anchor' error; one left roast3d.js importing an export that no longer existed until it was fixed by hand.
- Why: The Bash tool (Git Bash) mis-parses heredocs that contain backticks and nested quotes, and a typed anchor with a normal space does not match a no-break space in the file.
- tags: tooling,windows,bash
