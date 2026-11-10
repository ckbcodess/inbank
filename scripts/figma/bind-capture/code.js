// NIBS · Bind capture
// Binds what the Figma capture extension leaves raw in pasted screens to the design system:
// spacing and radius variables, colour variables (solid and gradient), the shell paint styles and the text styles.
//
// Run it yourself (Figma desktop app):
//   1. Plugins → Development → Import plugin from manifest… → pick scripts/figma/bind-capture/manifest.json (once).
//   2. Either select the section or frames you pasted and run NIBS · Bind capture → Bind selection,
//      or run NIBS · Bind capture → Watch pastes and leave its panel open. Paste screens onto the page; the panel
//      then asks for a section name (or offers to add them to the last section). Confirming creates the section,
//      lines the screens up left to right in paste order and binds them. Screens pasted straight into an existing
//      section stay there and are bound. Each paste is reversed as it lands (Figma hands multi-frame pastes over
//      backwards), on the canvas and in the layers panel, which reads leftmost first.
//   3. Read the report. Anything listed under "Still raw" had no matching token: off-scale code, art, or a missing token.
// Safe to run again: bound values are skipped. Needs the 1. TOKENS library enabled in the file.
//
// Agents run the same file through the Figma MCP (use_figma): prefix it with `const __MCP__ = true;` and end with
// `return await bindCapture([await figma.getNodeByIdAsync('<id>')]);`. Fonts installed only on your computer
// (Open Sans Medium) aren't available there, so the plugin, run locally, is the one that applies the Medium styles.

async function bindCapture(roots, forceMode) {
  const lib = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  const V = {};
  await Promise.all(lib.filter(c => ['Theme', 'Spacing', 'Dimensions: Radius'].includes(c.name)).map(async c => {
    const vs = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key);
    await Promise.all(vs.map(async lv => { V[lv.name] = await figma.variables.importVariableByKeyAsync(lv.key); }));
  }));
  const local = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'Project Tokens');
  if (local) for (const id of local.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); V['project:' + v.name] = v; }

  const done = { spacing: 0, radius: 0, color: 0, shellStyle: 0, gradient: 0, textStyle: 0 };
  const left = {}; const miss = k => { left[k] = (left[k] || 0) + 1; };
  const picks = {}; const loaded = new Set(); const mutated = new Set();
  const loadFont = async f => { const k = f.family + '|' + f.style; if (!loaded.has(k)) { await figma.loadFontAsync(f); loaded.add(k); } };
  const walk = () => roots.flatMap(r => (r.type === 'SECTION' ? [...r.children] : [r]));

  // Desktop-mode values. The library repeats 4 (spacing/1, /2) and 8 (spacing/3, /4); these match what the capture uses.
  const SP = { 2: 'spacing/0-5', 4: 'spacing/2', 8: 'spacing/4', 12: 'spacing/5', 16: 'spacing/6', 20: 'spacing/6-5', 24: 'spacing/7', 32: 'spacing/8', 40: 'spacing/9', 48: 'spacing/10', 64: 'spacing/11' };
  const RAD = { 4: 'rounded-sm', 8: 'rounded-lg', 10: 'rounded-xl' };
  // When several tokens share a value, the first listed wins.
  const PREFER = ['project:surface/tile', 'surface/card', 'surface/muted', 'surface/background', 'surface/scrim', 'text/primary', 'text/secondary', 'border/default', 'action/primary', 'status/error'];
  const AVOID = /^project:(shell|hero|illustration|icon-accent)\//;

  const h2 = c => [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  // A variable's value in a mode (Light or Dark), following aliases. Collections without that mode use their default.
  async function valueIn(v, mode, d = 0) {
    if (!v) return null;
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    const m = (col.modes.find(x => x.name === mode) || col.modes[0]).modeId;
    let val = v.valuesByMode[m]; if (val === undefined) val = Object.values(v.valuesByMode)[0];
    if (val && val.type === 'VARIABLE_ALIAS' && d < 6) return valueIn(await figma.variables.getVariableByIdAsync(val.id), mode, d + 1);
    // A colour alias with its own opacity, e.g. surface/scrim = black at 30%: { color: alias, opacity: 0–100 }.
    if (val && val.color && val.color.type === 'VARIABLE_ALIAS' && d < 6) {
      const c = await valueIn(await figma.variables.getVariableByIdAsync(val.color.id), mode, d + 1);
      return c && c.r !== undefined ? { ...c, a: (c.a ?? 1) * (val.opacity ?? 100) / 100 } : null;
    }
    return val;
  }
  const ctxOf = n => { n = n.replace('project:', ''); if (/^(text|icon)\//.test(n) || /-text$/.test(n) || /foreground/.test(n) || /^component\/badge-text/.test(n)) return 'text'; if (/^border\//.test(n) || /^input\/border/.test(n)) return 'stroke'; return 'fill'; };
  // Colour index per mode. A screen captured with the app in dark theme carries dark values, so it's matched against
  // the Dark values of the same tokens. COL[mode][name] keeps every colour token's value, deprecated ones included.
  const IDXM = {}, COL = {};
  for (const mode of ['Light', 'Dark']) {
    const idx = { text: {}, stroke: {}, fill: {} }, col = {};
    for (const [name, v] of Object.entries(V)) {
      if (v.resolvedType !== 'COLOR') continue;
      const c = await valueIn(v, mode); if (!c || typeof c !== 'object' || c.r === undefined) continue;
      const a = c.a === undefined ? 1 : +c.a.toFixed(2);
      col[name] = { hex: h2(c), a };
      if (AVOID.test(name) || name.startsWith('_deprecated/')) continue;
      (idx[ctxOf(name)][h2(c)] = idx[ctxOf(name)][h2(c)] || []).push({ name, v, a });
    }
    IDXM[mode] = idx; COL[mode] = col;
  }
  const nameById = {}; for (const [name, v] of Object.entries(V)) nameById[v.id] = name;

  // Which theme each screen was captured in: the mode whose token values cover more of its raw colours.
  const screenMode = {};
  for (const s of walk()) {
    const hexes = [];
    for (const n of [s, ...('findAll' in s ? s.findAll(() => true) : [])]) for (const prop of ['fills', 'strokes']) {
      if (!(prop in n) || !Array.isArray(n[prop])) continue;
      for (const f of n[prop]) {
        if (f.visible === false) continue;
        if (f.type === 'SOLID' && !(f.boundVariables && f.boundVariables.color)) hexes.push(h2(f.color));
        if (f.type.startsWith('GRADIENT')) for (const g of f.gradientStops) hexes.push(h2(g.color));
      }
    }
    const score = m => hexes.filter(x => ['text', 'stroke', 'fill'].some(c => IDXM[m][c][x])).length;
    screenMode[s.id] = score('Dark') > score('Light') ? 'Dark' : 'Light';
  }
  const modes = [...new Set(Object.values(screenMode))];
  if (!forceMode && modes.length > 1) {
    // Mixed: bind each theme's screens on their own and add the reports together.
    const parts = [];
    for (const m of modes) parts.push(await bindCapture(walk().filter(s => screenMode[s.id] === m), m));
    const sum = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = typeof v === 'number' ? (o[k] || 0) + v : v; return o; };
    const raw = {}; for (const p of parts) for (const [k, n] of p.stillRaw) raw[k] = (raw[k] || 0) + n;
    return { bound: parts.reduce((a, p) => sum(a, p.bound), {}), picks: Object.assign({}, ...parts.map(p => p.picks)), stillRaw: Object.entries(raw).sort((a, b) => b[1] - a[1]), mutatedCount: parts.reduce((a, p) => a + p.mutatedCount, 0), captured: modes.join(' + ') };
  }
  const MODE = forceMode || modes[0] || 'Light';
  const IDX = IDXM[MODE];
  const rank = x => { const i = PREFER.indexOf(x.name); return i < 0 ? 99 + (x.name.startsWith('project:') ? 1 : 0) : i; };
  function find(ctxs, hex, paintA) {
    for (const ctx of ctxs) {
      const list = IDX[ctx][hex]; if (!list) continue;
      const alpha = list.filter(x => x.a < 1 && Math.abs(x.a - paintA) < 0.011).sort((p, q) => rank(p) - rank(q));
      if (alpha.length) return { hit: alpha[0], opacity: 1 };
      // A see-through paint whose colour belongs to a see-through token (black at 60% vs surface/scrim, black at 30%)
      // takes that token, not a solid action colour that happens to share the hex. The token's own opacity wins and
      // the difference is reported.
      if (paintA < 1) {
        const tint = list.filter(x => x.a < 1).sort((p, q) => Math.abs(p.a - paintA) - Math.abs(q.a - paintA) || rank(p) - rank(q));
        if (tint.length) { miss(`opacity ${tint[0].name} is ${Math.round(tint[0].a * 100)}%, capture had ${Math.round(paintA * 100)}%`); return { hit: tint[0], opacity: 1 }; }
      }
      // Otherwise a solid token at the paint's opacity (border at 60%). Action colours only match solid paints.
      const solid = list.filter(x => x.a === 1 && (paintA === 1 || !x.name.startsWith('action/'))).sort((p, q) => rank(p) - rank(q));
      if (solid.length) return { hit: solid[0], opacity: paintA };
    }
    return null;
  }

  // 0. The capture sets variable modes on some inner frames (Theme Dark, Typography Mobile), which turns parts of a
  // light screen dark. Clear every mode it set, so the whole screen follows the file's defaults (Light, Desktop).
  done.modesCleared = 0;
  const mstack = walk(); // the screens themselves, not a section you've set a mode on
  while (mstack.length) {
    const n = mstack.pop();
    const ev = n.explicitVariableModes || {};
    for (const cid of Object.keys(ev)) {
      const col = await figma.variables.getVariableCollectionByIdAsync(cid);
      if (col) { n.clearExplicitVariableModeForCollection(col); done.modesCleared++; mutated.add(n.id); }
    }
    if ('children' in n) mstack.push(...n.children);
  }

  // 1. Spacing, radius and solid colours. A see-through fill bound to an action colour (an earlier run matched a
  // backdrop to action/neutral) is matched again.
  const actionIds = new Set(Object.entries(V).filter(([k]) => k.startsWith('action/')).map(([, v]) => v.id));
  const rootIds = new Set(walk().map(s => s.id));
  const rematch = f => f.boundVariables && f.boundVariables.color && actionIds.has(f.boundVariables.color.id) && (f.opacity ?? 1) < 1;
  const stack = walk();
  while (stack.length) {
    const n = stack.pop(); const bv = n.boundVariables || {};
    if ('layoutMode' in n && n.layoutMode !== 'NONE') for (const p of ['itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
      if (p === 'counterAxisSpacing' && n.layoutWrap !== 'WRAP') continue;
      const val = n[p]; if (!val || bv[p]) continue;
      const name = SP[Math.round(val * 100) / 100];
      if (name && V[name]) { n.setBoundVariable(p, V[name]); done.spacing++; mutated.add(n.id); } else miss('space ' + +val.toFixed(2));
    }
    if ('cornerRadius' in n && typeof n.cornerRadius === 'number' && n.cornerRadius > 0 && !bv.topLeftRadius) {
      const r = n.cornerRadius, name = r > 999 ? 'rounded-full' : RAD[r];
      if (name && V[name]) { for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(k, V[name]); done.radius++; mutated.add(n.id); } else miss('radius ' + r);
    }
    for (const prop of ['fills', 'strokes']) {
      if (!(prop in n) || !Array.isArray(n[prop])) continue;
      let changed = false;
      const paints = n[prop].map(f => {
        if (f.type !== 'SOLID' || f.visible === false) return f;
        const isIcon = n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION';
        const ctxs = n.type === 'TEXT' ? ['text'] : prop === 'strokes' ? ['stroke', 'fill'] : isIcon ? ['text', 'fill'] : ['fill'];
        let a = f.opacity === undefined ? 1 : +f.opacity.toFixed(2); if (a === 0) return f;
        let hex = h2(f.color);
        const pre = f.boundVariables && f.boundVariables.color;
        if (pre) {
          // The capture binds some colours itself, by the CSS variable's code syntax, and picks either twin of a pair
          // (--foreground is both text/primary and icon/primary). Keep its choice unless it's deprecated, in the wrong
          // role for this layer (an icon token on a background), or on the screen's own background (body:
          // bg-background). Those are matched again from the token's value in the screen's theme.
          const name = nameById[pre.id];
          if (!name) return f; // a variable from somewhere else: leave it
          const isRootBg = rootIds.has(n.id) && prop === 'fills';
          const wrong = name.startsWith('_deprecated/') || !ctxs.includes(ctxOf(name)) || (isRootBg && name !== 'surface/background');
          if (!wrong && !rematch(f)) return f;
          if (isRootBg && V['surface/background']) {
            picks['screen background'] = 'surface/background'; changed = true; done.color++;
            return { ...figma.variables.setBoundVariableForPaint(f, 'color', V['surface/background']), opacity: 1 };
          }
          if (!rematch(f)) { const c = COL[MODE][name]; if (!c) return f; hex = c.hex; a = +(c.a * a).toFixed(2); }
        }
        if (isIcon && hex === 'd3d3d3') return f; // illustration dot pattern
        const r = find(ctxs, hex, a);
        const k = ctxs[0] + ' #' + hex + (a < 1 ? '@' + a : '');
        if (!r) { miss(k); return f; }
        picks[k] = r.hit.name + (r.opacity < 1 ? ' @' + r.opacity : '');
        changed = true; done.color++;
        return { ...figma.variables.setBoundVariableForPaint(f, 'color', r.hit.v), opacity: r.opacity };
      });
      if (changed) {
        if (n.type === 'TEXT') for (const s of n.getStyledTextSegments(['fontName'])) await loadFont(s.fontName);
        n[prop] = paints; mutated.add(n.id);
      }
    }
    if ('children' in n) stack.push(...n.children);
  }

  // 1b. Edges drawn as a box shadow. Fields (and anything else using field-surface) draw their border as a spread
  // shadow: 0 0 0 1px var(--field-border), 2px for the focus ring. The capture brings that in as a raw drop shadow
  // and a transparent stroke. Rebuild it as a real stroke outside the edge, bound to the matching border token, and
  // keep any soft shadow (the field drop) as it is.
  done.edge = 0;
  const estack = walk();
  while (estack.length) {
    const n = estack.pop();
    if ('effects' in n && Array.isArray(n.effects) && 'strokes' in n && !n.effectStyleId) {
      // Read the list once: every read of n.effects returns new objects, so the ring has to be removed by position.
      const effs = n.effects;
      const ringAt = effs.findIndex(e => e.type === 'DROP_SHADOW' && e.visible !== false && e.radius === 0 && e.spread > 0 && e.offset.x === 0 && e.offset.y === 0);
      const ring = ringAt >= 0 ? effs[ringAt] : null;
      if (ring) {
        const a = +((ring.color.a ?? 1)).toFixed(2);
        // Field edges take the input tokens (input/border, input/border-focus) over border/default, which shares the hex.
        const inputTok = (IDX.stroke[h2(ring.color)] || []).find(x => x.name.startsWith('input/') && (x.a === 1 || Math.abs(x.a - a) < 0.011));
        const r = a > 0 && inputTok ? { hit: inputTok, opacity: inputTok.a === 1 ? a : 1 } : null;
        if (r) {
          const paint = { ...figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: ring.color.r, g: ring.color.g, b: ring.color.b } }, 'color', r.hit.v), opacity: r.opacity };
          n.effects = effs.filter((_, i) => i !== ringAt);
          n.strokes = [paint];
          for (const k of ['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']) if (n.boundVariables && n.boundVariables[k]) n.setBoundVariable(k, null);
          n.strokeWeight = ring.spread;
          n.strokeAlign = 'OUTSIDE';
          done.edge++; mutated.add(n.id);
        }
      }
    }
    if ('children' in n) estack.push(...n.children);
  }

  // 1c. Shadow stacks → effect styles from 1. TOKENS, matched on their light-mode layers [y, blur, spread, alpha] of
  // black (zero-alpha layers ignored). Shadow/* are the code's named shadows and switch with the Theme mode;
  // Box Shadow/* are Tailwind's stock shadow-2xs … shadow-2xl, which the code also uses.
  const SHADOW_STYLES = [
    ['Shadow/field', 'c914a26c9b022759f8d55d5ac6ce9b712e74a620', [[2, 2, -1, 0.04]]],
    ['Shadow/control', '2e4a339d9b7c055046895047fbb463bfbefaacc7', [[1, 1, 0, 0.04]]],
    ['Shadow/button', '8677020c7ce9ea9394f11b3386d463139e2b9ef5', [[0, 0, 1, 0.05], [4, 6, 0, 0.05]]],
    ['Shadow/card', '0179ce2e9a3407b0ee1b8b876ffb5808d988024e', [[1, 2, 0, 0.02], [2, 8, -2, 0.04]]],
    ['Shadow/menu', '6c770baaa926423e798124731bac828f8ce5dada', [[0, 0, 1, 0.02], [1, 2, 0, 0.09], [4, 16, -4, 0.29]]],
    ['Shadow/modal', '1bc415534b866a5256cdc6ee89b249d303f42ccf', [[0, 0, 1, 0.04], [1, 2, 0, 0.06], [6, 16, -4, 0.08]]],
    ['Box Shadow/shadow-2xs', 'd8e6a11b124bdaa9e3edf462999db54ed3239019', [[1, 0, 0, 0.05]]],
    ['Box Shadow/shadow-xs', 'a8bf734682c66281d14e8751d6907425d604221b', [[1, 2, 0, 0.05]]],
    ['Box Shadow/shadow-sm', '12513827675ede2e7ac4696f60929350df6d9db4', [[1, 3, 0, 0.1], [1, 2, -1, 0.1]]],
    ['Box Shadow/shadow-md', '431435320bd5ddd9020315f864cca10962765922', [[4, 6, -1, 0.1], [2, 4, -2, 0.1]]],
    ['Box Shadow/shadow-lg', '6ab28967d4f5bdc5bb0c8eeffa5653b9b486a616', [[10, 15, -3, 0.1], [4, 6, -4, 0.1]]],
    ['Box Shadow/shadow-xl', '4155df18885a5e44373d2fc8e3954e7f33190d85', [[20, 25, -5, 0.1], [8, 10, -6, 0.1]]],
    ['Box Shadow/shadow-2xl', '29f82bfe2ebdc515573a86328c752ac67df21bb7', [[25, 50, -12, 0.25]]],
  ];
  // The Shadow/* styles change in dark (lighter shadows plus a white ring). For a dark screen, read their layers from
  // the shadow/<style>/<layer>/{color,y,blur,spread} variables in the Dark mode. Layers carry their colour as well.
  for (const l of SHADOW_STYLES) l[2] = l[2].map(x => (x.length === 4 ? [...x, '000000'] : x));
  if (MODE !== 'Light') {
    const groups = {};
    for (const [name, v] of Object.entries(V)) {
      const m = /^shadow\/([^/]+)\/([^/]+)\/(color|y|blur|spread)$/.exec(name); if (!m) continue;
      ((groups[m[1]] = groups[m[1]] || {})[m[2]] = groups[m[1]][m[2]] || {})[m[3]] = await valueIn(v, MODE);
    }
    for (const [style, layers] of Object.entries(groups)) {
      const entry = SHADOW_STYLES.find(s => s[0] === 'Shadow/' + style); if (!entry) continue;
      const ls = Object.values(layers).filter(l => l.color && (l.color.a ?? 1) > 0.005)
        .map(l => [l.y || 0, l.blur || 0, l.spread || 0, +(l.color.a ?? 1).toFixed(3), h2(l.color)]);
      if (ls.length) entry[2] = ls;
    }
  }
  const bySize = (p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2];
  const shadowStyle = {};
  done.shadow = 0;
  const sstack = walk();
  while (sstack.length) {
    const n = sstack.pop();
    if ('effects' in n && Array.isArray(n.effects) && n.effects.length && !n.effectStyleId) {
      const vis = n.effects.filter(e => e.visible !== false);
      const drops = vis.filter(e => e.type === 'DROP_SHADOW' && (e.color.a ?? 1) > 0.005);
      const onlyDrops = vis.every(e => e.type === 'DROP_SHADOW') && drops.length && drops.every(e => e.offset.x === 0);
      if (onlyDrops) {
        const sig = drops.map(e => [e.offset.y, e.radius, e.spread, +(e.color.a ?? 1).toFixed(3), h2(e.color)]).sort(bySize);
        const hit = SHADOW_STYLES.find(([, , layers]) => layers.length === sig.length && [...layers].sort(bySize).every((l, i) => Math.abs(l[0] - sig[i][0]) < 0.6 && Math.abs(l[1] - sig[i][1]) < 0.6 && Math.abs(l[2] - sig[i][2]) < 0.6 && Math.abs(l[3] - sig[i][3]) < 0.012 && l[4] === sig[i][4]));
        if (hit) {
          if (!(hit[0] in shadowStyle)) { try { shadowStyle[hit[0]] = await figma.importStyleByKeyAsync(hit[1]); } catch { shadowStyle[hit[0]] = null; miss(`style ${hit[0]} not in the library yet: publish 1. TOKENS`); } }
          const st = shadowStyle[hit[0]];
          if (st) { await n.setEffectStyleIdAsync(st.id); done.shadow++; mutated.add(n.id); }
        } else miss('shadow ' + sig.map(l => `${l[0]}/${l[1]}/${l[2]}@${l[3]}`).join(' + '));
      }
    }
    if ('children' in n) sstack.push(...n.children);
  }

  // 2. Gradients. The shell takes the file's paint styles (sidebar and body: shell/backdrop; main container: shell/card).
  // Other surfaces the capture writes as gradients get their stops bound to the matching token.
  const paintStyles = await figma.getLocalPaintStylesAsync();
  // globals.css --shell-surface-top/bottom (backdrop) and --shell-top/bottom (card), light then dark.
  const backdrop = paintStyles.find(s => s.name === 'shell/backdrop'), shellCard = paintStyles.find(s => s.name === 'shell/card');
  const SHELL = { 'faf9f8>f8f7f6': backdrop, 'ffffff>fdfcfc': shellCard, '141414>050505': backdrop, '161616>080808': shellCard };
  // Gradient stops by their colours in the screen's theme.
  const STOPS = {};
  for (const names of [
    ['project:surface/edge-glass-start', 'project:surface/edge-glass-mid', 'project:surface/edge-glass-end'],
    ['surface/card', 'surface/card'],
    ['project:surface/tile', 'project:surface/tile'],
  ]) if (names.every(x => COL[MODE][x])) STOPS[names.map(x => COL[MODE][x].hex).join('>')] = names;
  // Tiles fake a gradient border in CSS: a flat fill clipped to the padding box over the edge-glass gradient clipped to
  // the border box, with a transparent 0.5px border. The capture brings both in as full-size gradient fills, which
  // hides the edge. Rebuild it the way Figma draws it: one solid fill (the tile token) and a 0.5px inside gradient
  // stroke (the edge-glass tokens).
  done.tile = 0;
  const isFlat = f => f.type === 'GRADIENT_LINEAR' && f.gradientStops.every(g => h2(g.color) === h2(f.gradientStops[0].color) && Math.abs((g.color.a ?? 1) - (f.gradientStops[0].color.a ?? 1)) < 0.01);
  async function convertTile(n) {
    if (!('fills' in n) || !Array.isArray(n.fills) || n.fillStyleId || !('strokes' in n)) return false;
    // Two linear gradients: the edge glass underneath, the tile colour on top (one colour in every stop). In light mode
    // the edge glass is one colour too (#f5f5f5), so the order tells them apart, not the stops.
    const vis = n.fills.filter(f => f.visible !== false);
    if (vis.length !== 2 || vis.some(f => f.type !== 'GRADIENT_LINEAR')) return false;
    const [edge, flat] = vis;
    if (!isFlat(flat)) return false;
    const stop = flat.gradientStops[0];
    const hex = h2(stop.color);
    const a = +((stop.color.a ?? 1) * (flat.opacity ?? 1)).toFixed(2);
    let solid = { type: 'SOLID', color: { r: stop.color.r, g: stop.color.g, b: stop.color.b }, opacity: a };
    const hit = find(['fill'], hex, a);
    const pre = stop.boundVariables && stop.boundVariables.color && await figma.variables.getVariableByIdAsync(stop.boundVariables.color.id);
    if (pre) solid = figma.variables.setBoundVariableForPaint(solid, 'color', pre); // keep a binding made earlier
    else if (hit) solid = { ...figma.variables.setBoundVariableForPaint(solid, 'color', hit.hit.v), opacity: hit.opacity };
    else miss('tile fill #' + hex);
    let stroke = edge;
    const names = STOPS[edge.gradientStops.map(g => h2(g.color)).join('>')];
    if (names && names.every(x => V[x])) stroke = { ...edge, gradientStops: edge.gradientStops.map((g, i) => ({ ...g, boundVariables: { color: figma.variables.createVariableAlias(V[names[i]]) } })) };
    else if (!edge.gradientStops.every(g => g.boundVariables && g.boundVariables.color)) miss('tile edge ' + edge.gradientStops.map(g => h2(g.color)).join('>'));
    n.fills = [solid];
    n.strokes = [stroke];
    for (const k of ['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight']) if (n.boundVariables && n.boundVariables[k]) n.setBoundVariable(k, null);
    n.strokeWeight = 0.5; // globals.css --edge-glass-width
    n.strokeAlign = 'INSIDE';
    return true;
  }

  const gstack = walk();
  while (gstack.length) {
    const n = gstack.pop();
    if (await convertTile(n)) { done.tile++; mutated.add(n.id); if ('children' in n) gstack.push(...n.children); continue; }
    if ('fills' in n && Array.isArray(n.fills) && !n.fillStyleId) {
      const shell = n.fills.length === 1 && n.fills[0].type === 'GRADIENT_LINEAR' ? SHELL[n.fills[0].gradientStops.map(g => h2(g.color)).join('>')] : null;
      if (shell) { await n.setFillStyleIdAsync(shell.id); done.shellStyle++; mutated.add(n.id); }
      else {
        let changed = false;
        const fills = n.fills.map(f => {
          if (!f.type.startsWith('GRADIENT') || f.visible === false || f.gradientStops.every(g => g.boundVariables && g.boundVariables.color)) return f;
          const key = f.gradientStops.map(g => h2(g.color)).join('>');
          const names = STOPS[key];
          if (!names || names.some(x => !V[x])) { miss('gradient ' + key); return f; }
          changed = true; done.gradient++;
          return { ...f, gradientStops: f.gradientStops.map((g, i) => ({ ...g, boundVariables: { color: figma.variables.createVariableAlias(V[names[i]]) } })) };
        });
        if (changed) { n.fills = fills; mutated.add(n.id); }
      }
    }
    if ('children' in n) gstack.push(...n.children);
  }

  // 3. Text styles from 1. TOKENS, applied only when size, weight and line height all match, so nothing changes look.
  // Weight comes from each style's code description (font-medium = 500). Phone styles are left out: captures are desktop.
  const ROLES = {
    Body: ['8003b327313289a2a65b00b28de06a1b63332657', 400],
    Label: ['d4e5d2f75202b3cb9337ffb7f0304689fd9d6d97', 500],
    Meta: ['7dd46a3f5274c738a890246200c963ca0e2e417f', 400],
    'Section heading': ['2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', 500],
    'Page title': ['e137937937fa4af58536ad12c423f049963769ff', 500],
    'Hero figure': ['82ec531a727a40549d4f50d5ebf8d29c4e4ff06b', 400],
  };
  const pxLine = (lh, size) => (lh.unit === 'PIXELS' ? lh.value : lh.unit === 'PERCENT' ? size * lh.value / 100 : null);
  const roles = [];
  for (const [name, [key, weight]] of Object.entries(ROLES)) {
    let s;
    try { s = await figma.importStyleByKeyAsync(key); } catch { miss(`style ${name} not found in the library`); continue; }
    try { await loadFont(s.fontName); } catch { miss(`style ${name} skipped: ${s.fontName.family} ${s.fontName.style} isn't installed here`); continue; }
    roles.push({ name, s, size: s.fontSize, weight, lh: pxLine(s.lineHeight, s.fontSize) });
  }
  const texts = roots.flatMap(r => ('findAllWithCriteria' in r ? r.findAllWithCriteria({ types: ['TEXT'] }) : []).concat(r.type === 'TEXT' ? [r] : []));
  for (const t of texts) {
    if (t.textStyleId) continue;
    const segs = t.getStyledTextSegments(['fontName', 'fontSize', 'fontWeight', 'lineHeight']);
    const s = segs[0];
    const lh = pxLine(s.lineHeight, s.fontSize);
    const hit = segs.length === 1 && lh !== null && roles.find(r => r.size === s.fontSize && r.weight === s.fontWeight && Math.abs(r.lh - lh) < 0.6);
    if (!hit) { miss(`type ${s.fontSize}px w${s.fontWeight} lh ${lh === null ? 'auto' : +lh.toFixed(2)}${segs.length > 1 ? ' (mixed)' : ''}`); continue; }
    try { for (const g of segs) await loadFont(g.fontName); } catch { miss(`type ${s.fontName.style} not installed here`); continue; }
    await t.setTextStyleIdAsync(hit.s.id);
    done.textStyle++; mutated.add(t.id);
  }

  return { bound: done, picks, stillRaw: Object.entries(left).sort((a, b) => b[1] - a[1]), mutatedCount: mutated.size, captured: MODE };
}

// Watch mode: stays open. Paste screens onto the page, then name the section they belong to: confirming creates the
// section, lines the screens up inside it in paste order, and binds them.
function watchPastes() {
  const css = `body { font: 12px/1.5 Inter, system-ui, sans-serif; margin: 12px; color: #0a0a0a; }
    #ask { display: none; padding: 12px; margin-bottom: 12px; border-radius: 8px; background: #fef9c3; }
    #ask.on { display: block; } #ask b { display: block; margin-bottom: 8px; }
    form { display: flex; gap: 8px; }
    input { flex: 1; min-width: 0; height: 32px; border: 1px solid #ebebeb; border-radius: 8px; padding: 0 8px; font: inherit; background: #fff; }
    #status { font-weight: 600; margin-bottom: 8px; } #log { height: 230px; overflow: auto; border-top: 1px solid #ebebeb; }
    .row { padding: 6px 0; border-bottom: 1px solid #ebebeb; } .raw { color: #737373; }
    button { height: 32px; border: 0; border-radius: 8px; background: #f5f5f5; cursor: pointer; padding: 0 12px; font: inherit; }
    .primary { background: #ffc423; color: #451a03; font-weight: 600; }
    #addTo { display: none; width: 100%; margin-top: 8px; } #addTo.on { display: block; } .stop { width: 100%; margin-top: 8px; }`;
  figma.showUI(`<style>${css}</style>
    <div id="ask">
      <b id="askTitle"></b>
      <form onsubmit="event.preventDefault(); const f = document.getElementById('sectionName'); const v = f.value.trim(); if (v) { parent.postMessage({ pluginMessage: { create: v } }, '*'); f.value = ''; }">
        <input id="sectionName" placeholder="Section name, for example Send to wallet"><button class="primary">Create</button>
      </form>
      <button id="addTo" onclick="parent.postMessage({ pluginMessage: { addTo: true } }, '*')"></button>
    </div>
    <div id="status">Paste your screens onto the page.</div><div id="log"></div>
    <button class="stop" onclick="parent.postMessage({ pluginMessage: 'stop' }, '*')">Stop watching</button>
    <script>
      onmessage = e => { const m = e.data.pluginMessage; if (!m) return;
        if (m.status) document.getElementById('status').textContent = m.status;
        if (m.row) { const d = document.createElement('div'); d.className = 'row'; d.innerHTML = m.row; document.getElementById('log').prepend(d); }
        if ('ask' in m) {
          const box = document.getElementById('ask'), add = document.getElementById('addTo');
          box.className = m.ask ? 'on' : '';
          if (m.ask) {
            document.getElementById('askTitle').textContent = m.ask;
            add.className = m.last ? 'on' : ''; add.textContent = m.last ? 'Add to “' + m.last + '”' : '';
            const f = document.getElementById('sectionName'); f.focus();
          }
        } };
    </script>`, { width: 320, height: 500, title: 'Watching pastes' });

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const PAD = 80, GAP = 80;
  const seen = new Set(); let pending = new Set(); let timer = null; let busy = false;
  let waiting = []; // pasted onto the page, waiting for a section
  let last = null; // the section made most recently
  const isTopFrame = n => n && !n.removed && ['FRAME', 'COMPONENT', 'INSTANCE'].includes(n.type) && n.parent && (n.parent.type === 'PAGE' || n.parent.type === 'SECTION');
  const plural = n => `${n} screen${n === 1 ? '' : 's'}`;

  function ask() {
    waiting = waiting.filter(f => !f.removed && f.parent && f.parent.type === 'PAGE');
    if (!waiting.length) { figma.ui.postMessage({ ask: '', status: 'Paste your screens onto the page.' }); return; }
    figma.ui.show();
    figma.ui.postMessage({ ask: `Name the section for ${plural(waiting.length)}`, last: last && !last.removed ? last.name : '', status: 'Waiting for a section name…' });
    figma.notify(`Pasted ${plural(waiting.length)}. Name their section in the plugin panel.`);
  }

  // Screens in paste order, one row; the section grows to fit.
  function place(section, frames) {
    for (const f of frames) {
      const others = section.children.filter(n => n !== f);
      const x = others.length ? Math.max(...others.map(n => n.x + n.width)) + GAP : PAD;
      section.appendChild(f);
      f.x = x; f.y = PAD;
    }
    const kids = section.children;
    section.resizeWithoutConstraints(Math.max(...kids.map(n => n.x + n.width)) + PAD, Math.max(...kids.map(n => n.y + n.height)) + PAD);
    stackByCanvas(section.children.filter(isTopFrame));
  }
  // The section opens where you pasted: the first screen stays exactly where it landed and the rest line up after it.
  function newSection(name) {
    const live = waiting.filter(f => !f.removed);
    const s = figma.createSection();
    s.name = name;
    s.x = (live.length ? Math.min(...live.map(f => f.x)) : 0) - PAD;
    s.y = (live.length ? Math.min(...live.map(f => f.y)) : 0) - PAD;
    s.resizeWithoutConstraints(800, 600);
    return s;
  }

  async function bind(frames, label) {
    busy = true;
    figma.ui.postMessage({ status: `Binding ${plural(frames.length)}…` });
    try {
      const r = await bindCapture(frames);
      const top = r.stillRaw.slice(0, 4).map(([k, n]) => `${esc(k)} ×${n}`).join(', ');
      figma.ui.postMessage({ row: `<b>${esc(label)}</b> · ${plural(frames.length)}<br>Bound ${r.mutatedCount} layers${top ? `<div class="raw">Still raw: ${top}${r.stillRaw.length > 4 ? '…' : ''}</div>` : ''}` });
    } catch (e) {
      figma.ui.postMessage({ row: `Failed: ${esc(e.message)}` });
    }
    busy = false;
  }

  async function settle(section, follow) {
    const frames = waiting.filter(f => !f.removed); waiting = [];
    figma.ui.postMessage({ ask: '' });
    if (!frames.length) return;
    // `waiting` is already in the order the screens arrived, which becomes left to right.
    place(section, frames);
    last = section;
    // A new section opens where you are, so the view stays put. Adding to an earlier section moves the screens away,
    // so the view follows them there.
    if (follow) figma.viewport.scrollAndZoomIntoView(frames);
    await bind(frames, section.name);
    ask(); // anything pasted while binding
  }

  figma.ui.onmessage = async m => {
    if (m === 'stop') return figma.closePlugin();
    if (m && m.create) await settle(newSection(m.create), false);
    else if (m && m.addTo && last && !last.removed) await settle(last, true);
  };

  async function flush() {
    if (busy) { timer = setTimeout(flush, 500); return; }
    const ids = [...pending]; pending = new Set();
    const intoSection = [], onPage = [];
    for (const id of ids) {
      const n = await figma.getNodeByIdAsync(id);
      if (!isTopFrame(n) || seen.has(n.id)) continue;
      seen.add(n.id);
      if (n.parent.type === 'PAGE') onPage.push(n); // needs a section name
      else intoSection.push(n); // pasted straight into a section: keep it there
    }
    // Figma hands a multi-frame paste over in reverse, so each paste is flipped as it lands: on the page queue, and
    // on the canvas for frames pasted straight into a section. Separate pastes keep the order you made them in.
    waiting.push(...onPage.reverse());
    if (intoSection.length) {
      for (const p of new Set(intoSection.map(f => f.parent))) reverseFrames(intoSection.filter(f => f.parent === p));
      await bind(intoSection, intoSection[0].parent.name);
    }
    if (waiting.length) ask(); else figma.ui.postMessage({ status: 'Paste your screens onto the page.' });
  }

  // A paste fires one CREATE per layer; only top-level frames are kept, and nothing happens until the paste goes quiet.
  const onChange = e => {
    if (busy) return;
    for (const c of e.nodeChanges) if (c.type === 'CREATE') pending.add(c.id);
    if (!pending.size) return;
    clearTimeout(timer); timer = setTimeout(flush, 1200);
  };
  let page = figma.currentPage;
  page.on('nodechange', onChange);
  figma.on('currentpagechange', () => { page.off('nodechange', onChange); page = figma.currentPage; page.on('nodechange', onChange); waiting = []; figma.ui.postMessage({ ask: '' }); });
}

// Reverse frames: the frames (same parent) swap places on the canvas, so the first ends up last, keeping their gaps;
// then the layers panel is stacked to match. Running it twice puts them back.
const rowOf = n => Math.round(n.y / 40);
const byReading = (p, q) => rowOf(p) - rowOf(q) || p.x - q.x;
function reverseFrames(frames) {
  if (frames.length < 2) return;
  const ordered = [...frames].sort(byReading);
  if (ordered.every(n => Math.abs(n.y - ordered[0].y) < 1)) {
    // A row: rebuild it from the same start, mirrored, with the same gaps in mirrored order.
    const gaps = ordered.slice(1).map((n, i) => n.x - (ordered[i].x + ordered[i].width));
    let x = ordered[0].x;
    [...ordered].reverse().forEach((n, i) => { n.x = x; x += n.width + (gaps[gaps.length - 1 - i] ?? 0); });
  } else {
    // A grid: each frame takes the position of its mirror in reading order.
    const slots = ordered.map(n => ({ x: n.x, y: n.y }));
    ordered.forEach((n, i) => { const t = slots[slots.length - 1 - i]; n.x = t.x; n.y = t.y; });
  }
  stackByCanvas(frames);
}
// The layers panel lists the last child first, so leftmost-on-top means appending in reverse reading order. The frames
// keep their slots among any other layers in the parent.
function stackByCanvas(frames) {
  if (frames.length < 2) return;
  const parent = frames[0].parent;
  const picked = new Set(frames);
  const order = [...parent.children];
  const slots = order.map((n, i) => (picked.has(n) ? i : -1)).filter(i => i >= 0);
  const desired = [...frames].sort(byReading).reverse();
  slots.forEach((slot, k) => { order[slot] = desired[k]; });
  for (const n of order) parent.appendChild(n);
}

// Plugin entry. Skipped when an agent runs this file through the MCP.
if (typeof __MCP__ === 'undefined' && figma.command === 'watch') watchPastes();
else if (typeof __MCP__ === 'undefined') {
  (async () => {
    const roots = figma.currentPage.selection;
    if (!roots.length) { figma.notify('Select the section or frames you pasted, then run again.'); figma.closePlugin(); return; }
    let result;
    try { result = await bindCapture([...roots]); } catch (e) { figma.notify('Bind capture failed: ' + e.message, { error: true }); figma.closePlugin(); return; }
    const b = result.bound;
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const rows = result.stillRaw.map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('') || '<tr><td colspan="2">Nothing. Everything matched a token.</td></tr>';
    figma.showUI(`
      <style>
        body { font: 12px/1.5 Inter, system-ui, sans-serif; margin: 16px; color: #0a0a0a; }
        h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        td { padding: 4px 0; border-bottom: 1px solid #ebebeb; } td:last-child { text-align: right; color: #737373; }
        button { width: 100%; height: 32px; border: 0; border-radius: 8px; background: #ffc423; color: #451a03; font-weight: 600; cursor: pointer; }
      </style>
      <h2>Bound ${result.mutatedCount} layers</h2>
      <table>
        <tr><td>Spacing</td><td>${b.spacing}</td></tr><tr><td>Radius</td><td>${b.radius}</td></tr>
        <tr><td>Colours</td><td>${b.color}</td></tr><tr><td>Gradients</td><td>${b.gradient}</td></tr>
        <tr><td>Shell styles</td><td>${b.shellStyle}</td></tr><tr><td>Text styles</td><td>${b.textStyle}</td></tr>
        <tr><td>Captured in</td><td>${result.captured}</td></tr><tr><td>Modes cleared</td><td>${b.modesCleared}</td></tr><tr><td>Tiles rebuilt</td><td>${b.tile}</td></tr><tr><td>Field edges</td><td>${b.edge}</td></tr><tr><td>Shadows</td><td>${b.shadow}</td></tr>
      </table>
      <h2>Still raw</h2>
      <table>${rows}</table>
      <button onclick="parent.postMessage({ pluginMessage: 'close' }, '*')">Done</button>
    `, { width: 340, height: 520, title: 'Bind capture' });
    figma.ui.onmessage = () => figma.closePlugin();
  })();
}
