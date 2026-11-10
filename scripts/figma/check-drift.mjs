// Compares Figma variables with globals.css by their web code name. The code is the value source.
// Usage: node scripts/figma/check-drift.mjs <export.json> [more exports…]
// Each export comes from export-variables.js run through use_figma. Exits 1 when anything differs.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8');

function block(sel) {
  const out = {};
  const re = new RegExp('(^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{', 'g');
  let m;
  while ((m = re.exec(css))) {
    let i = m.index + m[0].length, depth = 1;
    const start = i;
    while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    const body = css.slice(start, i - 1).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  }
  return out;
}
// Tokens in @theme blocks (spacing, radius) sit beside :root; .dark overrides colours.
const base = { ...block('@theme'), ...block('@theme inline'), ...block(':root') };
const dark = { ...base, ...block('.dark') };
const resolve = (map, v, d = 0) =>
  d > 10 || !v ? v : v.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (all, n) => (map[n] ? resolve(map, map[n], d + 1) : all));

const hex6 = h => { h = h.replace('#', '').toLowerCase(); return h.length === 3 ? h.split('').map(c => c + c).join('') : h; };
function color(v) {
  v = v.trim();
  let m;
  if ((m = v.match(/^#([0-9a-f]{8})$/i))) return '#' + m[1].slice(0, 6).toLowerCase() + '@' + (parseInt(m[1].slice(6), 16) / 255).toFixed(3);
  if ((m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) return '#' + hex6(m[1]);
  if ((m = v.match(/^color-mix\(in srgb,\s*(#[0-9a-f]{3,6})\s+([\d.]+)%,\s*transparent\)$/i))) return '#' + hex6(m[1]) + '@' + (parseFloat(m[2]) / 100).toFixed(3);
  if ((m = v.match(/^color-mix\(in srgb,\s*(#[0-9a-f]{6})\s+([\d.]+)%,\s*(#[0-9a-f]{6})\)$/i))) {
    const p = parseFloat(m[2]) / 100, a = hex6(m[1]), b = hex6(m[3]);
    return '#' + [0, 2, 4].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p)).toString(16).padStart(2, '0')).join('');
  }
  if ((m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/))) return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') + (m[4] && +m[4] < 1 ? '@' + (+m[4]).toFixed(3) : '');
  if (v === 'transparent') return '#000000@0.000';
  return null; // oklch mixes and the like: not comparable here
}
const sameColor = (a, b) => {
  const [ha, aa = '1'] = String(a).split('@'), [hb, ab = '1'] = String(b).split('@');
  if (ha !== hb) return false;
  return Math.abs(parseFloat(aa) - parseFloat(ab)) < 0.006;
};
function number(syntax) {
  let m;
  const step = parseFloat((resolve(base, 'var(--spacing)').match(/[\d.]+/) || ['4'])[0]);
  if ((m = syntax.match(/^calc\(var\(--spacing\) \* ([\d.]+)\)$/))) return +m[1] * step;
  if (syntax === '0px') return 0;
  const r = resolve(base, syntax);
  if ((m = r && r.match(/^([\d.]+)px$/))) return +m[1];
  if ((m = r && r.match(/^([\d.]+)$/))) return +m[1];
  return null;
}

const rows = process.argv.slice(2).flatMap(f => JSON.parse(readFileSync(f, 'utf8')));
const drift = [], skipped = [];
for (const r of rows) {
  const name = (r.syntax.match(/^var\((--[\w-]+)\)$/) || [])[1];
  if (r.type === 'COLOR') {
    if (!name) { skipped.push(`${r.name}: ${r.syntax}`); continue; }
    if (!(name in base)) { skipped.push(`${r.name}: ${name} is not in globals.css`); continue; }
    const cl = color(resolve(base, base[name])), cd = color(resolve(dark, dark[name]));
    if (cl === null || cd === null) { skipped.push(`${r.name}: ${name} uses a mix this check can't read`); continue; }
    if (!sameColor(r.light, cl) || !sameColor(r.dark, cd)) drift.push(`${r.name.padEnd(32)} ${name.padEnd(26)} Figma ${r.light} / ${r.dark}   code ${cl} / ${cd}`);
  } else if (r.type === 'FLOAT') {
    const code = number(r.syntax);
    if (code === null) { skipped.push(`${r.name}: ${r.syntax}`); continue; }
    if (Math.abs(code - r.light) > 0.01) drift.push(`${r.name.padEnd(32)} ${r.syntax.padEnd(26)} Figma ${r.light}   code ${code}`);
  }
}
console.log(`Checked ${rows.length} variables against globals.css.`);
console.log(drift.length ? `\n${drift.length} differ (code is the source):\n` + drift.join('\n') : '\nNo drift.');
if (skipped.length) console.log(`\nNot compared (${skipped.length}):\n` + skipped.join('\n'));
process.exit(drift.length ? 1 : 0);
