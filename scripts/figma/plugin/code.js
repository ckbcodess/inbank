// Phase 1 Deletion Runner for 1. TOKENS library (Jt6NULjnrNV65dMSSrddas)

(async () => {
  const TARGETS = {
    'Theme': [
      'action/secondary', '_legacy/background-color', 'text/invert', 'action/brand-text',
      'action/brand-subtle', 'nav/surface', 'nav/text', 'nav/action', 'nav/on-action',
      'nav/surface-active', 'nav/text-active', 'nav/border', 'nav/focus',
      '_legacy/semantic-background', '_legacy/semantic-border', '_legacy/semantic-foreground',
      'brand/secondary', 'brand/secondary-hover', 'brand/secondary-text', 'action/disabled',
      'text/disabled', 'status/error-subtle', 'status/success-subtle', 'status/warning-subtle',
      'status/info-subtle', 'action/secondary-hover', 'input/text-disabled', 'action/smoke',
      'action/smoke-hover', 'text/on-smoke', 'badge-tint/sky', 'badge-tint/indigo',
      'badge-tint/purple', 'badge-tint/pink', 'badge-tint/rose', 'badge-text/sky',
      'badge-text/indigo', 'badge-text/purple', 'badge-text/pink', 'badge-text/rose',
      'border/subtle', 'surface/always white', 'action/black', 'alpha/200', 'alpha/400', 'alpha/900',
    ],
    'Dimensions: Radius': [
      'rounded-xs', 'rounded-md', 'rounded-r-md', 'rounded-l-md',
    ],
    'Spacing Primitives': [
      'size-6', 'size-10', 'size-14', 'size-18', 'size-28', 'size-36', 'size-44',
      'size-68', 'size-72', 'size-84', 'size-88', 'size-104', 'size-112', 'size-124',
    ],
    'Color Primitives': [
      'ink/900', 'ink/950', 'data/chart-1', 'data/chart-2', 'data/chart-3', 'data/chart-4',
      'data/chart-5', 'data/purple', 'data/violet', 'data/yellow', 'data/indigo', 'data/orange',
      'data/green', 'data/ruby',
    ],
  };

  const STYLE_TARGETS = [
    'Display/Display XL', 'Display/Display Large', 'Heading/Section', 'Text/Large',
    'Text/Large (Bold)', 'Text/Normal', 'Text/Small Mono', 'Text/Extra Small (Bold)',
    'Text/Extra Small (Uppercase)', 'Link/Large', 'Link/Default', 'Component/Button',
    'Component/Chart Title',
  ];

  try {
    const cols = Object.fromEntries((await figma.variables.getLocalVariableCollectionsAsync()).map(c => [c.id, c.name]));
    const allVars = await figma.variables.getLocalVariablesAsync();

    // 1. Identify variables to delete
    const varsToDelete = [];
    for (const v of allVars) {
      const colName = cols[v.variableCollectionId];
      const cleanName = v.name.replace(/^_deprecated\//, '');
      if (TARGETS[colName]?.includes(cleanName)) {
        varsToDelete.push(v);
      }
    }

    const deleteIds = new Set(varsToDelete.map(v => v.id));

    // 2. Safety check: ensure no active variable still aliases any deletion candidate
    const blockedByAlias = [];
    for (const v of allVars) {
      if (deleteIds.has(v.id)) continue;
      for (const val of Object.values(v.valuesByMode)) {
        const aliasId = val?.type === 'VARIABLE_ALIAS' ? val.id : val?.color?.type === 'VARIABLE_ALIAS' ? val.color.id : null;
        if (aliasId && deleteIds.has(aliasId)) {
          const targetVar = varsToDelete.find(x => x.id === aliasId);
          blockedByAlias.push(`${targetVar?.name} is still aliased by ${v.name}`);
        }
      }
    }

    if (blockedByAlias.length > 0) {
      figma.notify('❌ Deletion aborted: safety alias check failed! See console for details.', { error: true, timeout: 6000 });
      console.error('Blocked by alias references:', blockedByAlias);
      figma.closePlugin();
      return;
    }

    // 3. Identify styles to delete
    const allStyles = await figma.getLocalTextStylesAsync();
    const stylesToDelete = [];
    for (const s of allStyles) {
      const clean = s.name.replace(/^_deprecated\//, '');
      if (STYLE_TARGETS.includes(clean) || STYLE_TARGETS.includes(s.name)) {
        stylesToDelete.push(s);
      }
    }

    // 4. Execute deletion
    const deletedVarsByCol = {};
    for (const v of varsToDelete) {
      const col = cols[v.variableCollectionId];
      (deletedVarsByCol[col] ||= []).push(v.name);
      const handle = await figma.variables.getVariableByIdAsync(v.id);
      if (handle) {
        handle.remove();
      }
    }

    const deletedStyles = [];
    for (const s of stylesToDelete) {
      deletedStyles.push(s.name);
      s.remove();
    }

    const report = {
      variablesDeleted: varsToDelete.length,
      variablesByCollection: Object.fromEntries(Object.entries(deletedVarsByCol).map(([k, a]) => [k, a.length])),
      stylesDeleted: stylesToDelete.length,
      details: {
        deletedVariables: deletedVarsByCol,
        deletedStyles,
      },
    };

    console.log('✓ Phase 1 Deletion Report:', report);
    figma.notify(`✓ Phase 1 deletion complete! Removed ${varsToDelete.length} variables and ${stylesToDelete.length} styles.`);
  } catch (err) {
    console.error('Phase 1 Deletion failed:', err);
    figma.notify('❌ Phase 1 Deletion error: ' + (err.message || String(err)), { error: true, timeout: 6000 });
  } finally {
    figma.closePlugin();
  }
})();
