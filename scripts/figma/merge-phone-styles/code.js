// NIBS · Merge phone styles (one-off, 2026-11-10)
// Page title, Section heading and Hero figure now take their phone size from the Typography collection's Mobile mode.
// This moves every layer still using a "· phone" style onto the main style, and sets the Typography collection to
// Mobile on the screen it sits in, so nothing changes size.
//
// Run it in each file that uses the styles: 1. TOKENS first, then (after publishing) Internet Banking and
// CORE COMPONENTS. Plugins → Development → Import plugin from manifest… → this folder's manifest.json, then
// Plugins → Development → NIBS · Merge phone styles. It needs Open Sans Medium installed, which is why it runs on
// your machine rather than through the Figma MCP. When it reports 0 left in every file, delete the three
// _deprecated phone styles in 1. TOKENS.

const PAIRS = {
  af6591595b9cfed0582f16e0e295b2ad87ce7c01: '82ec531a727a40549d4f50d5ebf8d29c4e4ff06b', // Hero figure · phone → Hero figure
  '738626935708bcb6edb93b0cfafe67c24c2bfeb9': 'e137937937fa4af58536ad12c423f049963769ff', // Page title · phone → Page title
  '9971e19c663495a4a168e566076c400fbd020a49': '2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', // Section heading · phone → Section heading
};
const keyOf = styleId => (typeof styleId === 'string' ? (styleId.match(/^S:([0-9a-f]+)/) || [])[1] : null);

async function typographyCollection() {
  const local = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'Typography');
  if (local) return local;
  const lib = (await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()).find(c => c.name === 'Typography');
  if (!lib) throw new Error('The Typography collection from 1. TOKENS isn’t available in this file.');
  const [first] = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(lib.key);
  const v = await figma.variables.importVariableByKeyAsync(first.key);
  return figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
}

// The screen a layer sits in: the outermost frame under the page or a section. A layer inside a wide (desktop) screen
// gets the mode on its own parent frame instead, so the rest of that screen stays Desktop.
function modeHost(node) {
  let screen = null;
  for (let p = node.parent; p && p.type !== 'PAGE'; p = p.parent) {
    if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(p.type) && (p.parent.type === 'PAGE' || p.parent.type === 'SECTION')) { screen = p; break; }
  }
  if (screen && screen.width <= 640) return screen;
  let p = node.parent;
  while (p && !['FRAME', 'COMPONENT', 'INSTANCE'].includes(p.type)) p = p.parent;
  return p;
}

(async () => {
  try {
    const col = await typographyCollection();
    const mobile = col.modes.find(m => m.name === 'Mobile');
    // In 1. TOKENS the main styles are local; elsewhere they come from the library.
    const localStyles = await figma.getLocalTextStylesAsync();
    const targets = {};
    for (const [phone, main] of Object.entries(PAIRS)) {
      targets[phone] = localStyles.find(s => s.key === main);
      if (!targets[phone]) {
        try { targets[phone] = await figma.importStyleByKeyAsync(main); } catch { figma.notify('Main style missing: publish 1. TOKENS first.', { error: true }); figma.closePlugin(); return; }
      }
    }
    await figma.loadAllPagesAsync();
    let moved = 0, failed = 0; const hosts = new Set();
    for (const page of figma.root.children) {
      for (const t of page.findAllWithCriteria({ types: ['TEXT'] })) {
        const key = keyOf(t.textStyleId);
        if (!key || !targets[key]) continue;
        try {
          for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName);
          await figma.loadFontAsync(targets[key].fontName);
          const host = modeHost(t);
          if (host && !(host.explicitVariableModes && host.explicitVariableModes[col.id] === mobile.modeId)) { host.setExplicitVariableModeForCollection(col, mobile.modeId); hosts.add(host.id); }
          await t.setTextStyleIdAsync(targets[key].id);
          moved++;
        } catch { failed++; }
      }
    }
    figma.notify(`Moved ${moved} layers to the main styles, set Mobile on ${hosts.size} frames${failed ? `, ${failed} failed` : ''}.`, { timeout: 8000 });
  } catch (e) {
    figma.notify('Merge failed: ' + e.message, { error: true });
  }
  figma.closePlugin();
})();
