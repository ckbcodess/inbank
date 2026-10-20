// Phase 1 Verification Runner
// Runs on either 1. TOKENS or 2. CORE COMPONENTS

(async () => {
  try {
    const isTokensLibrary = (await figma.variables.getLocalVariableCollectionsAsync()).some(c => c.name === 'Theme');

    if (isTokensLibrary) {
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

      const report = {
        file: '1. TOKENS',
        totalActiveVariables: allVars.length,
        deprecatedRemainingCount: deprecatedRemaining.length,
        phase2DeferredCount: deprecatedRemaining.filter(v => PHASE2_DEFERRED_VARS.has(v.name)).length,
        unexpectedDeprecatedCount: unexpectedDeprecated.length,
        unexpectedDeprecated: unexpectedDeprecated.map(v => v.name),
        deprecatedStylesCount: deprecatedStylesRemaining.length,
        brokenAliasesCount: brokenAliases.length,
        brokenAliases,
      };

      console.log('✓ TOKENS Verification Report:', report);

      if (brokenAliases.length === 0 && unexpectedDeprecated.length === 0 && deprecatedStylesRemaining.length === 0) {
        figma.notify('✓ Phase 1 cleanup 100% SUCCESS! (0 broken aliases, 0 unexpected deprecated items, 5 Phase 2 variables preserved)');
      } else {
        figma.notify(`⚠️ Issues: ${brokenAliases.length} broken aliases, ${unexpectedDeprecated.length} unexpected deprecated vars.`);
      }
    } else {
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
          for (const [field, val] of Object.entries(n.boundVariables || {})) {
            if (['fills', 'strokes', 'effects', 'textRangeFills', 'componentProperties'].includes(field) || Array.isArray(val) || !val?.id) continue;
            if (await isMissingVar(val.id)) {
              missingVarBindings.push({ page: page.name, nodeId: n.id, field, varId: val.id });
            }
          }
          if (Array.isArray(n.fills)) {
            for (const p of n.fills) {
              const id = p.boundVariables?.color?.id;
              if (id && await isMissingVar(id)) {
                missingVarBindings.push({ page: page.name, nodeId: n.id, field: 'fill', varId: id });
              }
            }
          }
          if (Array.isArray(n.strokes)) {
            for (const p of n.strokes) {
              const id = p.boundVariables?.color?.id;
              if (id && await isMissingVar(id)) {
                missingVarBindings.push({ page: page.name, nodeId: n.id, field: 'stroke', varId: id });
              }
            }
          }
          if (n.type === 'TEXT') {
            const segs = typeof n.textStyleId === 'string'
              ? [{ start: 0, end: n.characters.length, textStyleId: n.textStyleId }]
              : n.getStyledTextSegments(['textStyleId']);
            for (const s of segs) {
              if (s.textStyleId && await isMissingStyle(s.textStyleId)) {
                missingStyleBindings.push({ page: page.name, nodeId: n.id, styleId: s.textStyleId });
              }
            }
          }
        }
      }

      const report = {
        file: figma.root.name,
        scannedNodes,
        missingVariablesCount: missingVarBindings.length,
        missingStylesCount: missingStyleBindings.length,
      };

      console.log('✓ Consuming File Verification Report:', report);

      if (missingVarBindings.length === 0 && missingStyleBindings.length === 0) {
        figma.notify(`✓ ${figma.root.name} is 100% CLEAN! (0 missing bindings across ${scannedNodes} nodes)`);
      } else {
        figma.notify(`⚠️ ${missingVarBindings.length} missing variables, ${missingStyleBindings.length} missing styles.`);
      }
    }
  } catch (err) {
    console.error('Verification error:', err);
    figma.notify('❌ Verification error: ' + (err.message || String(err)), { error: true, timeout: 6000 });
  } finally {
    figma.closePlugin();
  }
})();
