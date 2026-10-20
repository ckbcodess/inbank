// Verification script for Phase 1 Figma cleanup.
// Can be run on TOKENS (Jt6NULjnrNV65dMSSrddas) or any consuming file like CORE COMPONENTS (lgNxPD7Kn0ZaFZ7Ev1rVwu).

const isTokensLibrary = (await figma.variables.getLocalVariableCollectionsAsync()).some(c => c.name === 'Theme');

if (isTokensLibrary) {
  // --- Verification for 1. TOKENS file ---
  const allVars = await figma.variables.getLocalVariablesAsync();
  const allStyles = await figma.getLocalTextStylesAsync();
  const byId = Object.fromEntries(allVars.map(v => [v.id, v]));

  const deprecatedRemaining = allVars.filter(v => v.name.startsWith('_deprecated/'));
  const deprecatedStylesRemaining = allStyles.filter(s => s.name.startsWith('_deprecated/'));

  // Broken aliases check
  const brokenAliases = [];
  for (const v of allVars) {
    for (const [modeId, val] of Object.entries(v.valuesByMode)) {
      const aliasId = val?.type === 'VARIABLE_ALIAS' ? val.id : val?.color?.type === 'VARIABLE_ALIAS' ? val.color.id : null;
      if (aliasId && !byId[aliasId]) {
        brokenAliases.push({ variable: v.name, modeId, missingAliasId: aliasId });
      }
    }
  }

  const PHASE2_DEFERRED_VARS = new Set([
    '_deprecated/size-56',
    '_deprecated/size-80',
    '_deprecated/size-96',
    '_deprecated/size-120',
    '_deprecated/size-128',
  ]);

  const unexpectedDeprecated = deprecatedRemaining.filter(v => !PHASE2_DEFERRED_VARS.has(v.name));

  return {
    file: '1. TOKENS',
    totalActiveVariables: allVars.length,
    deprecatedRemainingCount: deprecatedRemaining.length,
    phase2DeferredCount: deprecatedRemaining.filter(v => PHASE2_DEFERRED_VARS.has(v.name)).length,
    unexpectedDeprecatedCount: unexpectedDeprecated.length,
    unexpectedDeprecated: unexpectedDeprecated.map(v => v.name),
    deprecatedStylesCount: deprecatedStylesRemaining.length,
    deprecatedStyles: deprecatedStylesRemaining.map(s => s.name),
    brokenAliasesCount: brokenAliases.length,
    brokenAliases,
    status: (brokenAliases.length === 0 && unexpectedDeprecated.length === 0 && deprecatedStylesRemaining.length === 0)
      ? 'CLEAN (0 broken aliases, all Phase 1 items removed, 5 Phase 2 variables preserved)'
      : 'FAIL (Issues found)',
  };
} else {
  // --- Verification for consuming file (e.g. 2. CORE COMPONENTS) ---
  const keyCache = {};
  const isMissingVar = async id => {
    if (!id) return false;
    if (!(id in keyCache)) {
      const v = await figma.variables.getVariableByIdAsync(id);
      keyCache[id] = !v;
    }
    return keyCache[id];
  };

  const styleCache = {};
  const isMissingStyle = async id => {
    if (!id) return false;
    if (!(id in styleCache)) {
      const s = await figma.getStyleByIdAsync(id);
      styleCache[id] = !s;
    }
    return styleCache[id];
  };

  const missingVarBindings = [];
  const missingStyleBindings = [];
  let scannedNodes = 0;

  for (const page of figma.root.children) {
    await figma.setCurrentPageAsync(page);
    const nodes = page.findAll();
    for (const n of nodes) {
      scannedNodes++;
      // Check non-paint boundVariables
      for (const [field, val] of Object.entries(n.boundVariables || {})) {
        if (['fills', 'strokes', 'effects', 'textRangeFills', 'componentProperties'].includes(field) || Array.isArray(val) || !val?.id) continue;
        if (await isMissingVar(val.id)) {
          missingVarBindings.push({ page: page.name, nodeId: n.id, nodeName: n.name, field, varId: val.id });
        }
      }
      // Check fills
      if (Array.isArray(n.fills)) {
        for (const p of n.fills) {
          const id = p.boundVariables?.color?.id;
          if (id && await isMissingVar(id)) {
            missingVarBindings.push({ page: page.name, nodeId: n.id, nodeName: n.name, field: 'fill', varId: id });
          }
        }
      }
      // Check strokes
      if (Array.isArray(n.strokes)) {
        for (const p of n.strokes) {
          const id = p.boundVariables?.color?.id;
          if (id && await isMissingVar(id)) {
            missingVarBindings.push({ page: page.name, nodeId: n.id, nodeName: n.name, field: 'stroke', varId: id });
          }
        }
      }
      // Check text styles
      if (n.type === 'TEXT') {
        const segs = typeof n.textStyleId === 'string'
          ? [{ start: 0, end: n.characters.length, textStyleId: n.textStyleId }]
          : n.getStyledTextSegments(['textStyleId']);
        for (const s of segs) {
          if (s.textStyleId && await isMissingStyle(s.textStyleId)) {
            missingStyleBindings.push({ page: page.name, nodeId: n.id, nodeName: n.name, styleId: s.textStyleId });
          }
        }
      }
    }
  }

  return {
    file: figma.root.name,
    pagesScanned: figma.root.children.length,
    scannedNodes,
    missingVariablesCount: missingVarBindings.length,
    missingVariables: missingVarBindings.slice(0, 20),
    missingStylesCount: missingStyleBindings.length,
    missingStyles: missingStyleBindings.slice(0, 20),
    status: (missingVarBindings.length === 0 && missingStyleBindings.length === 0)
      ? 'CLEAN (0 missing bindings)'
      : 'FAIL (Missing bindings found)',
  };
}
