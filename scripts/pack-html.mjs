/**
 * Packs the built prototype into ONE self-contained .html file.
 *
 * Why this exists: the prototype has to be shareable without a host. Vercel,
 * GitHub Pages and an org policy each blocked that in turn; a file you can
 * attach to a message depends on nobody.
 *
 * What gets inlined: the JS and CSS bundles, and every public/ file the app
 * loads by runtime path (state flags, candidate cut-outs, the shorts clips),
 * as data URIs behind the __DW_ASSETS__ map that src/data/assets.ts reads.
 *
 * What does NOT get inlined, on purpose: the feed stills come from Daily
 * Wire's own imgix CDN, and the two Google Fonts families. A plain HTML file
 * loads both perfectly well over the network — embedding them would only
 * bloat the file and copy the client's images into it. The consequence is
 * that the page wants internet for the feed thumbnails and the typefaces;
 * the map, the drawer and every interaction work offline.
 *
 *   npm run pack
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not .pathname: this project's path contains a space, which
// .pathname hands back percent-encoded and every fs call then misses.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');
// Which file to write: base by default, the creative edition when packing it.
const OUT = join(ROOT, process.env.PACK_OUT ?? 'election-hub-prototype.html');

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
};

/** Only the directories the app reaches for at runtime. */
const INLINE_DIRS = ['flags', 'candidates', 'shorts'];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function dataUri(file) {
  const mime = MIME[extname(file).toLowerCase()];
  if (!mime) return null;
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

// ---- collect the runtime assets -----------------------------------------
const assets = {};
let assetBytes = 0;
for (const dir of INLINE_DIRS) {
  for (const file of walk(join(PUBLIC, dir))) {
    const key = relative(PUBLIC, file);
    const uri = dataUri(file);
    if (!uri) continue;
    assets[key] = uri;
    assetBytes += statSync(file).size;
  }
}

// ---- read the build ------------------------------------------------------
let html = readFileSync(join(DIST, 'index.html'), 'utf8');
const bundles = readdirSync(join(DIST, 'assets'));
const js = bundles.find((f) => f.endsWith('.js'));
const css = bundles.find((f) => f.endsWith('.css'));
if (!js || !css) throw new Error('no build found — run `npm run build` first');

const jsCode = readFileSync(join(DIST, 'assets', js), 'utf8');
const cssCode = readFileSync(join(DIST, 'assets', css), 'utf8');

// ---- inline ---------------------------------------------------------------
html = html
  .replace(new RegExp(`\\s*<script[^>]*src="[^"]*${js}"[^>]*></script>`), '')
  .replace(new RegExp(`\\s*<link[^>]*href="[^"]*${css}"[^>]*>`), '');

// favicon, so the tab is not a broken icon
const favicon = dataUri(join(PUBLIC, 'favicon.svg'));
html = html.replace(/href="[^"]*favicon\.svg"/, () => `href="${favicon}"`);

/* Replacer FUNCTIONS, never replacement strings. A replacement string gives
   $& and $' their special meaning, and minified bundles are full of both —
   $' re-inserts everything after the match, which turned a 4MB file into
   78MB before this was a function. */
const head = `
    <style>${cssCode}</style>
    <script>globalThis.__DW_ASSETS__ = ${JSON.stringify(assets)};</script>`;
html = html.replace('</head>', () => `${head}\n  </head>`);
html = html.replace('</body>', () => `  <script type="module">${jsCode}</script>\n  </body>`);

writeFileSync(OUT, html);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';
console.log(`packed  ${relative(ROOT, OUT)}`);
console.log(`  assets inlined : ${Object.keys(assets).length} files (${mb(assetBytes)} raw)`);
console.log(`  bundle         : js ${mb(jsCode.length)} + css ${mb(cssCode.length)}`);
console.log(`  final          : ${mb(statSync(OUT).size)}`);
