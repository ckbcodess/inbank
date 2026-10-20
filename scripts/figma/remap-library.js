// Remap a file that consumes the TOKENS library: every binding on a retired or orphaned variable / text style
// moves to its replacement, matched by key (names don't matter). Run through the Figma MCP `use_figma` tool on the
// consuming file, one page per call. Prepend: const PAGE_ID = '…', DRY_RUN = true|false;
// Keys come from docs/figma-token-mapping.md (TOKENS file Jt6NULjnrNV65dMSSrddas, 2026-10-19).
const T = { // replacement variable keys (current TOKENS)
  surfaceMuted: 'b0e4f20f7fde6deb2fa25fde77b276ae0d296a67', textSecondary: '34ceb68c17958de9ad150d7debefbe3a92138448',
  txYellow: '7a96afd26672ca25a3c45287a995cf0baae2cff8', txYellowInk: 'd4ff4e33b96040ce1d484cf4f3096d889b806636',
  txPink: 'a54c9ee5ea84f5b21a5926d62f483d5e6105286f', txPinkInk: 'd87648c3240e3b354b7af54b094e9f3de0eb4e87',
  actionPrimary: 'a0716170fef0a81dbfbcedfe6206448ceabf29a0', actionPrimaryHover: 'df8a08fb26b338a702f117e4066e6a59b69f6b0d',
  textOnAmber: '5744aaf2b45bac52917ae4a1e4a07d44792e4a6f', borderActive: 'cc184a76d4117e0af6d62d645919b8d88163dcc6',
  surfaceBackground: '1345d92b2cc5fa6569427db946af33324304b63f', textPrimary: 'f58d23ac37517ebf3011fb95a032045b674e1db2',
  borderDefault: '00afea41c42ddc5dea9e7c4af6734b3dfbad9f86', borderFocus: '2cc99d233f0a34e5a5c0ffcad32aac01578f1a44',
  tintError: '33283012e882864076b9cce186abb588912cb10a', textError: '041a9b697ceb17e5a6a9a9730596778f98df3ad9',
  tintSuccess: 'f7d3b4d81ce93fbc43e9d48aa6ab0061f985c098', tintWarning: 'dadd585651956920e239758dc85a1fe2b3e3bfd6',
  tintBlue: 'b12efd24ed3194651a13f17a2d1c65d0f9306dd0', textBlue: 'b7958466e841bfefb7176439a55df6c93c6c0877',
  tintViolet: 'cf9c48921c5bfc47a240b51871ff87db4f4744c9', textViolet: '47f2f8e79f2f0e692677b6d04369ce5ec7860dab',
  white: 'd358ae529c07dad769ec6272e4c37284da51e1a3', black: '446cb043a4e0618f54cad16caa844a3fd292fc1a',
  roundedSm: 'e2cc7dba5bc13de570667b93f484ba1989515f74', roundedLg: 'fe4e80a58ecafc17d6092768a523994e5fd9c601',
  roundedXl: 'b9204885c8f4429819d39007ff69277dd3e42397', rounded2xl: '2cb6c78e53d7ee54f0d12cab49a7c40b5567e22f',
  roundedFull: 'a657beaf7b5fa4b0001aaf8b8a197c11c8d9b343', border1: 'dbf46b0e8671ce7f214f80c28e2039294bed9a40',
  stroke2: 'a002124b8d7215effdacfaa63b7f4660dce8ff50', opacity50: 'd9aafb3c552bb32797906bbffcbc77c7538ded1d',
  opacity60: 'aa2cc0d8471ed00fbd13b3fb6173001cd81afd1d',
  gray900: 'c9f3ab041684f11482dcd0203b1cc91031e928d3', gray950: '6b0161a8f3e80bd7cadec0b190a11d399cd7092b',
  dataCat1: '2c7e48c5e4574abdf388ef59be586cef4cc5ceaa', dataCat2: 'c53af6e5c66795db882a5ee6d1abc2c57bee6af5',
  dataCat3: '0f9f58872b5f62dc246b1d4ed0445df56b54f084', dataCat4: '6e4d5e50cb6c2e41fad1e5887fbd19e116d9f488',
  dataCat5: '06fee95b6d72c93ea3a2f26e5a90328b552e4b2d', amber400: 'ac5b984528cc36091f1182b7968098c8d379ffeb',
  violet600: '078cc040826ef6798dc0e87ab7158cf2690aef30', blue600: 'e8fe92e2c8000f931662b7c06352f46cc63bf432',
  orange600: '8af8a024b912ab3fc86c99d2547611e438c053c8', green600: 'ad547e1b552404aaae5185e62fb429247fac16a8',
  red600: 'b552927635f97072d41291daada120b77a1e5e92',
};
const VMAP = { // old variable key → replacement (T key name) or 'UNBIND'
  // retired TOKENS colours
  '5c881a95e8027e273a80f1e3071f6f365a03e924': 'surfaceMuted', 'b0fd11784013ffbb9776753fcac5cb9665e829e4': 'surfaceMuted',
  'a76d6e467796088371ac3796af90fd8be8c57fd6': 'surfaceMuted', '993cd7a8bc2fb0405aebba5aa08fd47d63b3f9d6': 'textSecondary',
  'a9e006698f1093697c48120228c271f4983bdcd1': 'textSecondary', '79febb04c5377eb5d7577580f726e972f21c32b5': 'txYellow',
  'd9b466dd518c4363dd8e94da8851783a6dd2e364': 'txYellowInk', 'bca919cfeb67cc2b2d99f19f9c5c506d3519e62f': 'actionPrimary',
  '6d2a5fae17e050846fbbd3bbd6ef67621330ab8a': 'actionPrimaryHover', 'b47f4e1e6ac1f1fbac5d19855b988828a23a385c': 'textOnAmber',
  'd2b653e1b2055ea5284f62334f50439a94d7e7f2': 'actionPrimary', '00fb394e64c8516bddee8e5d8b894c8d394d922e': 'actionPrimaryHover',
  '94415aa994ddc067c5a9675028f63db152593f3f': 'textPrimary', 'f9641b30c4e21ff718f398f051ccdf7c2ffd4736': 'borderActive',
  '3f18ab7c290818914e81d146de97c9d8e0c975bc': 'surfaceBackground', '0117fef55399936d48f2b3d7b2c341bd4f3c0eff': 'surfaceBackground',
  '61016021a39662ee86b04a5b6be7d2f090f8a554': 'textSecondary', '39453941d8ac4383d81f7989d528c3ce6dd28320': 'surfaceMuted',
  '3a8f571bd14af102e53fd2ce0bc9bf4120cb8fb5': 'textOnAmber', '2a717ba041d1764d594b11a2a081396e72633a18': 'actionPrimary',
  '346017e5b9ff4d93d3ae260c10015612f920d949': 'textPrimary', '7acf8c28e4f5064e652e50f4954e2a9e7e52e26e': 'borderDefault',
  '0fc7fcafb4f3cf1f43e6cbc68b7fc037b2dc7b80': 'borderFocus', 'cde99d2493d482ac092b919e09d5b178d71a2499': 'tintError',
  '2e1682deaa0e5b2e0514d2fcae65fb6e356adf9d': 'tintSuccess', '41c248fd4012ad7bd88b53caa4da7e08659b85bc': 'tintWarning',
  '29d6ce57ed54db0060b15998acb1dd651b1d91c9': 'tintBlue', '057d7079a90b540f851961655c11bfdcb926a725': 'borderDefault',
  '361bf1682e3e2c0ca1b91fe3cc12f35e9f4bbbee': 'white', 'cc8fb6aefc4c6ca1079e1c9b40bd60bee6bef386': 'black',
  'e841d86b3a28bc1ce3a05b2fe2a66cd33e559556': 'surfaceMuted', '0d8fa429f4b00d5adcfab6eae9f3cd5558831d3e': 'borderDefault',
  '7f6cc61b3085ca7370af588f3229dae304197857': 'white',
  'ac3912c444d11e1bad46f96f30d31dbd52f4cd5e': 'tintBlue', '4cd705b85800107810d5d7831fd0296a9ce168cc': 'textBlue',
  '0fbd6569e7a2b46ef4b110cec4c684b9aad25425': 'tintViolet', 'cc23de298213a01f93e0e329e9166f326d5961ce': 'textViolet',
  '8d977281c8ecf785f2eee22ac8535dff023a89a4': 'tintViolet', '82733bd1adda6f2a862e0141e706f885655a313d': 'textViolet',
  'e7b3f0953ef8a8bebd868f2e819a5fa8c3fe47b1': 'txPink', 'ff8d0cbc76bd20b7261b28def9f55faf9ab4b5f8': 'txPinkInk',
  '3c79d444fdde2f8ab03ce019077785f8f8d95ef9': 'tintError', '4f796cbdda61e27ce67e7f9b2e98545535450a05': 'textError',
  // Phase 1 primitives (ink/* and data/*)
  'dcd952c2e7392f17c83376848cdcdccf89366278': 'gray900', '81e233211cec61d43e485a8ffbed8e31228fc50e': 'gray950',
  'c1b13f70c86b04f8db8c30dfb807a5abe9062c90': 'dataCat1', '71c7f0a2953205f08350707b8b38f17a5df138b5': 'dataCat2',
  'babdd63f4f362667dddca3a5d0cf0904e0a70fa5': 'dataCat3', 'a7ab3f354601d147a148d613ddb04c02614c2d48': 'dataCat4',
  'fc0a822a65eaccfb8d77ffa4669d0fd55f882458': 'dataCat5', '3e407fd0059a51253e0088ae048148de7913e30a': 'amber400',
  '589ca3d21aacbdeb15c0e94a1b6d99f1f47b26b4': 'violet600', '8bf3ce2eb498b7e679abab7af1db472ebf3ebed3': 'violet600',
  '9714275c3187528fa197cd2ae7106c061e1c7162': 'blue600', 'eac3759412b28245c57656e626e08b7e154b6c9b': 'orange600',
  '9f51d8241ae62f260e6a11c60083a04d091b575c': 'green600', '5e82f5cd109e19bd059f1f4d580319fce4a1ba15': 'red600',
  // retired TOKENS radii
  '6a3162499e09d841662c40131b5c09c2f0118727': 'roundedLg', '1a1f3593e585fc0105f8c153f051ee2b630cb448': 'roundedSm',
  'e3aead0393b2b3f9c72e667fe582ade8f36402f5': 'roundedLg', 'b963e490ed94cf23507e2053878ba707bd7d3371': 'roundedLg',
  // orphans (deleted from TOKENS before 2026-10-19)
  '437a47f9b4af6a10e4c562e88725fa90671780f8': 'UNBIND', 'd06a799ded5b80795f6eae62299606a819ddfd91': 'roundedSm',
  '187bf9865128709c1ccbc7a15534763f1671bdf5': 'roundedLg', 'ab7462adac6578bfdb1902472f1d50e64b26666a': 'roundedXl',
  '862c7a525db9b0fb27cb1193c2b5542a6a018e25': 'rounded2xl', 'bd1b1ea3effb5c6e565f9c9713431611d62e1c18': 'roundedFull',
  '582a9144f85a3a2c4b95e9a36b4cb67edb6be35e': 'roundedLg', '71a2931c1b714cf347e201eb2dff065bc9e6c535': 'roundedSm',
  '5e6776342e0d6487a7564a34b0d1a3acf7d3e89f': 'roundedLg', '5acd196770a6355e893ea7b8853956512c6ce660': 'roundedFull',
  'd5c4eea9a4badb4f5d1a0a0afa2280a8527094df': 'roundedSm', '7d459064c158b03465702f85155a6f3a0a8bbdbe': 'border1',
  'b72f564fde98a743fcee1752c12dc3fdc50a119d': 'stroke2', '37c27c575d79d81d452dc2e8dfd0d7439b9ad984': 'textPrimary',
  '5a4f586db9429948eeebaa8428fe06f322ec0d1e': 'textPrimary', '712c1d34bd4121495b270a5f4bbe4afd57ad2a7e': 'opacity60',
  '3efba96ff58246511d1e62c710b5642c346e3ece': 'opacity50',
};
const SMAP = { // old text style key → new style key
  'fafd4b512443c43761014708b610ba2337ba9632': 'd4e5d2f75202b3cb9337ffb7f0304689fd9d6d97', // Component/Button → Label
  '09c9f1e35fc1a2d0e7d557a72c5fd9d3ee9d8103': 'a84bb19160a54d2f6dba3c12869f6de7c8991183', // Text/Normal → Row and input
  '86fc424c00a2c9fd19aa75ff669547ba38807a3a': '82ec531a727a40549d4f50d5ebf8d29c4e4ff06b', // Display XL → Hero figure
  '0b77976b7536638a629f577d0df603ae8fddd07b': '82ec531a727a40549d4f50d5ebf8d29c4e4ff06b', // Display Large → Hero figure
  '6c56dd5db1a66cde465e3fb5310d94859b900bdd': '2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', // Text/Large (Bold) → Section heading
  '29d5edaf83c1eb4302ff63496995cd126a41e9b9': '2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', // Text/Large → Section heading
  'f0bf3ddd7d2d5b943ae528abc34a43a805639209': 'e137937937fa4af58536ad12c423f049963769ff', // Heading/Section → Page title
  '663ed0572d52d1cd210322e8cc664ad047e47d45': '2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', // Link/Large → Section heading
  '697294b9655e73fe4cf7f195161d55301962c94b': '2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', // Link/Default → Section heading
  '4493992fe347aba97acba51cf2d1fc03a6f3e9a3': '2bb9d6c758f2ff3c5c5b3f4253ab425de03bbca4', // Chart Title → Section heading
  'efc276cfb024e759172cf53245c39a9f0587e707': 'a84bb19160a54d2f6dba3c12869f6de7c8991183', // Small Mono → Row and input
  '00ce65ec5c5a8d9f95a1fd40ad8b3dc14c289e94': '7dd46a3f5274c738a890246200c963ca0e2e417f', // Extra Small (Uppercase) → Meta
  '027e45c3be9830840e40d71489ca6b7f606ee19c': 'd4e5d2f75202b3cb9337ffb7f0304689fd9d6d97', // Extra Small (Bold) → Label
};

const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const keyOf = {}; const vkey = async id => { if (!(id in keyOf)) { const v = await figma.variables.getVariableByIdAsync(id); keyOf[id] = v ? v.key : null; } return keyOf[id]; };
const target = {}; const tvar = async name => { if (!target[name]) target[name] = await figma.variables.importVariableByKeyAsync(T[name]); return target[name]; };
const skey = {}; const styleKey = async id => { if (!(id in skey)) { const s = await figma.getStyleByIdAsync(id); skey[id] = s ? s.key : null; } return skey[id]; };
const tstyle = {}; const tst = async k => { if (!tstyle[k]) tstyle[k] = await figma.importStyleByKeyAsync(k); return tstyle[k]; };
const counts = {}, errors = []; const inc = k => { counts[k] = (counts[k] || 0) + 1; };
const paintsWith = async (paints, kind) => { let hit = false; const out = []; for (const p of paints) { const id = p.boundVariables?.color?.id; const k = id && await vkey(id); const m = k && VMAP[k]; if (m && m !== 'UNBIND') { hit = true; inc(`${kind} → ${m}`); out.push(DRY_RUN ? p : figma.variables.setBoundVariableForPaint(p, 'color', await tvar(m))); } else out.push(p); } return hit ? out : null; };
const inInstance = n => { for (let p = n.parent; p && p.type !== 'PAGE'; p = p.parent) if (p.type === 'INSTANCE') return true; return false; };
let fontsLoaded = false; const loadFonts = async () => { if (!fontsLoaded) { await figma.loadFontAsync({ family: 'Open Sans', style: 'Regular' }); fontsLoaded = true; } };
async function fix(n) {
  try {
    // non-paint fields (radius, stroke weight, opacity, padding…)
    for (const [field, val] of Object.entries(n.boundVariables || {})) {
      if (['fills', 'strokes', 'effects', 'textRangeFills', 'componentProperties'].includes(field) || Array.isArray(val) || !val?.id) continue;
      const k = await vkey(val.id); const m = k && VMAP[k]; if (!m) continue;
      inc(`${field} → ${m}`);
      if (!DRY_RUN) { if (m === 'UNBIND') n.setBoundVariable(field, null); else n.setBoundVariable(field, await tvar(m)); }
    }
    if (Array.isArray(n.fills)) { const out = await paintsWith(n.fills, 'fill'); if (out && !DRY_RUN) { if (n.type === 'TEXT') { for (const s of n.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); } n.fills = out; } }
    if (Array.isArray(n.strokes)) { const out = await paintsWith(n.strokes, 'stroke'); if (out && !DRY_RUN) n.strokes = out; }
    if (n.type === 'TEXT') {
      if (n.fills === figma.mixed) for (const s of n.getStyledTextSegments(['fills'])) { const out = await paintsWith(s.fills, 'text-range fill'); if (out && !DRY_RUN) { for (const f of n.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(f.fontName); n.setRangeFills(s.start, s.end, out); } }
      const segs = typeof n.textStyleId === 'string' ? [{ start: 0, end: n.characters.length, textStyleId: n.textStyleId }] : n.getStyledTextSegments(['textStyleId']);
      for (const s of segs) {
        if (!s.textStyleId) continue; const k = await styleKey(s.textStyleId); const nk = k && SMAP[k]; if (!nk) continue;
        inc('text style → ' + nk.slice(0, 8));
        if (!DRY_RUN) { await loadFonts(); for (const f of n.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(f.fontName); const st = await tst(nk); if (typeof n.textStyleId === 'string') await n.setTextStyleIdAsync(st.id); else await n.setRangeTextStyleIdAsync(s.start, s.end, st.id); }
      }
    }
  } catch (e) { errors.push({ id: n.id, name: n.name, error: String(e.message || e).slice(0, 140) }); }
}
const nodes = page.findAll();
for (const n of nodes) if (!inInstance(n)) await fix(n);
for (const n of nodes) if (inInstance(n)) await fix(n);
const total = Object.values(counts).reduce((a, b) => a + b, 0);
return { page: page.name, dryRun: DRY_RUN, total, counts, errors: errors.slice(0, 8), errorCount: errors.length };
