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

// Fuori dall'app shell di proposito: il service worker stesso, i testi informativi
// e le icone PNG (servono solo al sistema quando si aggiunge l'app alla Home).
const EXCLUDED = [/^sw\.js$/, /\.txt$/, /^icons\/.*\.png$/];

test('sw.js dichiara CACHE_VERSION uguale ad APP_VERSION', () => {
  const cache = sw.match(/const CACHE_VERSION = '([^']+)';/);
  assert.ok(cache, 'CACHE_VERSION mancante');
  const version = readFileSync(join(APP, 'src/version.js'), 'utf8').match(/APP_VERSION = '([^']+)'/);
  assert.ok(version, 'APP_VERSION mancante');
  assert.equal(cache[1], version[1]);
});

test("ogni voce di SHELL esiste nell'app", () => {
  for (const p of shellList()) {
    if (p === './') continue;
    assert.ok(existsSync(join(APP, p)), `manca ${p}`);
  }
});

test("ogni file dell'app è nell'elenco SHELL del service worker", () => {
  const listed = new Set(shellList());
  const missing = walk(APP).map(rel).filter((f) => !EXCLUDED.some((re) => re.test(f)))
    .filter((f) => !listed.has(`./${f}`));
  assert.deepEqual(missing, [], `file non in SHELL: ${missing.join(', ')}`);
});

test('la shell senza font pesa meno di 300 KB', () => {
  const bytes = shellList()
    .filter((p) => p !== './' && !p.startsWith('./fonts/'))
    .reduce((sum, p) => sum + statSync(join(APP, p)).size, 0);
  assert.ok(bytes < 300 * 1024, `shell di ${(bytes / 1024).toFixed(1)} KB`);
});

test('nessuna risorsa da URL esterni (niente CDN a runtime)', () => {
  const offenders = walk(APP)
    .filter((f) => /\.(m?js|html|css)$/.test(f))
    .filter((f) => /(from\s*["']https?:|import\(\s*["']https?:|url\(\s*["']?https?:|(src|href)=["']https?:)/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map(rel), []);
});

test('ogni import relativo dei moduli punta a un file esistente', () => {
  for (const f of walk(join(APP, 'src')).filter((x) => x.endsWith('.js'))) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = fileURLToPath(new URL(m[1], `file://${f}`));
      assert.ok(existsSync(target), `${rel(f)} importa ${m[1]} che non esiste`);
    }
  }
});

test('il manifest è valido e usa percorsi relativi', () => {
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
});

test('index.html: viewport-fit=cover, apple-touch-icon e percorsi relativi', () => {
  const index = readFileSync(join(APP, 'index.html'), 'utf8');
  assert.match(index, /viewport-fit=cover/);
  assert.doesNotMatch(index, /user-scalable\s*=\s*no/);
  assert.match(index, /rel="apple-touch-icon" href="\.\/icons\/apple-touch-icon\.png"/);
  assert.ok(existsSync(join(APP, 'icons/apple-touch-icon.png')));
  for (const m of index.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(m[1].startsWith('./'), `percorso non relativo: ${m[1]}`);
});

test('config.js contiene solo URL e chiave pubblica, vuoti fino alla Fase 5', () => {
  const cfg = readFileSync(join(APP, 'config.js'), 'utf8');
  assert.match(cfg, /export const SUPABASE_URL = '';/);
  assert.match(cfg, /export const SUPABASE_ANON_KEY = '';/);
  const code = cfg.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /service_role|eyJ[A-Za-z0-9_-]{10,}|password|passphrase/i);
});

test('tokens.css contiene tutti i token di CLAUDE.md §5', () => {
  const css = readFileSync(join(APP, 'styles/tokens.css'), 'utf8');
  const expected = {
    '--paper': '#F7F2E8', '--paper-2': '#EFE7D6', '--paper-weekend': '#F2EBDC', '--today': '#FFF3C4',
    '--line': '#DDD2BE', '--field-border': '#8C7F69', '--white': '#FFFFFF',
    '--ink': '#1F1A14', '--ink-2': '#5A5043', '--ink-3': '#6B604F', '--binding': '#2B241C',
    '--ribbon': '#A3242B', '--ribbon-dark': '#7E1A20', '--ribbon-tint': '#F9E3E3', '--focus': '#1F5FAD',
    '--radius-s': '8px', '--radius-m': '12px', '--radius-l': '16px', '--radius-sheet': '22px',
    '--tap-min': '48px', '--tap-main': '64px',
  };
  for (const [name, value] of Object.entries(expected)) {
    assert.match(css, new RegExp(`${name}:\\s*${value};`), `token ${name} mancante o diverso`);
  }
  assert.match(css, /--font-ui:\s*'Atkinson Hyperlegible', system-ui, sans-serif;/);
  assert.match(css, /--font-title:\s*Lora, Georgia, serif;/);
  assert.match(css, /html\.large-text\s*\{\s*font-size:\s*115%;\s*\}/);
});
