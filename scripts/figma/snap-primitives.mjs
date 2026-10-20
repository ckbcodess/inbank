// Option B: snap semantic + component colour tokens onto clean 50–950 ramps (names match the Figma Color Primitives).
// Dry run writes docs/primitive-snap-review.html and scripts/figma/snap-plan.json. Nothing in globals.css changes
// until --write. Usage: node scripts/figma/snap-primitives.mjs src/app/globals.css [--write]
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = process.argv[2];
const WRITE = process.argv.includes('--write');
const css = readFileSync(FILE, 'utf8');

// Illustration families, helpers and the warm receipt paper keep their exact values.
const RAW = /^(avatar|tx|tint|banner|icon|spend|mc|device|dm|ticket|hover-mix-color|ripple-color)(-|$)/;

// Ramps. gray uses the code's own neutrals (with dark-mode depth steps); amber and smoke are the existing Figma
// ramps; red/green/blue/orange/teal/violet/pink are the Tailwind ramps Figma already uses (or will add).
const RAMPS = {
  gray: { 50: '#fafafa', 100: '#f5f5f5', 200: '#ebebeb', 300: '#b8b8b8', 400: '#a1a1a1', 500: '#8a8a8a', 600: '#737373', 700: '#404040',
    750: '#2b2b2b', 800: '#262626', 825: '#212121', 850: '#1c1c1c', 875: '#181818', 900: '#121212', 950: '#0a0a0a', 975: '#080808' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#ffc423', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  smoke: { 50: '#f4f6f8', 100: '#e8ecf0', 200: '#d2d8df', 300: '#b3bcc6', 400: '#818d9a', 500: '#5e6973', 600: '#475560', 700: '#38434c', 800: '#2a333a', 900: '#1a2025', 950: '#0f1419' },
};
const FIXED = { white: '#ffffff', black: '#000000' };

// ---- colour maths ----
const lin = x => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const toLin = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const c = v => Math.min(1, Math.max(0, toLin(v)));
  return { r: c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), g: c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), b: c(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) };
}
function oklab({ r, g, b }) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s };
}
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
const rgb = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const dE = (x, y) => { const p = oklab(x), q = oklab(y); return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b); };
function parseColour(v) {
  v = v.trim(); let m;
  if ((m = v.match(/^#([0-9a-f]{3,8})$/i))) { let h = m[1]; if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = i => parseInt(h.slice(i, i + 2), 16) / 255; return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 }; }
  if ((m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/i))) return { ...oklchToRgb(+m[1], +m[2], +m[3]), a: m[4] === undefined ? 1 : m[5] ? +m[4] / 100 : +m[4] };
  if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[,/]\s*([\d.]+))?\s*\)$/i))) return { r: m[1] / 255, g: m[2] / 255, b: m[3] / 255, a: m[4] === undefined ? 1 : +m[4] };
  if ((m = v.match(/^color-mix\(in [a-z]+,\s*(#[0-9a-f]{3,8})\s+([\d.]+)%\s*,\s*transparent\s*\)$/i))) { const c = parseColour(m[1]); return { ...c, a: c.a * (+m[2] / 100) }; }
  return null;
}
function familyOf(c) {
  const { a, b } = oklab(c); const C = Math.hypot(a, b), H = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  if (C < 0.018) return 'gray';
  if (C < 0.07 && H > 200 && H < 280) return 'smoke';
  if (H >= 335 || H < 10) return 'pink';
  if (H < 35) return 'red';
  if (H < 50) return 'orange';
  if (H < 105) return 'amber';
  if (H < 170) return 'green';
  if (H < 205) return 'teal';
  if (H < 280) return 'blue';
  if (H < 320) return 'violet';
  return 'pink';
}
function snap(c) {
  const fam = familyOf(c);
  const cands = Object.entries(RAMPS[fam]).map(([s, h]) => ({ name: `${fam}-${s}`, h }));
  if (fam === 'gray') cands.push({ name: 'white', h: FIXED.white }, { name: 'black', h: FIXED.black });
  let best = null;
  for (const k of cands) { const d = dE(c, rgb(k.h)); if (!best || d < best.d) best = { ...k, d }; }
  return best;
}

// ---- declarations in the colour blocks ----
const blocks = [];
for (const sel of [':root', '.dark']) {
  const re = new RegExp('(^|\\n)' + sel.replace('.', '\\.') + '\\s*\\{', 'g');
  for (const hit of css.matchAll(re)) {
    let i = hit.index + hit[0].length, d = 1; const start = i;
    while (d && i < css.length) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; }
    blocks.push({ sel, start, end: i - 1 });
  }
}
const rows = [];
for (const b of blocks) for (const m of css.slice(b.start, b.end).matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
  const name = m[1], value = m[2].trim();
  if (RAW.test(name) || /^(shell-header)$/.test(name)) continue;
  const c = parseColour(value); if (!c) continue;
  const s = snap(c);
  const alpha = Math.round(c.a * 1000) / 1000;
  const to = alpha === 1 ? `var(--${s.name})` : `color-mix(in srgb, var(--${s.name}) ${Math.round(alpha * 1000) / 10}%, transparent)`;
  rows.push({ name, mode: b.sel === '.dark' ? 'dark' : 'light', from: value, fromHex: hex(c), alpha, to, prim: s.name, toHex: s.h, dE: Math.round(s.d * 1000) / 1000, at: b.start + m.index });
}

// ---- review sheet ----
const used = new Set(rows.map(r => r.prim));
const band = d => (d < 0.01 ? 'same' : d < 0.03 ? 'slight' : 'visible');
const sw = (h, a) => `<span class="sw" style="background:${h};opacity:${a}"></span>`;
const tr = r => `<tr class="${band(r.dE)}"><td><code>--${r.name}</code></td><td>${r.mode}</td><td>${sw(r.fromHex, r.alpha)}<code>${r.fromHex}${r.alpha < 1 ? ' @' + Math.round(r.alpha * 100) + '%' : ''}</code></td><td>${sw(r.toHex, r.alpha)}<code>${r.prim}</code> <span class="muted">${r.toHex}</span></td><td class="num">${r.dE.toFixed(3)}</td><td>${band(r.dE)}</td></tr>`;
const counts = { same: 0, slight: 0, visible: 0 }; rows.forEach(r => counts[band(r.dE)]++);
const sorted = [...rows].sort((a, b) => b.dE - a.dE);
const ramps = Object.entries(RAMPS).map(([f, steps]) => `<div class="ramp"><div class="rname">${f}</div>${Object.entries(steps).map(([s, h]) => `<div class="step ${used.has(f + '-' + s) ? 'used' : ''}" title="${f}-${s} ${h}"><span style="background:${h}"></span><small>${s}</small></div>`).join('')}</div>`).join('');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Primitive snap review</title>
<style>
:root{--bg:#fff;--fg:#0a0a0a;--muted:#737373;--line:#ebebeb;--vis:#fff4d6;--sl:#fafafa}
@media (prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#fafafa;--muted:#a1a1a1;--line:#262626;--vis:#2b2205;--sl:#121212}}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 "Open Sans",system-ui,sans-serif;padding:32px 16px}
main{max-width:1100px;margin:0 auto}h1{font-weight:500;font-size:22px;margin:0 0 4px}h2{font-weight:500;font-size:16px;margin:32px 0 12px}
.muted{color:var(--muted)}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{font-weight:500;color:var(--muted)}tr.visible{background:var(--vis)}tr.slight{background:var(--sl)}.num{font-variant-numeric:tabular-nums}
.sw{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid var(--line);vertical-align:middle;margin-right:6px}
code{font-size:12px}.ramp{display:flex;align-items:center;gap:4px;margin:6px 0;flex-wrap:wrap}.rname{width:64px;color:var(--muted)}
.step{display:flex;flex-direction:column;align-items:center;gap:2px;opacity:.45}.step.used{opacity:1}.step span{width:32px;height:24px;border-radius:4px;border:1px solid var(--line)}.step small{font-size:10px;color:var(--muted)}
.wrap{overflow-x:auto}
</style></head><body><main>
<h1>Primitive snap review</h1>
<p class="muted">Option B: every semantic and component colour token in <code>globals.css</code> moved to the nearest step of a clean ramp in its own hue. ΔE is OKLab distance: under 0.01 you can't see it, 0.01–0.03 is slight, above 0.03 is visible. Nothing is applied yet. Illustration colours (avatars, transaction marks, tints, banners, duotone icons, spend chart, ticket paper) keep their exact values.</p>
<p><strong>${rows.length}</strong> token values: <strong>${counts.same}</strong> unchanged to the eye, <strong>${counts.slight}</strong> slight, <strong>${counts.visible}</strong> visible (highlighted).</p>
<h2>Ramps</h2><p class="muted">Faded steps aren't used by any token yet.</p>${ramps}
<h2>Every token, biggest shift first</h2><div class="wrap"><table><thead><tr><th>Token</th><th>Mode</th><th>Now</th><th>Snaps to</th><th>ΔE</th><th></th></tr></thead><tbody>${sorted.map(tr).join('')}</tbody></table></div>
</main></body></html>`;
writeFileSync(new URL('../../docs/primitive-snap-review.html', import.meta.url), html);
writeFileSync(new URL('./snap-plan.json', import.meta.url), JSON.stringify({ ramps: RAMPS, fixed: FIXED, rows: rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'at'))) }, null, 1));

if (WRITE) {
  let out = css;
  for (const r of [...rows].sort((a, b) => b.at - a.at)) {
    const seg = out.slice(r.at);
    const re = new RegExp(`--${r.name}\\s*:\\s*${r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`);
    out = out.slice(0, r.at) + seg.replace(re, `--${r.name}: ${r.to};`);
  }
  // Full ramps, so every Figma primitive's code syntax points at a variable that exists.
  const lines = [];
  for (const [f, steps] of Object.entries(RAMPS)) for (const [s, h] of Object.entries(steps)) lines.push(`  --${f}-${s}: ${h};`);
  for (const [n, h] of Object.entries(FIXED)) lines.push(`  --${n}: ${h};`);
  const block = `/* Colour primitives: clean ramps (names match Figma Color Primitives). Semantic and component tokens point
   here; only illustration families keep raw values. Generated by scripts/figma/snap-primitives.mjs. */\n:root {\n${lines.join('\n')}\n}\n\n`;
  const first = blocks.find(b => b.sel === ':root' && /--background\s*:/.test(css.slice(b.start, b.end)));
  const at = out.lastIndexOf('\n:root', first.start) + 1;
  if (!css.includes('/* Colour primitives:')) out = out.slice(0, at) + block + out.slice(at);
  writeFileSync(FILE, out);
}
console.log(JSON.stringify({ tokens: rows.length, ...counts, primitivesUsed: used.size, top: sorted.slice(0, 12).map(r => `${r.name}:${r.mode} ${r.fromHex}→${r.prim} ${r.toHex} ΔE${r.dE}`) }, null, 1));
