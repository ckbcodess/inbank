/**
 * i18n coverage — lists English UI copy that has no catalog entry yet.
 *
 *   npx tsx scripts/i18n-coverage.mts            # summary + first 40 gaps
 *   npx tsx scripts/i18n-coverage.mts --all      # every gap, grouped by file
 *
 * Extracts JSX text, text-ish attributes and string/template literals from
 * src/ (same heuristics the catalog was built from), then diffs them against
 * src/lib/i18n/catalog. Names, merchants, references and other customer data
 * are expected to show up as gaps — they are deliberately left in English.
 */
import ts from "typescript";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildCatalog } from "../src/lib/i18n/catalog/index.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

const SKIP_ATTRS = new Set([
  "className", "href", "key", "id", "type", "variant", "size", "src", "name", "htmlFor",
  "role", "data-tour", "inputMode", "autoComplete", "side", "align", "method", "target",
  "rel", "pattern", "d", "viewBox", "fill", "stroke", "strokeLinecap", "strokeLinejoin",
  "style", "tabIndex", "dir", "lang", "form", "accept", "capture", "as", "mode", "orientation",
]);
const SKIP_PROPS = new Set([
  "className", "href", "key", "id", "icon", "iconName", "route", "path", "color", "tone",
  "variant", "kind", "type", "status", "code", "slug", "value", "rail", "category", "bg",
  "fg", "gradient", "theme", "network", "tier", "currency", "ccy", "accountNumber", "email",
  "phone", "msisdn", "ref", "reference", "date", "iso", "flag", "tabId", "anchor", "target",
  "selector", "tour", "dataTour", "accent", "hex", "image", "img", "logo", "src", "url",
]);
const SKIP_CALLS = new Set([
  "cn", "clsx", "require", "import", "push", "replace", "get", "set", "getItem", "setItem",
  "removeItem", "querySelector", "querySelectorAll", "getElementById", "addEventListener",
  "removeEventListener", "useSearchParams", "startsWith", "endsWith", "includes", "split",
  "join", "localeCompare", "toLocaleString", "toLocaleDateString", "toLocaleTimeString",
  "Intl.NumberFormat", "NumberFormat", "DateTimeFormat", "matchMedia", "createElement",
  "setAttribute", "getAttribute", "t", "redirect", "prefetch", "fetch", "cva",
]);

const out = new Map<string, { s: string; files: Set<string> }>();
const ENT = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”", "&nbsp;": " ", "&middot;": "·", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…", "&lt;": "<", "&gt;": ">", "&#39;": "'", "&bull;": "•", "&times;": "×", "&rarr;": "→", "&larr;": "←" };
function add(s, file) {
  s = s.replace(/&[a-z#0-9]+;/g, (m) => ENT[m] ?? m);
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return;
  if (!/[A-Za-z]{2,}/.test(s)) return;
  const rec = out.get(s) || { s, files: new Set<string>() };
  rec.files.add(path.relative(ROOT, file).replace(/\\/g, "/"));
  out.set(s, rec);
}

function looksLikeCopy(s) {
  const t = s.trim();
  if (!t || !/[A-Za-z]{2,}/.test(t)) return false;
  if (/^(https?:|mailto:|tel:|\/|#|\.|@\/)/.test(t)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(t)) return false; // email
  if (/^--?[a-z]/.test(t)) return false; // css var / flag
  if (/^[a-z][a-zA-Z0-9]*([._:\-/][a-zA-Z0-9]+)*$/.test(t)) return false; // identifier/key
  if (/^[A-Z0-9_]+$/.test(t) && t.length <= 6) return false; // codes like GHS, USD
  if (/^[A-Z][A-Z0-9_]*_[A-Z0-9_]+$/.test(t)) return false; // CONST_CASE
  // tailwind-ish class lists
  if (/(^| )(flex|grid|text-|bg-|border|rounded|px-|py-|p-|m[xytblr]?-|w-|h-|gap-|items-|justify-|hover:|dark:|sm:|md:|lg:|absolute|relative|inline|block|hidden|tabular|size-|shrink|grow|transition|duration-|ring|shadow|opacity|font-|tracking|leading|overflow|z-|top-|left-|right-|bottom-|inset|min-|max-|space-|pointer|cursor|select-|sr-only|truncate|whitespace|underline|uppercase)/.test(t) && !/[.!?]$/.test(t)) return false;
  if (/^[a-z]+(-[a-z0-9]+)+$/.test(t)) return false; // kebab
  if (/^\d/.test(t) && !/[A-Za-z]{3,}/.test(t)) return false;
  if (/^(M|m)[\d.\s,-]+/.test(t) && /\d/.test(t) && !/ [a-z]{3,}/.test(t)) return false; // svg path
  if (/^[A-Z][a-z]+$/.test(t)) return true; // Single capitalised word
  if (/ /.test(t)) return true;
  if (/^[A-Z]/.test(t)) return true;
  return false;
}

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return "";
}

function templateOf(node) {
  // TemplateExpression -> "head{0}mid{1}tail"
  let s = node.head.text;
  node.templateSpans.forEach((sp, i) => {
    s += `{${i}}` + sp.literal.text;
  });
  return s;
}

function shouldSkipByContext(node) {
  const p = node.parent;
  // Import/export specifiers
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  // type literals
  if (ts.isLiteralTypeNode(p)) return true;
  // property names
  if (ts.isPropertyAssignment(p) && p.name === node) return true;
  if (ts.isPropertyAssignment(p)) {
    const nm = p.name && (p.name.text || p.name.escapedText);
    if (nm && SKIP_PROPS.has(String(nm))) return true;
  }
  if (ts.isJsxAttribute(p) || (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent))) {
    const attr = ts.isJsxAttribute(p) ? p : p.parent;
    const nm = attr.name.getText();
    if (SKIP_ATTRS.has(nm)) return true;
  }
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true;
  // walk up to see if we're inside a skipped call or className attr
  let cur = node;
  for (let i = 0; i < 6 && cur.parent; i++) {
    const q = cur.parent;
    if (ts.isCallExpression(q) && q.arguments.includes(cur)) {
      const c = calleeName(q.expression);
      if (SKIP_CALLS.has(c)) return true;
    }
    if (ts.isJsxAttribute(q)) {
      const nm = q.name.getText();
      if (nm === "className" || nm === "style" || nm === "href") return true;
    }
    cur = q;
  }
  return false;
}

function visitFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function visit(node) {
    if (ts.isJsxText(node)) {
      if (/[A-Za-z]{2,}/.test(node.text)) add(node.text, file);
    } else if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      // mixed text + expression template
      const kids = node.children;
      const hasEl = kids.some((k) => ts.isJsxElement(k) || ts.isJsxSelfClosingElement(k) || ts.isJsxFragment(k));
      const hasExpr = kids.some((k) => ts.isJsxExpression(k) && k.expression);
      const hasText = kids.some((k) => ts.isJsxText(k) && /[A-Za-z]{2,}/.test(k.text));
      if (!hasEl && hasExpr && hasText) {
        let s = "";
        let i = 0;
        for (const k of kids) {
          if (ts.isJsxText(k)) s += k.text;
          else if (ts.isJsxExpression(k) && k.expression) {
            const e = k.expression;
            if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) s += e.text;
            else s += `{${i++}}`;
          }
        }
        add(s, file);
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (looksLikeCopy(node.text) && !shouldSkipByContext(node)) add(node.text, file);
    } else if (ts.isTemplateExpression(node)) {
      const tpl = templateOf(node);
      const lits = tpl.replace(/\{\d+\}/g, "");
      if (/[A-Za-z]{2,}/.test(lits) && / /.test(tpl) && !shouldSkipByContext(node) && looksLikeCopy(lits.trim() || "x")) add(tpl, file);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const q = p.replace(/\\/g, "/");
      if (q.includes("/lib/i18n") || q.includes("/app/sandbox")) continue;
      walk(p);
    } else if (/\.(tsx?|ts)$/.test(e.name) && !e.name.endsWith(".d.ts")) visitFile(p);
  }
}
walk(ROOT);

const catalog = buildCatalog("fr");
const gaps = [...out.values()].filter((r) => !catalog.has(r.s));
console.log(`${out.size} strings found · ${out.size - gaps.length} translated · ${gaps.length} not in catalog
`);
const byFile = new Map<string, string[]>();
for (const g of gaps) {
  const f = [...g.files][0];
  byFile.set(f, [...(byFile.get(f) ?? []), g.s]);
}
const all = process.argv.includes("--all");
let shown = 0;
for (const [file, list] of [...byFile].sort()) {
  if (!all && shown >= 40) break;
  console.log(file);
  for (const s of list) {
    if (!all && shown >= 40) break;
    console.log("  " + JSON.stringify(s));
    shown++;
  }
}
if (!all && gaps.length > shown) console.log(`
… ${gaps.length - shown} more (run with --all)`);
