// Comp-only: renders the first three products so each comp shows hero + shop with identical content.
const IMG = '../../site/assets/img/';
const items = [
  ['Yirgacheffe Konga', 'Ethiopia · Washed · Light', 'Bergamot, apricot, black tea', '€14.50', 'bean-light'],
  ['Huila La Plata', 'Colombia · Washed · Medium', 'Red apple, panela, cocoa', '€12.50', 'bean-medium'],
  ['Cerrado Natural', 'Brazil · Natural · Medium-dark', 'Hazelnut, dark chocolate, molasses', '€11.50', 'bean-dark'],
];
document.getElementById('shop-grid').innerHTML = items.map(([n, o, t, p, img]) => `
  <article class="card">
    <div class="tex"><picture><source type="image/avif" srcset="${IMG}${img}-640.avif"><img src="${IMG}${img}-640.webp" width="640" height="640" alt=""></picture></div>
    <h3>${n}</h3><p class="meta">${o}</p><p class="meta">${t}</p>
    <div class="seg" role="radiogroup"><span aria-checked="true">Whole bean</span><span>Espresso</span><span>Filter</span></div>
    <div class="row"><span>250 g</span><span>${p}</span></div>
  </article>`).join('');
