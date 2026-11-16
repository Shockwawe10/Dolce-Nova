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
