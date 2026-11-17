// Download the full-size originals of the chosen photographs into assets-src/ (gitignored).
// Sources: the taste skill's library (photos.json) and its Commons search results (.taste-skill/found.json).
// Usage: node tools/fetch-originals.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const IDS = ['c69', 'm62054123', 'c96', 'f84555762', 'f125379393', 'f125379394', 'f197293151', 'f56710941',
  'c75', 'm61713103', 'm147143894', 'm61712989', 'c65',   // redesign: featured coffee, close, collage
  'f143766326', 'm61716670',   // brew methods (2026-11-17): moka pot, espresso
  'f105363090', 'f137079822', 'f194922582', 'f102957452', 'f59165026', 'f159887397'];   // origin landscapes (2026-11-17)
const lib = JSON.parse(readFileSync('.claude/skills/design-taste-frontend/assets/photos/photos.json', 'utf8'));
const found = JSON.parse(readFileSync('.taste-skill/found.json', 'utf8'));
const flat = (x) => (Array.isArray(x) ? x : x.photos || Object.values(x).flat());
const all = [...flat(lib), ...flat(found)].filter((p) => p && p.id);

mkdirSync('assets-src', { recursive: true });
const meta = {};
for (const id of IDS) {
  const p = all.find((x) => x.id === id);
  if (!p) { console.log('missing', id); continue; }
  meta[id] = { by: p.by, licence: p.licence, licenceUrl: p.licenceUrl || '', page: p.page, url: p.url, width: p.width, height: p.height };
  const file = `assets-src/${id}.jpg`;
  if (existsSync(file)) { console.log('have', id); continue; }
  if (!p.url) {
    // some library photographs ship as local WebP files only: take the largest, converted for the encoder
    const dir = '.claude/skills/design-taste-frontend/assets/photos/img';
    const local = readdirSync(dir).filter((n) => n.startsWith(`${id}-`) && n.endsWith('.webp'))
      .sort((a, b) => Number(b.match(/-(\d+)\./)[1]) - Number(a.match(/-(\d+)\./)[1]))[0];
    if (!local) { console.log('fail', id, 'no url and no local file'); continue; }
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `${dir}/${local}`, '-q:v', '2', file]);
    const w = Number(local.match(/-(\d+)\./)[1]);
    meta[id] = { ...meta[id], url: `library:${local}`, width: w, height: Math.round(w * p.height / p.width) };
    console.log('ok', id, `local ${local}`, p.licence, p.by);
    continue;
  }
  const r = await fetch(p.url, { headers: { 'User-Agent': 'dolce-nova-build/1.0 (portfolio; image fetch)' } });
  if (!r.ok) { console.log('fail', id, r.status, p.url); continue; }
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log('ok', id, p.width + 'x' + p.height, p.licence, p.by);
}
writeFileSync('assets-src/sources.json', JSON.stringify(meta, null, 2));
