// Drafts a filled variant of each Lucide icon, for a designer to review and finish in Figma.
// Lucide only ships outlines. The draft fills each icon's closed outer shapes and cuts the details inside them out as
// negative space (the way Material's filled style works). Icons with nothing closed to fill (arrows, chevrons, X) keep
// their outline as the filled variant. Icons whose body is drawn with open paths are flagged for hand drawing.
//
//   npx tsx scripts/gen-lucide-filled.mts [folder of Lucide SVGs] [names.csv ...]
//
// The SVG folder defaults to lucide-static's `icons/`. The names come from the CSVs in docs/icons: the app's icons
// (lucide_component) and the GCB Figma pack's matched icons (lucide_icon, rows whose status is "matched"). Writes
// docs/icons/lucide-filled-drafts/*.svg, prototype/lucide-filled-review.html and docs/icons/lucide-parts.json (each
// icon's outline, bodies, cut-outs and remaining strokes, which the Figma swap reads).
import fs from "node:fs";
import path from "node:path";

const [srcDir = path.join("node_modules", "lucide-static", "icons"), ...csvArgs] = process.argv.slice(2);
const namesCsvs = csvArgs.length ? csvArgs : ["docs/icons/app-icons-to-lucide.csv", "docs/icons/gcb-pack-to-lucide.csv"];
const PARTS = path.join("docs", "icons", "lucide-parts.json");
const OUT = path.join("docs", "icons", "lucide-filled-drafts");
const REVIEW = path.join("prototype", "lucide-filled-review.html");
const TOL = 0.35; // grid units of slack when testing whether one shape sits inside another

// Where the geometry can't decide (reviewed by eye, 2026-11-20). Extend these as more icons are reviewed.
// Line icons whose arc nearly closes, so the rule mistakes them for a body. Their filled variant is the outline.
const LINE = new Set(["rotate-ccw", "rotate-cw", "rotate-ccw-clock", "refresh-cw", "paperclip", "utensils-crossed", "history", "rotate-3d", "search"]); // search: a filled lens reads as a disc
// Bodies drawn as open strokes (a slash breaks the outline, or the outline is two paths). A designer draws these.
const DRAW = new Set([
  "building-complex", "camera-off", "church", "eye-off", "file-check-corner", "fuel", "hand-heart",
  "scroll-text", "shield-off", "ship", "wallet",
]);

type Box = { x0: number; y0: number; x1: number; y1: number };
type El = { tag: string; attrs: Record<string, string>; raw: string; box: Box; closed: boolean; gap: number };

const kebab = (p: string) =>
  p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Za-z])(\d)/g, "$1-$2").toLowerCase();

function boxOf(pts: [number, number][]): Box {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// Points along an SVG arc, from the endpoint form (SVG spec F.6.5), so the box follows the curve's bulge.
function arcPoints(x1: number, y1: number, rx: number, ry: number, phi: number, fa: number, fs_: number, x2: number, y2: number) {
  if (!rx || !ry) return [[x2, y2]] as [number, number][];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const r = (phi * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = c * dx + s * dy, yp = -s * dx + c * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  const k = (fa === fs_ ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (k * rx * yp) / ry, cyp = (-k * ry * xp) / rx;
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs_ && dt > 0) dt -= 2 * Math.PI;
  if (fs_ && dt < 0) dt += 2 * Math.PI;
  const pts: [number, number][] = [];
  for (let i = 1; i <= 16; i++) {
    const t = t1 + (dt * i) / 16;
    pts.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c]);
  }
  return pts;
}

// Walks a path's commands. Returns every point that bounds it, and whether each subpath ends where it began.
function walkPath(d: string) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  const pts: [number, number][] = [];
  let closed = true, gap = 0, open = false;
  const num = () => parseFloat(toks[i++]);
  const flag = () => {
    // Arc flags may be packed ("011"); take one digit at a time.
    const t = toks[i];
    if (t.length > 1 && /^[01]/.test(t)) { toks[i] = t.slice(1); return +t[0]; }
    i++;
    return +t;
  };
  const endSub = (didClose: boolean) => {
    if (!open) return;
    const g = Math.hypot(x - sx, y - sy);
    if (!didClose && g > 0.05) { closed = false; gap = Math.max(gap, g); }
    open = false;
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        endSub(false);
        x = ox + num(); y = oy + num(); sx = x; sy = y; open = true; pts.push([x, y]);
        cmd = rel ? "l" : "L";
        break;
      case "L": x = ox + num(); y = oy + num(); pts.push([x, y]); break;
      case "H": x = (rel ? x : 0) + num(); pts.push([x, y]); break;
      case "V": y = (rel ? y : 0) + num(); pts.push([x, y]); break;
      case "C": {
        const a: [number, number] = [ox + num(), oy + num()], b: [number, number] = [ox + num(), oy + num()];
        x = ox + num(); y = oy + num(); pts.push(a, b, [x, y]); break;
      }
      case "S": case "Q": {
        const a: [number, number] = [ox + num(), oy + num()];
        x = ox + num(); y = oy + num(); pts.push(a, [x, y]); break;
      }
      case "T": x = ox + num(); y = oy + num(); pts.push([x, y]); break;
      case "A": {
        const rx = num(), ry = num(), phi = num(), fa = flag(), fs_ = flag();
        const nx = ox + num(), ny = oy + num();
        pts.push(...arcPoints(x, y, rx, ry, phi, fa, fs_, nx, ny));
        x = nx; y = ny; break;
      }
      case "Z": x = sx; y = sy; endSub(true); break;
      default: i++;
    }
  }
  endSub(false);
  return { pts, closed, gap };
}

function parse(svg: string): El[] {
  const els: El[] = [];
  for (const m of svg.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*?)\/?>/g)) {
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const n = (k: string, dflt = 0) => (attrs[k] === undefined ? dflt : parseFloat(attrs[k]));
    let box: Box, closed = true, gap = 0;
    if (m[1] === "circle" || m[1] === "ellipse") {
      const rx = m[1] === "circle" ? n("r") : n("rx"), ry = m[1] === "circle" ? n("r") : n("ry");
      box = { x0: n("cx") - rx, y0: n("cy") - ry, x1: n("cx") + rx, y1: n("cy") + ry };
    } else if (m[1] === "rect") {
      box = { x0: n("x"), y0: n("y"), x1: n("x") + n("width"), y1: n("y") + n("height") };
    } else if (m[1] === "line") {
      box = boxOf([[n("x1"), n("y1")], [n("x2"), n("y2")]]);
      closed = false; gap = Math.hypot(n("x2") - n("x1"), n("y2") - n("y1"));
    } else if (m[1] === "polyline" || m[1] === "polygon") {
      const v = (attrs.points ?? "").trim().split(/[\s,]+/).map(Number);
      const pts: [number, number][] = [];
      for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k], v[k + 1]]);
      box = boxOf(pts);
      if (m[1] === "polyline") {
        const a = pts[0], b = pts[pts.length - 1];
        gap = Math.hypot(a[0] - b[0], a[1] - b[1]);
        closed = gap < 0.05;
      }
    } else {
      const w = walkPath(attrs.d ?? "");
      box = boxOf(w.pts); closed = w.closed; gap = w.gap;
    }
    els.push({ tag: m[1], attrs, raw: m[0].replace(/\s*\/?>$/, " />"), box, closed, gap });
  }
  return els;
}

const inside = (a: Box, b: Box) => a.x0 >= b.x0 - TOL && a.y0 >= b.y0 - TOL && a.x1 <= b.x1 + TOL && a.y1 <= b.y1 + TOL;
const same = (a: Box, b: Box) => Math.abs(a.x0 - b.x0) + Math.abs(a.y0 - b.y0) + Math.abs(a.x1 - b.x1) + Math.abs(a.y1 - b.y1) < 0.01;
const area = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0);

type Kind = "filled" | "outline" | "draw";
// Splits a path into one path per subpath, so a closed part (an ear cup) can fill while an open part (the band) stays a
// stroke. Each subpath starts with an absolute move, so it draws the same on its own.
function splitSubpaths(svg: string) {
  return svg.replace(/<path d="([^"]+)"([^>]*?)\/>/g, (whole, d: string, rest: string) => {
    const parts = d.split(/(?=[Mm])/).filter((p) => p.trim());
    if (parts.length < 2) return whole;
    let x = 0, y = 0, sx = 0, sy = 0;
    const out: string[] = [];
    for (const p of parts) {
      const m = p.match(/^([Mm])\s*(-?(?:\d+\.?\d*|\.\d+))[\s,]*(-?(?:\d+\.?\d*|\.\d+))/)!;
      const ax = (m[1] === "m" ? x : 0) + parseFloat(m[2]), ay = (m[1] === "m" ? y : 0) + parseFloat(m[3]);
      // Implicit coordinates after a move are line-tos, relative if the move was.
      const tail = p.slice(m[0].length).replace(/^[\s,]*(?=-?[\d.])/, m[1] === "m" ? "l" : "L");
      const seg = `M${+ax.toFixed(3)} ${+ay.toFixed(3)}${tail}`;
      out.push(`<path d="${seg.trim()}"${rest}/>`);
      // Find where this subpath ends, to anchor the next relative move.
      const w = walkPath(seg);
      const last = w.pts[w.pts.length - 1] ?? [ax, ay];
      sx = ax; sy = ay;
      [x, y] = /[zZ]\s*$/.test(seg) ? [sx, sy] : last;
    }
    return out.join("\n  ");
  });
}

type Parts = { bodies: string[]; details: string[]; rest: string[] };
function draft(name: string, svg: string): { kind: Kind; svg: string; parts?: Parts } {
  if (LINE.has(name)) return { kind: "outline", svg };
  if (DRAW.has(name)) return { kind: "draw", svg };
  const els = parse(splitSubpaths(svg));
  const head = svg.match(/<svg[^>]*>/)![0];
  const closedEls = els.filter((e) => e.closed);
  // A body is a closed shape that no bigger closed shape contains.
  const bodies = closedEls.filter((e) => !closedEls.some((o) => o !== e && area(o.box) > area(e.box) && !same(o.box, e.box) && inside(e.box, o.box)));
  // A detail is anything else that sits inside a body. It becomes a cut-out.
  const details = els.filter((e) => !bodies.includes(e) && bodies.some((b) => inside(e.box, b.box)));
  const rest = els.filter((e) => !bodies.includes(e) && !details.includes(e));

  // Nothing closed to fill. If an open path is nearly closed and big, it's a body drawn as an open stroke: a designer draws it.
  if (!bodies.length) {
    const looksLikeBody = els.some((e) => {
      const w = e.box.x1 - e.box.x0, h = e.box.y1 - e.box.y0;
      return w >= 8 && h >= 8 && e.gap < 0.5 * Math.max(w, h);
    });
    return { kind: looksLikeBody ? "draw" : "outline", svg };
  }

  const id = `gcb-fill-${name}`;
  const mask = details.length
    ? `  <defs>\n    <mask id="${id}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28">\n      <rect x="-2" y="-2" width="28" height="28" fill="#fff" stroke="none" />\n      <g stroke="#000" fill="none">\n${details.map((e) => "        " + e.raw).join("\n")}\n      </g>\n    </mask>\n  </defs>\n`
    : "";
  const body = `  <g fill="currentColor"${details.length ? ` mask="url(#${id})"` : ""}>\n${bodies.map((e) => "    " + e.raw).join("\n")}\n  </g>\n`;
  const out = `${head}\n${mask}${body}${rest.map((e) => "  " + e.raw).join("\n")}${rest.length ? "\n" : ""}</svg>\n`;
  const raw = (list: El[]) => list.map((e) => e.raw);
  return { kind: "filled", svg: out, parts: { bodies: raw(bodies), details: raw(details), rest: raw(rest) } };
}

// The names to draft. A column named lucide_component is taken whole; lucide_icon only where status says matched (the
// pack's keyword guesses wait for review); a file with neither header is a plain list, one name per line.
const names = [
  ...new Set(
    namesCsvs.flatMap((file) => {
      const rows = fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map((l) => l.split(","));
      const head = rows[0];
      const comp = head.indexOf("lucide_component"), icon = head.indexOf("lucide_icon"), status = head.indexOf("status");
      if (comp >= 0) return rows.slice(1).map((r) => r[comp]).filter(Boolean).map(kebab);
      if (icon >= 0) return rows.slice(1).filter((r) => (r[status] ?? "").startsWith("matched")).map((r) => r[icon]).filter(Boolean);
      return rows.map((r) => r[0]).filter(Boolean);
    }),
  ),
].sort();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const results: { name: string; kind: Kind | "missing"; outline: string; filled: string }[] = [];
const partsOut: Record<string, { kind: Kind; outline: string[]; parts?: Parts }> = {};
for (const name of names) {
  const file = path.join(srcDir, `${name}.svg`);
  if (!fs.existsSync(file)) { results.push({ name, kind: "missing", outline: "", filled: "" }); continue; }
  const outline = fs.readFileSync(file, "utf8");
  const d = draft(name, outline);
  fs.writeFileSync(path.join(OUT, `${name}.svg`), d.svg);
  results.push({ name, kind: d.kind, outline, filled: d.svg });
  partsOut[name] = { kind: d.kind, outline: parse(outline).map((e) => e.raw), parts: d.parts };
}
fs.writeFileSync(PARTS, JSON.stringify(partsOut));

const count = (k: string) => results.filter((r) => r.kind === k).length;
const strip = (s: string) => s.replace(/ width="24" height="24"/, "").replace(/ xmlns="[^"]*"/, "");
const LABEL: Record<string, string> = { filled: "Filled draft", outline: "Same as outline", draw: "Draw by hand", missing: "Not in Lucide" };
const cards = results
  .map(
    (r) => `      <li data-kind="${r.kind}"><div class="pair"><span>${strip(r.outline)}</span><span>${r.kind === "draw" ? "" : strip(r.filled)}</span></div><p>${r.name}</p><p class="k">${LABEL[r.kind]}</p></li>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Lucide filled drafts</title>
<!-- Generated by scripts/gen-lucide-filled.mts. Do not edit by hand. -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root { --bg: #fff; --fg: #161616; --muted: #6b6b6b; --line: #ececec; --amber: #ffc423; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0f0f0f; --fg: #f2f2f2; --muted: #9a9a9a; --line: #262626; color-scheme: dark; } }
  :root[data-theme="dark"] { --bg: #0f0f0f; --fg: #f2f2f2; --muted: #9a9a9a; --line: #262626; color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--bg); color: var(--fg); font: 14px/1.5 "Open Sans", system-ui, sans-serif; padding: 48px 16px; }
  main { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }
  h1 { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
  .lead { color: var(--muted); max-width: 640px; margin-top: 8px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  button { font: inherit; font-size: 12px; color: var(--fg); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
  button[aria-pressed="true"] { background: var(--amber); border-color: var(--amber); color: #161616; }
  .sizes { margin-left: auto; }
  ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
  li { padding: 16px 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 4px; }
  li:hover { background: color-mix(in srgb, var(--fg) 4%, transparent); }
  .pair { display: flex; gap: 20px; margin-bottom: 8px; }
  .pair span { width: var(--s, 24px); height: var(--s, 24px); display: grid; place-items: center; }
  .pair svg { width: 100%; height: 100%; }
  p { font-size: 12px; overflow-wrap: anywhere; }
  .k { color: var(--muted); }
  li[data-kind="draw"] .k, li[data-kind="missing"] .k { color: var(--fg); text-decoration: underline; text-decoration-color: var(--amber); text-underline-offset: 3px; }
  li[hidden] { display: none; }
</style>
</head>
<body>
<main>
  <header>
    <h1>Lucide filled drafts</h1>
    <p class="lead">Each icon shows the Lucide outline, then the drafted filled version. ${count("filled")} were drafted automatically, ${count("outline")} have nothing to fill and keep the outline (as Material did for arrows and chevrons), ${count("draw")} need drawing by hand${count("missing") ? `, and ${count("missing")} are not in Lucide` : ""}.</p>
  </header>
  <div class="bar" role="toolbar">
    <button aria-pressed="true" data-f="all">All ${results.length}</button>
    <button aria-pressed="false" data-f="filled">Filled draft ${count("filled")}</button>
    <button aria-pressed="false" data-f="draw">Draw by hand ${count("draw")}</button>
    <button aria-pressed="false" data-f="outline">Same as outline ${count("outline")}</button>
    <span class="sizes bar"><button aria-pressed="false" data-s="16">16</button><button aria-pressed="false" data-s="20">20</button><button aria-pressed="true" data-s="24">24</button><button aria-pressed="false" data-s="32">32</button><button aria-pressed="false" data-s="64">64</button></span>
  </div>
  <ul>
${cards}
  </ul>
</main>
<script>
  const pick = (sel, btn) => document.querySelectorAll(sel).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  document.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
    pick("[data-f]", b);
    document.querySelectorAll("li").forEach((li) => (li.hidden = b.dataset.f !== "all" && li.dataset.kind !== b.dataset.f));
  }));
  document.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => {
    pick("[data-s]", b);
    document.documentElement.style.setProperty("--s", b.dataset.s + "px");
  }));
</script>
</body>
</html>
`;
fs.writeFileSync(REVIEW, html);
console.log(`${results.length} icons: ${count("filled")} filled drafts, ${count("outline")} same as outline, ${count("draw")} to draw by hand, ${count("missing")} missing`);
const flagged = results.filter((r) => r.kind === "draw" || r.kind === "missing").map((r) => r.name);
if (flagged.length) console.log("Draw by hand: " + flagged.join(", "));
