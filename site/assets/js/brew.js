// Brew at home: three recipes as tabs (WAI-ARIA tabs with automatic activation: arrows, Home and End move
// between them). The photograph beside the recipes follows the chosen tab (an opacity crossfade).
export function mountBrew(root = document.querySelector('.brew')) {
  if (!root) return;
  // each recipe's name is its tab: the heading stays for screen readers (and shows when there is no script)
  root.querySelectorAll('.recipe__title').forEach((t) => t.classList.add('visually-hidden'));
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const photos = [...document.querySelectorAll('[data-brew-photo]')];
  const select = (k, focus) => {
    tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === k)); t.tabIndex = i === k ? 0 : -1; });
    panels.forEach((p, i) => p.classList.toggle('is-on', i === k));
    photos.forEach((p, i) => p.classList.toggle('is-on', i === k));
    if (focus) tabs[k].focus();
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i, false)));
  root.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const k = tabs.indexOf(document.activeElement);
    if (k < 0) return;
    const to = { ArrowRight: (k + 1) % tabs.length, ArrowLeft: (k - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(to, true);
  });
}
