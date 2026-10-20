// Phase 1 Deletion for TOKENS library (Jt6NULjnrNV65dMSSrddas)
// Run through use_figma or Figma Console on TOKENS.
// Set DRY_RUN = false to actually remove. Always test with DRY_RUN = true first.
const DRY_RUN = true;

// Exact names (without _deprecated/ prefix) to remove per collection
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

const cols = Object.fromEntries((await figma.variables.getLocalVariableCollectionsAsync()).map(c => [c.id, c.name]));
const allVars = await figma.variables.getLocalVariablesAsync();

// Safety: check alias references across all local variables
const targetNameSet = new Set();
for (const [colName, names] of Object.entries(TARGETS)) {
  for (const n of names) {
    targetNameSet.add(`${colName}|${n}`);
    targetNameSet.add(`${colName}|_deprecated/${n}`);
  }
}

const varsToDelete = [];
for (const v of allVars) {
  const colName = cols[v.variableCollectionId];
  const cleanName = v.name.replace(/^_deprecated\//, '');
  if (TARGETS[colName]?.includes(cleanName)) {
    varsToDelete.push(v);
  }
}

const deleteIds = new Set(varsToDelete.map(v => v.id));
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
  return {
    error: 'Safety check failed: some target variables are still aliased by active variables!',
    blockedByAlias,
  };
}

// Find styles to delete
const allStyles = await figma.getLocalTextStylesAsync();
const stylesToDelete = [];
for (const s of allStyles) {
  const clean = s.name.replace(/^_deprecated\//, '');
  if (STYLE_TARGETS.includes(clean) || STYLE_TARGETS.includes(s.name)) {
    stylesToDelete.push(s);
  }
}

// Execute deletion
const deletedVarsByCol = {};
for (const v of varsToDelete) {
  const col = cols[v.variableCollectionId];
  (deletedVarsByCol[col] ||= []).push(v.name);
  if (!DRY_RUN) {
    const handle = await figma.variables.getVariableByIdAsync(v.id);
    if (handle) handle.remove();
  }
}

const deletedStyles = [];
for (const s of stylesToDelete) {
  deletedStyles.push(s.name);
  if (!DRY_RUN) {
    s.remove();
  }
}

return {
  dryRun: DRY_RUN,
  variablesFound: varsToDelete.length,
  variablesExpected: 77, // 46 + 4 + 14 + 13
  variablesByCollection: Object.fromEntries(Object.entries(deletedVarsByCol).map(([k, a]) => [k, a.length])),
  stylesFound: stylesToDelete.length,
  stylesExpected: 13,
  deletedVariables: deletedVarsByCol,
  deletedStyles,
};
