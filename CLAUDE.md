# Dolce Nova: project rules

Read LESSONS.md before starting work.

- Run design-taste-frontend scripts (start.mjs, gate.mjs) from the project root only, passing the page as site/index.html. Never run them inside site/.
- Before editing site CSS, read .claude/skills/design-taste-frontend/references/layout-v4.md sections 2-3; after any layout change, run `node .claude/skills/design-taste-frontend/scripts/gate.mjs site/index.html` before building further sections.
