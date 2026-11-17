// Build every page image from the originals in assets-src/ (see tools/fetch-originals.mjs).
// One entry per image: source, optional square/rect crop in original pixels, output widths.
// Writes AVIF + WebP per width into site/assets/img/ and site/assets/img/manifest.json
// (dimensions, alt, author, licence) for the page and the credits page.
// Never upscales: widths above the crop's own width are dropped. Usage: node tools/images.mjs [name...]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const OUT = 'site/assets/img';
const src = JSON.parse(readFileSync('assets-src/sources.json', 'utf8'));

// crop: [x, y, w, h] in original pixels; omitted = full frame.
export const IMAGES = [
  { name: 'origin', src: 'm62054123', widths: [640, 960, 1280, 1920, 2560],
    alt: 'A hand lifting green coffee beans from a wide basket during sorting' },
  // origin landscapes for the product pages (2026-11-17)
  { name: 'origin-yirgacheffe', src: 'f105363090', widths: [960, 1280, 1920, 2560, 2880],
    alt: 'Cloud filling the valleys between green ridges in the highlands of southern Ethiopia' },
  { name: 'origin-nyeri', src: 'f137079822', widths: [960, 1280, 1920, 2560, 2880],
    alt: 'Green hills of trees and banana plants in the countryside near Nyeri, Kenya' },
  { name: 'origin-huila', src: 'f194922582', widths: [960, 1280, 1920, 2560, 2880],
    alt: 'Coffee branches with ripe red cherries above a deep river valley in Huila, Colombia' },
  { name: 'origin-huehuetenango', src: 'f102957452', widths: [960, 1280, 1920, 2560, 2880],
    alt: 'Morning haze over the valley of Huehuetenango, seen from the Cuchumatanes mountains' },
  { name: 'origin-cerrado', src: 'f59165026', widths: [960, 1280, 1920, 2560, 2880],
    alt: 'Low sun over a dry golden pasture in the Cerrado Mineiro, Brazil' },
  { name: 'origin-decaf', src: 'f159887397', widths: [960, 1280, 1920, 2560, 2880],
    alt: 'Cloud over green mountain pastures in Quindío, in Colombia’s coffee region' },
  // brew methods (2026-11-17): the pour-over above, then a moka pot and an espresso machine
  { name: 'brew-moka', src: 'f143766326', widths: [640, 960, 1280, 1920, 2560],
    alt: 'Coffee pouring from the centre column into the top chamber of a moka pot' },
  { name: 'brew-espresso', src: 'm61716670', widths: [640, 960, 1280, 1920, 2560],
    alt: 'Two streams of espresso running into a white cup at a dark machine' },
  { name: 'brew', src: 'c96', widths: [640, 960, 1280, 1920, 2560],
    alt: 'Hot water poured from a copper gooseneck kettle into a pour-over dripper, seen from above' },
  // The roast peak: one bean scale, four stages. Green from Roger Burger; light/medium/dark from one Alorin shot.
  { name: 'roast-green', src: 'f84555762', crop: [753, 1249, 1470, 1470], widths: [420, 640, 840],
    alt: 'Green, unroasted coffee beans filling the frame' },
  { name: 'roast-light', src: 'f125379393', crop: [4052, 1560, 760, 760], widths: [420, 640, 760],
    alt: 'Light roasted coffee beans, pale cinnamon brown' },
  { name: 'roast-medium', src: 'f125379393', crop: [2512, 1512, 840, 840], widths: [420, 640, 840],
    alt: 'Medium roasted coffee beans, even chestnut brown' },
  { name: 'roast-dark', src: 'f125379393', crop: [900, 1520, 840, 840], widths: [420, 640, 840],
    alt: 'Dark roasted coffee beans with an oily sheen' },
  // closing card and collage
  { name: 'close', src: 'm61713103', widths: [640, 960, 1280, 1920, 2560, 3200],
    alt: 'Filter coffee dripping into a glass server on a scale, kettles behind, in warm low light' },
  { name: 'col-trier', src: 'm147143894', widths: [480, 720, 960, 1280, 1920, 2400],
    alt: 'A steel sample trier drawn from the roasting drum, holding pale beans mid-roast' },
  { name: 'col-tray', src: 'm61712989', widths: [480, 720, 960, 1280, 1920],
    alt: 'Roasted beans turning in the cooling tray under the stirring arm' },
  { name: 'col-beans', src: 'c65', widths: [480, 720, 960, 1280],
    alt: 'Glossy roasted coffee beans filling the frame' },
  // The owner's bag renders (dolce_nova_coffee_blends.zip, extracted to assets-src/blends/): a 4:5 crop around the
  // bag for the carousel, the whole square for product pages and the hero.
  ...BAGS(),
];

function BAGS() {
  const files = { cerrado: '03_Cerrado_Natural_Lion_Emblem', yirgacheffe: '04_Yirgacheffe_Konga', nyeri: '05_Nyeri_Gatomboya',
    huila: '07_Huila_La_Plata_Forest_Green', huehuetenango: '08_Huehuetenango_Navy_Gold', decaf: '09_Sugarcane_Decaf_Burgundy_Gold' };
  const looks = { cerrado: 'white, with gold line engraving and a lion emblem, on a black ground',
    yirgacheffe: 'kraft paper, with gold engraving of a hillside farm, on a dark teal ground',
    nyeri: 'terracotta, with navy engraving of a village and coffee branches, on a dark teal ground',
    huila: 'forest green, with copper engraving and a lion emblem, on a brown ground',
    huehuetenango: 'navy, with gold engraving of mountains and a village, on a dark grey ground',
    decaf: 'burgundy, with gold engraving and a lion emblem, on a dark grey ground' };
  const names = { cerrado: 'Cerrado Natural', yirgacheffe: 'Yirgacheffe Konga', nyeri: 'Nyeri Gatomboya',
    huila: 'Huila La Plata', huehuetenango: 'Huehuetenango', decaf: 'Sugarcane Decaf' };
  return Object.entries(files).flatMap(([id, f]) => {
    const alt = `A 340 g bag of Dolce Nova ${names[id]}: ${looks[id]}`;
    const own = { file: `assets-src/blends/${f}.png`, owner: true, alt };
    return [{ name: `bag-${id}`, ...own, crop: [132, 40, 760, 950], widths: [240, 480, 760] },
      { name: `bag-${id}-sq`, ...own, widths: [640, 1024] }];
  });
}

function encode(input, crop, width, out, codec) {
  const vf = [crop ? `crop=${crop[2]}:${crop[3]}:${crop[0]}:${crop[1]}` : null, `scale=${width}:-2:flags=lanczos`]
    .filter(Boolean).join(',');
  const args = codec === 'avif'
    ? ['-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '30', '-b:v', '0', '-cpu-used', '4', '-pix_fmt', 'yuv420p']
    : ['-c:v', 'libwebp', '-quality', '78', '-compression_level', '6'];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vf', vf, ...args, '-frames:v', '1', out]);
}

const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const manifestPath = `${OUT}/manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
for (const img of IMAGES) {
  if (only.length && !only.includes(img.name)) continue;
  const s = img.owner ? { width: 1024, height: 1024, by: 'Dolce Nova (the owner)', licence: 'supplied by the owner for this site' } : src[img.src];
  const [cw, ch] = img.crop ? [img.crop[2], img.crop[3]] : [s.width, s.height];
  const widths = img.widths.filter((w) => w <= cw);
  for (const w of widths) {
    for (const codec of ['avif', 'webp']) encode(img.file || `assets-src/${img.src}.jpg`, img.crop, w, `${OUT}/${img.name}-${w}.${codec}`, codec);
  }
  manifest[img.name] = { widths, ratio: [cw, ch], alt: img.alt, source: img.src || 'owner-bags', owner: !!img.owner,
    by: s.by, licence: s.licence, licenceUrl: s.licenceUrl, page: s.page, cropped: !!img.crop };
  console.log(img.name, widths.join(','));
}
// entries for images no longer in the list are dropped, so the manifest and credits never list unused photographs
for (const k of Object.keys(manifest)) if (!IMAGES.some((i) => i.name === k)) delete manifest[k];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
