// Local static server for site/, mimicking GitHub Pages: /Dolce-Nova/ base path, extensionless .html,
// 404 for anything else. Usage: node tools/serve.mjs [port]   -> http://localhost:4600/Dolce-Nova/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('site');
const BASE = '/Dolce-Nova';
const PORT = Number(process.argv[2] || 4600);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain' };

async function file(p) {
  try { const s = await stat(p); return s.isFile() ? p : s.isDirectory() ? file(join(p, 'index.html')) : null; } catch { return null; }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/' || path === '') { res.writeHead(302, { Location: BASE + '/' }); return res.end(); }
  if (!path.startsWith(BASE + '/') && path !== BASE) { res.writeHead(404); return res.end('not found'); }
  const rel = normalize(path.slice(BASE.length) || '/');
  const target = resolve(ROOT, '.' + rel);
  if (!target.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  const found = (await file(target)) || (await file(target + '.html'));
  if (!found) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(found)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(await readFile(found));
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`));
