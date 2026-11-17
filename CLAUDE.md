# Dolce Nova: project rules

Read LESSONS.md before starting work.

Before any work on 3D, animation or page design, read 3D-AND-DESIGN-GUIDE.md and follow it: its ten rules (section 1), the matching checklist in section 12 before committing, and section 13 as known failure modes. Where it conflicts with the taste or scroll-craft skills, say so and let the owner decide.

- Run design-taste-frontend scripts (start.mjs, gate.mjs) from the project root only, passing the page as site/index.html. Never run them inside site/.
- Before editing site CSS, read .claude/skills/design-taste-frontend/references/layout-v4.md sections 2-3; after any layout change, run `node .claude/skills/design-taste-frontend/scripts/gate.mjs site/index.html` before building further sections.
- When the owner asks to redesign from references, change the system the references share (palette, fonts, hero, the main product component) and show a 1440 screenshot of the current page beside the new one before building past the hero. If the palette, fonts and section order would stay the same, ask the owner first.
- A form handled by script ships its submit button `disabled` in the HTML and the script enables it. Keep qa/flow.mjs delaying `data/catalog.json` by 1.5 s and blocking `checkout.js` once.
