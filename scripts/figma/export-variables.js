// Exports every local variable that has a web code name, with its resolved Light and Dark values.
// Run through the Figma MCP `use_figma` tool in 1. TOKENS (Jt6NULjnrNV65dMSSrddas) and in Internet Banking
// (JcCeoeiauwHBrJmtaDSqzl, for Project Tokens). Save each result as JSON and pass the files to check-drift.mjs.
// Pro plans have no Variables REST API, so this step runs through the MCP rather than CI.
const hex = c => '#' + [c.r, c.g, c.b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('') + (c.a !== undefined && c.a < 0.995 ? '@' + c.a.toFixed(3) : '');
const pick = (col, names) => { for (const n of names) { const m = col.modes.find(x => x.name === n); if (m) return m.modeId; } return col.defaultModeId; };
async function resolve(v, modeNames, d = 0) {
  const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  const val = v.valuesByMode[pick(col, modeNames)];
  if (val && val.type === 'VARIABLE_ALIAS' && d < 8) return resolve(await figma.variables.getVariableByIdAsync(val.id), modeNames, d + 1);
  // A colour alias with its own opacity (surface/scrim = black at 30%).
  if (val && val.color && val.color.type === 'VARIABLE_ALIAS' && d < 8) {
    const base = await resolve(await figma.variables.getVariableByIdAsync(val.color.id), modeNames, d + 1);
    const a = (val.opacity ?? 100) / 100;
    return a < 0.995 ? String(base).split('@')[0] + '@' + a.toFixed(3) : base;
  }
  return val && typeof val === 'object' ? hex(val) : val;
}
const out = [];
for (const col of await figma.variables.getLocalVariableCollectionsAsync()) {
  for (const id of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    const syntax = v.codeSyntax && v.codeSyntax.WEB;
    if (!syntax) continue;
    out.push({
      collection: col.name,
      name: v.name,
      syntax,
      type: v.resolvedType,
      // Light/Dark for colours; Desktop (the code has no mobile token values) or the only mode for numbers.
      light: await resolve(v, ['Light', 'Desktop', 'Web', 'Amber', 'Value', 'Mode 1']),
      dark: await resolve(v, ['Dark', 'Desktop', 'Web', 'Amber', 'Value', 'Mode 1']),
    });
  }
}
return out;
