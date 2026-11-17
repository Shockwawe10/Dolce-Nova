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
  { name: 'hero', src: 'c69', widths: [640, 960, 1280, 1920, 2560, 3456],
    alt: 'Green, unroasted coffee beans spilling from an open burlap sack onto a wooden floor' },
  { name: 'origin', src: 'm62054123', widths: [640, 960, 1280, 1920, 2560],
    alt: 'A hand lifting green coffee beans from a wide basket during sorting' },
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
  // Shop textures: whole bean per roast (the other Alorin shot, so nothing repeats), espresso and filter grinds.
  { name: 'bean-light', src: 'f125379394', crop: [2582, 930, 780, 780], widths: [420, 640, 780],
    alt: 'Whole light roasted coffee beans' },
  { name: 'bean-medium', src: 'f125379394', crop: [3400, 2380, 840, 840], widths: [420, 640, 840],
    alt: 'Whole medium roasted coffee beans' },
  { name: 'bean-dark', src: 'f125379394', crop: [1668, 2340, 840, 840], widths: [420, 640, 840],
    alt: 'Whole dark roasted coffee beans' },
  { name: 'grind-espresso', src: 'f197293151', crop: [880, 2150, 900, 900], widths: [420, 640, 840],
    alt: 'Fine espresso grind, soft as cocoa powder' },
  // redesign (REDESIGN-GUIDE.md section 7): featured coffee, closing card, collage
  { name: 'featured', src: 'c75', widths: [640, 960, 1280, 1920, 2560],
    alt: 'A spoonful of freshly roasted coffee beans lifted over a basket full of beans' },
  { name: 'close', src: 'm61713103', widths: [640, 960, 1280, 1920, 2560, 3200],
    alt: 'Filter coffee dripping into a glass server on a scale, kettles behind, in warm low light' },
  { name: 'col-trier', src: 'm147143894', widths: [480, 720, 960, 1280],
    alt: 'A steel sample trier drawn from the roasting drum, holding pale beans mid-roast' },
  { name: 'col-tray', src: 'm61712989', widths: [480, 720, 960, 1280],
    alt: 'Roasted beans turning in the cooling tray under the stirring arm' },
  { name: 'col-beans', src: 'c65', widths: [480, 720, 960, 1280],
    alt: 'Glossy roasted coffee beans filling the frame' },
  { name: 'grind-filter', src: 'f56710941', crop: [1120, 750, 1000, 1000], widths: [420, 640, 840, 1000],
    alt: 'Medium filter grind, like coarse sand' },
];

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
  const s = src[img.src];
  const [cw, ch] = img.crop ? [img.crop[2], img.crop[3]] : [s.width, s.height];
  const widths = img.widths.filter((w) => w <= cw);
  for (const w of widths) {
    for (const codec of ['avif', 'webp']) encode(`assets-src/${img.src}.jpg`, img.crop, w, `${OUT}/${img.name}-${w}.${codec}`, codec);
  }
  manifest[img.name] = { widths, ratio: [cw, ch], alt: img.alt, source: img.src,
    by: s.by, licence: s.licence, licenceUrl: s.licenceUrl, page: s.page, cropped: !!img.crop };
  console.log(img.name, widths.join(','));
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
