import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const sw = readFileSync(join(APP, 'sw.js'), 'utf8');

function shellList() {
  const block = sw.match(/const SHELL = \[([\s\S]*?)\];/);
  assert.ok(block, 'SHELL non trovato in sw.js');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const rel = (f) => relative(APP, f).split(sep).join('/');

// Fuori dall'app shell per scelta: il service worker stesso, le licenze e le icone PNG
// (servono solo al sistema quando si installa l'app sulla Home, non al funzionamento offline).
const EXCLUDED = [/^sw\.js$/, /\.gitkeep$/, /\.txt$/, /^icons\/.*\.png$/];

test('sw.js dichiara CACHE_VERSION uguale ad APP_VERSION', async () => {
  const m = sw.match(/const CACHE_VERSION = '([^']+)';/);
  assert.ok(m, 'CACHE_VERSION non trovato');
  const { APP_VERSION } = await import(new URL('../app/src/version.js', import.meta.url));
  assert.equal(m[1], APP_VERSION);
});

test('ogni file dell\'app shell esiste', () => {
  for (const p of shellList()) {
    if (p === './') continue;
    assert.ok(existsSync(join(APP, p)), `manca ${p}`);
  }
});

test('ogni file dell\'app è nell\'elenco SHELL del service worker', () => {
  const listed = new Set(shellList());
  const missing = walk(APP).map(rel)
    .filter((f) => !EXCLUDED.some((re) => re.test(f)))
    .filter((f) => !listed.has(`./${f}`));
  assert.deepEqual(missing, [], `file non in SHELL: ${missing.join(', ')}`);
});

test('nessun file in SHELL è elencato due volte', () => {
  const list = shellList();
  assert.equal(new Set(list).size, list.length);
});

test('la shell senza font pesa meno di 300 KB', () => {
  const bytes = shellList()
    .filter((p) => p !== './' && !p.startsWith('./fonts/'))
    .reduce((sum, p) => sum + statSync(join(APP, p)).size, 0);
  assert.ok(bytes < 300 * 1024, `shell di ${Math.round(bytes / 1024)} KB`);
});

test('nessuna risorsa da URL esterni (nessun CDN a runtime)', () => {
  const offenders = walk(APP)
    .filter((f) => /\.(m?js|html|css)$/.test(f))
    .filter((f) => /(from\s*["']https?:|import\(\s*["']https?:|url\(\s*["']?https?:|(src|href)=["']https?:)/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map(rel), []);
});

test('ogni import relativo dei moduli punta a un file esistente', () => {
  for (const f of walk(join(APP, 'src'))) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(f, 'utf8');
    for (const [, spec] of src.matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = fileURLToPath(new URL(spec, `file://${f}`));
      assert.ok(existsSync(target), `${rel(f)}: import ${spec} non trovato`);
    }
  }
});

test('il manifest è valido, con percorsi relativi e icone presenti', () => {
  const m = JSON.parse(readFileSync(join(APP, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Agenda');
  assert.equal(m.short_name, 'Agenda');
  assert.equal(m.display, 'standalone');
  assert.equal(m.background_color, '#F7F2E8');
  assert.equal(m.theme_color, '#F7F2E8');
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  const sizes = m.icons.map((i) => `${i.sizes}:${i.purpose}`);
  for (const s of ['192x192:any', '512x512:any', '512x512:maskable']) assert.ok(sizes.includes(s), `icona ${s} mancante`);
  for (const i of m.icons) assert.ok(existsSync(join(APP, i.src)), `manca ${i.src}`);
  assert.ok(existsSync(join(APP, 'icons/apple-touch-icon.png')), 'manca apple-touch-icon.png');
});

test('index.html: viewport-fit=cover, zoom consentito, lingua italiana', () => {
  const index = readFileSync(join(APP, 'index.html'), 'utf8');
  assert.match(index, /viewport-fit=cover/);
  assert.doesNotMatch(index, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
  assert.match(index, /<html lang="it">/);
  assert.match(index, /rel="apple-touch-icon"/);
});

test('config.js contiene solo URL e chiave pubblica, nessun segreto', () => {
  const cfg = readFileSync(join(APP, 'config.js'), 'utf8');
  assert.doesNotMatch(cfg, /eyJhbGciOi|sb_secret_/); // né JWT service_role né chiavi segrete
  assert.match(cfg, /SUPABASE_URL = '(https:\/\/[a-z0-9]+\.supabase\.co)?'/);
  assert.match(cfg, /SUPABASE_ANON_KEY = '(sb_publishable_[A-Za-z0-9_-]+)?'/);
  const code = cfg.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /password|passphrase|service_role/i);
});

test('tokens.css contiene tutti i token del design system', () => {
  const css = readFileSync(join(APP, 'styles/tokens.css'), 'utf8');
  const expected = {
    '--paper': '#F7F2E8', '--paper-2': '#EFE7D6', '--paper-weekend': '#F2EBDC', '--today': '#FFF3C4',
    '--line': '#DDD2BE', '--field-border': '#8C7F69', '--white': '#FFFFFF',
    '--ink': '#1F1A14', '--ink-2': '#5A5043', '--ink-3': '#6B604F', '--binding': '#2B241C',
    '--ribbon': '#A3242B', '--ribbon-dark': '#7E1A20', '--ribbon-tint': '#F9E3E3', '--focus': '#1F5FAD',
    '--radius-s': '8px', '--radius-m': '12px', '--radius-l': '16px', '--radius-sheet': '22px',
    '--tap-min': '48px', '--tap-main': '64px',
  };
  for (const [k, v] of Object.entries(expected)) assert.match(css, new RegExp(`${k}:\\s*${v};`), `${k} deve valere ${v}`);
  assert.match(css, /--font-ui:\s*'Atkinson Hyperlegible'/);
  assert.match(css, /--font-title:\s*Lora/);
  assert.match(css, /html\.large-text\s*\{\s*font-size:\s*115%;/);
});

test('i font sono self-hosted e dichiarati con font-display: swap', () => {
  const css = readFileSync(join(APP, 'styles/base.css'), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.equal(faces.length, 4);
  for (const f of faces) {
    assert.match(f, /font-display:\s*swap/);
    const src = f.match(/url\('\.\.\/(fonts\/[^']+\.woff2)'\)/);
    assert.ok(src && existsSync(join(APP, src[1])), `font mancante: ${f}`);
  }
});
