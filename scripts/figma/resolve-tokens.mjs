// Resolve globals.css colour tokens (light :root, dark .dark) to 0–1 RGBA for Figma.
// Usage: node scripts/figma/resolve-tokens.mjs src/app/globals.css <token> [<token>…]  → JSON { token: { light, dark } }
import { readFileSync } from 'node:fs';
const css = readFileSync(process.argv[2], 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// Collect the custom properties of every top-level `:root {}` or `.dark {}` block, later blocks winning.
function blocks(selector) {
  const m = {};
  const re = new RegExp('(^|\\n)' + selector.replace('.', '\\.') + '\\s*\\{', 'g');
  for (const hit of css.matchAll(re)) {
    let i = hit.index + hit[0].length, depth = 1, start = i;
    while (depth && i < css.length) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    for (const r of css.slice(start, i - 1).matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) m[r[1]] = r[2].trim();
  }
  return m;
}
const light = blocks(':root');
const dark = { ...light, ...blocks('.dark') };

const lin2srgb = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
function oklch(L, C, H) {
  const h = (H * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const c = v => Math.min(1, Math.max(0, lin2srgb(v)));
  return { r: c(r), g: c(g), b: c(bb) };
}
function parse(v, map, depth = 0) {
  v = v.trim();
  if (depth > 10) throw new Error('loop ' + v);
  let m;
  if ((m = v.match(/^var\(--([a-z0-9-]+)\)$/i))) return parse(map[m[1]], map, depth + 1);
  if ((m = v.match(/^#([0-9a-f]{3,8})$/i))) {
    let h = m[1];
    if (h.length === 3) h = [...h].map(c => c + c).join('');
    const n = i => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
  }
  if ((m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)%?)?\s*\)$/i))) {
    const c = oklch(+m[1], +m[2], +m[3]);
    const a = m[4] === undefined ? 1 : (v.includes('%') ? +m[4] / 100 : +m[4]);
    return { ...c, a };
  }
  if ((m = v.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[,/]\s*([\d.]+))?\s*\)$/i)))
    return { r: m[1] / 255, g: m[2] / 255, b: m[3] / 255, a: m[4] === undefined ? 1 : +m[4] };
  // color-mix(in <space>, X p%, transparent) == X at alpha p
  if ((m = v.match(/^color-mix\(in [a-z]+,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i))) {
    const c = parse(m[1], map, depth + 1);
    return { ...c, a: c.a * (+m[2] / 100) };
  }
  throw new Error('unparsed: ' + v);
}
const names = process.argv.slice(3);
const round = o => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, Math.round(x * 10000) / 10000]));
const out = {};
for (const n of names) out[n] = { light: round(parse(light[n], light)), dark: round(parse(dark[n], dark)) };
console.log(JSON.stringify(out));
