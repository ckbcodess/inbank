// Binding pass for a screen captured into the Figma TOKENS file (run through the Figma MCP `use_figma` tool).
// Prepend: const PAGE_ID = '…', ROOT_ID = '…', DRY_RUN = true|false;  Always dry-run first.
// See docs/figma-token-mapping.md for the token set it binds to.
// For every visible solid fill/stroke under ROOT_ID (bound or not), picks the right Theme variable from its Light
// value and the layer's role, binds it (correcting wrong bindings the importer made), keeps Tailwind opacity
// modifiers as paint opacity, swaps flat shell gradients for the shell styles, and annotates any guess.
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const root = await figma.getNodeByIdAsync(ROOT_ID);
if (!root) throw new Error('root not found');
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const theme = cols.find(c => c.name === 'Theme');
const L = theme.modes.find(m => m.name === 'Light').modeId;
const all = await figma.variables.getLocalVariablesAsync('COLOR');
const byId = Object.fromEntries(all.map(v => [v.id, v]));
const colOf = Object.fromEntries(cols.map(c => [c.id, c]));
function resolve(v, depth = 0) {
  const c = colOf[v.variableCollectionId];
  const val = v.valuesByMode[c.id === theme.id ? L : c.modes[0].modeId];
  if (val && val.type === 'VARIABLE_ALIAS') return depth > 8 ? null : resolve(byId[val.id], depth + 1);
  return val && 'r' in val ? { r: val.r, g: val.g, b: val.b, a: val.a ?? 1 } : null;
}
const active = all.filter(v => v.variableCollectionId === theme.id && !v.name.startsWith('_deprecated/') && !v.name.startsWith('component/shell/') && !v.name.startsWith('illustration/'));
const entries = active.map(v => ({ v, c: resolve(v) })).filter(e => e.c && e.c.a >= 0.02); // near-invisible tokens never match
const i255 = x => Math.round(x * 255);
const rgbNear = (a, b) => Math.abs(i255(a.r) - i255(b.r)) <= 1 && Math.abs(i255(a.g) - i255(b.g)) <= 1 && Math.abs(i255(a.b) - i255(b.b)) <= 1;
const PREF = {
  text: ['text/primary', 'text/secondary', 'text/on-amber', 'text/on-accent', 'status/error-text', 'status/success-text', 'status/warning-text', 'status/info-text', 'component/hero/foreground', 'component/chip/foreground'],
  icon: ['icon/icon', 'text/primary', 'text/secondary', 'text/on-amber', 'component/icon/tile-accent', 'action/primary', 'component/hero/foreground', 'status/on-error'],
  stroke: ['border/default', 'input/border', 'border/active', 'border/focus', 'component/hero/border', 'status/warning', 'status/error'],
  fill: ['surface/background', 'surface/card', 'surface/muted', 'surface/tile', 'surface/modal', 'input/surface', 'action/primary', 'surface/surface', 'surface/hover', 'status/warning', 'status/error'],
};
const SCOPE = { text: 'TEXT_FILL', stroke: 'STROKE_COLOR', fill: 'FRAME_FILL', shape: 'SHAPE_FILL' };
const ICON = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE', 'ELLIPSE']);
const hex = c => '#' + [c.r, c.g, c.b].map(x => i255(x).toString(16).padStart(2, '0')).join('') + (c.a < 1 ? '@' + Math.round(c.a * 100) + '%' : '');

// Returns { e, sure, alts, keepOpacity } or null. Exact alpha matches win; a solid token under a paint opacity
// (Tailwind /N modifier) is the fallback and keeps that opacity on the paint.
function choose(color, kind, isRoot) {
  let cands = entries.filter(e => rgbNear(e.c, color) && Math.abs(e.c.a - color.a) <= 0.01);
  let keepOpacity = false;
  if (!cands.length && color.a < 1) { cands = entries.filter(e => rgbNear(e.c, color) && e.c.a === 1); keepOpacity = cands.length > 0; }
  if (!cands.length) return null;
  if (isRoot && kind === 'fill') { const bg = cands.find(e => e.v.name === 'surface/background'); if (bg) return { e: bg, sure: true, alts: [], keepOpacity }; }
  const scopeKey = kind === 'icon' ? null : SCOPE[kind];
  const scoped = scopeKey ? cands.filter(e => e.v.scopes.includes(scopeKey) || (kind === 'fill' && e.v.scopes.includes('SHAPE_FILL'))) : cands;
  const pool = scoped.length ? scoped : cands;
  const prefKey = kind === 'shape' ? 'fill' : kind;
  for (const n of PREF[prefKey] || []) { const hit = pool.find(e => e.v.name === n); if (hit) return { e: hit, sure: true, alts: [], keepOpacity }; }
  if (pool.length === 1) return { e: pool[0], sure: scoped.length > 0, alts: [], keepOpacity };
  return { e: pool[0], sure: false, alts: pool.slice(1, 4).map(x => x.v.name), keepOpacity };
}

const styles = await figma.getLocalPaintStylesAsync();
const shellStyle = { 'fafafa': styles.find(s => s.name === 'shell/backdrop'), 'ffffff': styles.find(s => s.name === 'shell/card') };
const stats = { added: {}, corrected: {}, kept: 0, withOpacity: 0, gradientsStyled: [] };
const guesses = [], unmatched = {}, errors = [];
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
async function loadFonts(n) { for (const s of n.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
function mapPaints(paints, kind, isRoot) {
  let changed = false; const notes = [];
  const out = paints.map(p => {
    if (p.type !== 'SOLID' || p.visible === false || (p.opacity ?? 1) === 0) return p;
    const color = { r: p.color.r, g: p.color.g, b: p.color.b, a: p.opacity ?? 1 };
    const curId = p.boundVariables?.color?.id; const cur = curId ? byId[curId] : null;
    // a bound paint's opacity is a modifier on top of the variable; compare on the variable's own alpha
    if (cur) { const rc = resolve(cur); if (rc) color.a = rc.a < 1 ? rc.a : (p.opacity ?? 1); }
    const pick = choose(color, kind, isRoot);
    if (!pick) { inc(unmatched, kind + ' ' + hex(color) + (cur ? ' (bound ' + cur.name + ')' : '')); return p; }
    const name = pick.e.v.name;
    if (cur && cur.id === pick.e.v.id) { stats.kept++; return p; }
    if (cur) inc(stats.corrected, cur.name + ' → ' + name); else inc(stats.added, name);
    if (pick.keepOpacity) stats.withOpacity++;
    if (!pick.sure) notes.push(`check token: ${kind} ${hex(color)} → ${name}` + (pick.alts.length ? ` (also ${pick.alts.join(', ')})` : ' (outside its scope)'));
    changed = true;
    const base = pick.keepOpacity ? p : (pick.e.c.a < 1 ? { ...p, opacity: 1 } : p);
    return DRY_RUN ? p : figma.variables.setBoundVariableForPaint(base, 'color', pick.e.v);
  });
  return { out, changed, notes };
}
// Card faces keep their own fixed colours (CardFace uses the card theme, not light/dark tokens): skip them.
const isCardFace = n => n.type === 'FRAME' && n.width >= 150 && Math.abs(n.width / n.height - 1.586) < 0.05;
const insideCard = n => { for (let p = n; p && p !== root.parent; p = p.parent) if (isCardFace(p)) return true; return false; };
const nodes = [root, ...('findAll' in root ? root.findAll() : [])].filter(n => !insideCard(n));
for (const n of nodes) {
  try {
    const isRoot = n === root; const notes = [];
    // flat shell gradients → shell styles
    if (Array.isArray(n.fills) && n.fills.length === 1 && n.fills[0].type === 'GRADIENT_LINEAR') {
      const st = n.fills[0].gradientStops; const h = hex({ ...st[0].color, a: 1 }).slice(1);
      const same = st.every(s => hex({ ...s.color, a: 1 }).slice(1) === h && s.color.a === 1);
      if (same && shellStyle[h]) { stats.gradientsStyled.push(n.name + ' → ' + shellStyle[h].name); if (!DRY_RUN) await n.setFillStyleIdAsync(shellStyle[h].id); }
    }
    if ('fills' in n) {
      const kind = n.type === 'TEXT' ? 'text' : ICON.has(n.type) ? 'icon' : (n.type === 'RECTANGLE' ? 'shape' : 'fill');
      if (n.type === 'TEXT' && n.fills === figma.mixed) {
        const plans = n.getStyledTextSegments(['fills']).map(s => ({ s, m: mapPaints(s.fills, 'text', false) })).filter(x => x.m.changed);
        if (plans.length && !DRY_RUN) { await loadFonts(n); for (const { s, m } of plans) n.setRangeFills(s.start, s.end, m.out); }
        plans.forEach(x => notes.push(...x.m.notes));
      } else if (Array.isArray(n.fills)) {
        const m = mapPaints(n.fills, kind, isRoot);
        if (m.changed && !DRY_RUN) { if (n.type === 'TEXT') await loadFonts(n); n.fills = m.out; }
        notes.push(...m.notes);
      }
    }
    if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length) {
      const m = mapPaints(n.strokes, ICON.has(n.type) ? 'icon' : 'stroke', false);
      if (m.changed && !DRY_RUN) { if (n.type === 'TEXT') await loadFonts(n); n.strokes = m.out; }
      notes.push(...m.notes);
    }
    if (notes.length) {
      guesses.push({ id: n.id, name: n.name, notes });
      if (!DRY_RUN && 'annotations' in n) { try { n.annotations = [...(n.annotations || []), ...notes.map(label => ({ label }))]; } catch { /* some node types take no annotations */ } }
    }
  } catch (e) { errors.push({ id: n.id, name: n.name, error: String(e.message || e) }); }
}
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
return {
  dryRun: DRY_RUN, layers: nodes.length, kept: stats.kept,
  added: top(stats.added), corrected: top(stats.corrected), keptOpacityModifier: stats.withOpacity,
  gradientsStyled: stats.gradientsStyled,
  guessCount: guesses.length, guesses: guesses.slice(0, 12),
  unmatched: top(unmatched).slice(0, 20), errors: errors.slice(0, 10),
};
