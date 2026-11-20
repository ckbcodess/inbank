// Builds src/components/ui/icons.tsx from the Lucide SVGs in lucide-static.
// The app keeps one vocabulary of icon names (the left column); the right column is the Lucide file name (icons/<name>.svg).
// Run after changing the map, the custom icons or the stroke: npx tsx scripts/gen-lucide-icons.mts
import fs from "node:fs";
import path from "node:path";

const STROKE = 1.8; // default stroke width, on Lucide's 24 grid. Call sites may pass strokeWidth (1.7 to 1.9; CONSTITUTION §7).

const MAP: Record<string, string> = {
  AlertCircle: "circle-exclamation-point",
  AlertTriangle: "triangle-exclamation-point",
  ArrowDownLeft: "arrow-down-left",
  ArrowDownRight: "arrow-down-right",
  ArrowDownToLine: "arrow-down-to-line",
  ArrowLeft: "arrow-left",
  ArrowLeftRight: "arrow-left-right",
  ArrowRight: "arrow-right",
  ArrowRightLeft: "arrow-right-left",
  ArrowUp: "arrow-up",
  ArrowUpDown: "arrow-up-down",
  ArrowUpRight: "arrow-up-right",
  Banknote: "banknote",
  BarChart3: "chart-column",
  Bell: "bell",
  Bike: "bike",
  BookOpen: "book-open",
  Briefcase: "briefcase",
  Brush: "brush",
  Building2: "building-complex",
  Calculator: "calculator",
  Calendar: "calendar",
  CalendarClock: "calendar-clock",
  Camera: "camera",
  CameraOff: "camera-off",
  Car: "car",
  Check: "check",
  CheckCheck: "check-check",
  CheckCircle2: "circle-check",
  ChevronDown: "chevron-down",
  ChevronLeft: "chevron-left",
  ChevronRight: "chevron-right",
  ChevronsUpDown: "chevrons-up-down",
  Church: "church",
  Circle: "circle",
  CircleDashed: "circle-dashed",
  CircleHelp: "circle-question-mark",
  CircleMinus: "circle-minus",
  ClipboardCheck: "clipboard-check",
  ClipboardList: "clipboard-list",
  Clock: "clock",
  Code: "code",
  Construction: "construction",
  Copy: "copy",
  CreditCard: "credit-card",
  Crosshair: "crosshair",
  Download: "download",
  Droplets: "droplets",
  ExternalLink: "external-link",
  Eye: "eye",
  EyeOff: "eye-off",
  FileCheck: "file-check",
  FileCheck2: "file-check-corner",
  FileDown: "file-down",
  FileSearch: "file-search",
  FileSpreadsheet: "file-spreadsheet",
  FileText: "file-text",
  FileWarning: "file-exclamation-point",
  Files: "files",
  Filter: "funnel",
  Fuel: "fuel",
  Gauge: "gauge",
  GitCompare: "git-compare",
  Globe: "globe",
  GraduationCap: "graduation-cap",
  HandCoins: "hand-coins",
  HandHeart: "hand-heart",
  Heart: "heart",
  History: "rotate-ccw-clock",
  Home: "house",
  IdCard: "id-card",
  Inbox: "inbox",
  Archive: "archive",
  Info: "info",
  Key: "key",
  KeyRound: "key-round",
  Landmark: "landmark",
  Laptop: "laptop",
  Layers: "layers",
  LayoutDashboard: "layout-dashboard",
  LayoutGrid: "layout-grid",
  Headset: "headset",
  LineChart: "chart-line",
  Link2: "link-2",
  Lock: "lock",
  LogOut: "log-out",
  Mail: "mail",
  MapPin: "map-pin",
  Maximize2: "maximize-2",
  Menu: "menu",
  MessageCircle: "message-circle",
  MessageSquareWarning: "message-square-exclamation-point",
  Minimize2: "minimize-2",
  Minus: "minus",
  Monitor: "monitor",
  Moon: "moon",
  MoreHorizontal: "ellipsis",
  MoreVertical: "ellipsis-vertical",
  MousePointerClick: "mouse-pointer-click",
  Navigation: "navigation",
  Palette: "palette",
  PanelLeftClose: "panel-left-close",
  PanelLeftOpen: "panel-left-open",
  Paperclip: "paperclip",
  PartyPopper: "party-popper",
  Pause: "pause",
  Pencil: "pencil",
  Percent: "percent",
  Phone: "phone",
  PhoneCall: "phone-call",
  PieChart: "chart-pie",
  PiggyBank: "piggy-bank",
  Plane: "plane",
  Play: "play",
  Plus: "plus",
  PlusCircle: "circle-plus",
  QrCode: "qr-code",
  Radio: "radio",
  Receipt: "receipt",
  ReceiptText: "receipt-text",
  RefreshCw: "refresh-cw",
  Repeat: "repeat",
  RotateCcw: "rotate-ccw",
  RotateCw: "rotate-cw",
  ScanFace: "scan-face",
  ScanLine: "scan-line",
  ScrollText: "scroll-text",
  Search: "search",
  SearchX: "search-x",
  Send: "send",
  Settings: "settings",
  Share: "share",
  Share2: "share-2",
  Shield: "shield",
  ShieldAlert: "shield-exclamation-point",
  ShieldCheck: "shield-check",
  ShieldOff: "shield-off",
  ShieldPlus: "shield-plus",
  ShieldQuestion: "shield-question-mark",
  Ship: "ship",
  ShoppingBag: "shopping-bag",
  ShoppingCart: "shopping-cart",
  Signal: "signal",
  Sliders: "sliders-vertical",
  SlidersHorizontal: "sliders-horizontal",
  Smartphone: "smartphone",
  Sparkles: "sparkles",
  SquarePen: "square-pen",
  Store: "store",
  Sun: "sun",
  SunMoon: "sun-moon",
  Tag: "tag",
  Ticket: "ticket",
  Timer: "timer",
  Trash2: "trash",
  TrendingDown: "trending-down",
  TrendingUp: "trending-up",
  TriangleAlert: "triangle-exclamation-point",
  Truck: "truck",
  Tv: "tv",
  Umbrella: "umbrella",
  Undo2: "undo-2",
  Unlock: "lock-open",
  Upload: "upload",
  User: "user",
  UserCheck: "user-check",
  UserCog: "user-cog",
  UserPlus: "user-plus",
  UserRound: "user-round",
  Users: "users",
  UtensilsCrossed: "utensils-crossed",
  Wallet: "wallet",
  Waves: "waves-horizontal",
  Wifi: "wifi",
  X: "x",
  XCircle: "circle-x",
  Zap: "zap",
};

// GCB additions for what Lucide doesn't have, drawn on Lucide's 24 grid with its rounded caps and joins.
// Each one needs the designer's sign-off and a matching component in the Figma icon pack.
const CUSTOM: Record<string, string> = {
  // A passport booklet: cover, globe, name line. Lucide has no passport icon (checked against 1.77.0).
  Passport: `<rect x="4" y="2" width="16" height="20" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M9 10h6" /><path d="M9 17h6" />`,
};

const dir = path.join("node_modules", "lucide-static", "icons");
const ATTRS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "points", "fill"]); // fill: a few icons (palette) draw solid dots
const missing: string[] = [];
const lines: string[] = [];

// The drawing elements of an SVG as [tag, attributes] pairs. Only geometry is kept: stroke, caps and joins come from the
// wrapper, so every icon draws the same way.
function nodes(svg: string): [string, Record<string, string>][] {
  const out: [string, Record<string, string>][] = [];
  for (const m of svg.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*?)\/?>/g)) {
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (!ATTRS.has(a[1])) throw new Error(`Unexpected attribute ${a[1]} in ${m[0]}`);
      attrs[a[1]] = a[2];
    }
    out.push([m[1], attrs]);
  }
  return out;
}

for (const name of [...new Set([...Object.keys(MAP), ...Object.keys(CUSTOM)])].sort((a, b) => a.localeCompare(b))) {
  let svg = CUSTOM[name];
  if (!svg) {
    const file = path.join(dir, `${MAP[name]}.svg`);
    if (!fs.existsSync(file)) {
      missing.push(`${name} -> ${MAP[name]}`);
      continue;
    }
    svg = fs.readFileSync(file, "utf8");
  }
  const n = nodes(svg);
  if (!n.length) {
    missing.push(`${name} (no shapes)`);
    continue;
  }
  lines.push(`export const ${name} = icon("${name}", ${JSON.stringify(n)});`);
}

if (missing.length) {
  console.error("Missing Lucide icons:\n  " + missing.join("\n  "));
  process.exit(1);
}

const version = JSON.parse(fs.readFileSync(path.join("node_modules", "lucide-static", "package.json"), "utf8")).version;
const out = `// Generated by scripts/gen-lucide-icons.mts. Do not edit by hand: change the map there and run it again.
// Lucide ${version} (ISC licence), plus GCB additions. The names are the app's own icon vocabulary; each one points at a Lucide icon.
import { createElement, type FC, type SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  strokeWidth?: number | string;
};

export type Icon = FC<IconProps>;

type IconNode = [string, Record<string, string>][];

function icon(name: string, node: IconNode): Icon {
  const Component: Icon = ({ size = 24, strokeWidth = ${STROKE}, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
  Component.displayName = name;
  return Component;
}

${lines.join("\n")}
`;

fs.writeFileSync(path.join("src", "components", "ui", "icons.tsx"), out);
console.log(`Wrote ${lines.length} icons from Lucide ${version} (${(out.length / 1024).toFixed(0)} KB source)`);
