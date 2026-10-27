// Builds src/components/ui/icons.tsx from the Material Symbols SVGs.
// The app keeps one vocabulary of icon names (the left column); the right column is the Material Symbols name.
// Run after changing the map or the weight: npx tsx scripts/gen-material-icons.mts
import fs from "node:fs";
import path from "node:path";

const WEIGHT = 400; // 100 to 700. Needs @material-symbols/svg-<weight>.
const STYLE = "rounded";
const EMBOLDEN = 0; // stroke added around each filled glyph, in viewBox units (of 960), to go heavier than the weight. 0 at weight 400, which is already close to the old 1.8px Lucide stroke.
const TRIM = 40; // viewBox units cropped off each side (of 960). Material glyphs sit in a wider margin than Lucide did, so this brings them back to the old visual size.

const MAP: Record<string, string> = {
  AlertCircle: "error",
  AlertTriangle: "warning",
  ArrowDownLeft: "south_west",
  ArrowDownRight: "south_east",
  ArrowDownToLine: "download",
  ArrowLeft: "arrow_back",
  ArrowLeftRight: "swap_horiz",
  ArrowRight: "arrow_forward",
  ArrowRightLeft: "swap_horiz",
  ArrowUp: "arrow_upward",
  ArrowUpDown: "swap_vert",
  ArrowUpRight: "north_east",
  Banknote: "payments",
  BarChart3: "bar_chart",
  Bell: "notifications",
  Bike: "pedal_bike",
  BookOpen: "menu_book",
  Briefcase: "work",
  Brush: "brush",
  Building2: "apartment",
  Calculator: "calculate",
  Calendar: "calendar_month",
  CalendarClock: "calendar_clock",
  Camera: "photo_camera",
  CameraOff: "no_photography",
  Car: "directions_car",
  Check: "check",
  CheckCheck: "done_all",
  CheckCircle2: "check_circle",
  ChevronDown: "keyboard_arrow_down",
  ChevronLeft: "chevron_left",
  ChevronRight: "chevron_right",
  ChevronsUpDown: "unfold_more",
  Church: "church",
  Circle: "circle",
  CircleDashed: "stroke_partial",
  CircleHelp: "help",
  CircleMinus: "do_not_disturb_on",
  ClipboardCheck: "assignment_turned_in",
  ClipboardList: "assignment",
  Clock: "schedule",
  Code: "code",
  Construction: "construction",
  Copy: "content_copy",
  CreditCard: "credit_card",
  Crosshair: "my_location",
  Download: "download",
  Droplets: "water_drop",
  ExternalLink: "open_in_new",
  Eye: "visibility",
  EyeOff: "visibility_off",
  FileCheck: "task",
  FileCheck2: "task",
  FileDown: "download",
  FileSearch: "find_in_page",
  FileSpreadsheet: "table_chart",
  FileText: "description",
  FileWarning: "report",
  Files: "file_copy",
  Filter: "filter_list",
  Fuel: "local_gas_station",
  Gauge: "speed",
  GitCompare: "compare_arrows",
  Globe: "language",
  GraduationCap: "school",
  HandCoins: "paid",
  HandHeart: "volunteer_activism",
  Heart: "favorite",
  History: "history",
  Home: "home",
  Inbox: "inbox",
  Info: "info",
  Key: "key",
  KeyRound: "vpn_key",
  Landmark: "account_balance",
  Laptop: "laptop_mac",
  Layers: "layers",
  LayoutDashboard: "dashboard",
  LayoutGrid: "grid_view",
  LineChart: "show_chart",
  Link2: "link",
  Lock: "lock",
  LogOut: "logout",
  Mail: "mail",
  MapPin: "location_on",
  Maximize2: "open_in_full",
  Menu: "menu",
  MessageSquareWarning: "feedback",
  Minimize2: "close_fullscreen",
  Minus: "remove",
  Monitor: "desktop_windows",
  Moon: "dark_mode",
  MoreHorizontal: "more_horiz",
  MoreVertical: "more_vert",
  MousePointerClick: "touch_app",
  Navigation: "navigation",
  Palette: "palette",
  PanelLeftClose: "left_panel_close",
  PanelLeftOpen: "left_panel_open",
  Paperclip: "attach_file",
  PartyPopper: "celebration",
  Pause: "pause",
  Pencil: "edit",
  Percent: "percent",
  Phone: "call",
  PhoneCall: "phone_in_talk",
  PieChart: "pie_chart",
  PiggyBank: "savings",
  Plane: "flight",
  Play: "play_arrow",
  Plus: "add",
  PlusCircle: "add_circle",
  QrCode: "qr_code_2",
  Radio: "radio",
  Receipt: "receipt",
  ReceiptText: "receipt_long",
  RefreshCw: "refresh",
  Repeat: "repeat",
  RotateCcw: "rotate_left",
  RotateCw: "rotate_right",
  ScanFace: "face",
  ScanLine: "document_scanner",
  ScrollText: "article",
  Search: "search",
  SearchX: "search_off",
  Send: "send",
  Settings: "settings",
  Share: "share",
  Share2: "share",
  Shield: "shield",
  ShieldAlert: "gpp_bad",
  ShieldCheck: "verified_user",
  ShieldOff: "remove_moderator",
  ShieldPlus: "add_moderator",
  ShieldQuestion: "gpp_maybe",
  Ship: "directions_boat",
  ShoppingBag: "shopping_bag",
  ShoppingCart: "shopping_cart",
  Signal: "signal_cellular_alt",
  Sliders: "tune",
  SlidersHorizontal: "tune",
  Smartphone: "mobile",
  Sparkles: "stars_2",
  SquarePen: "edit_square",
  Store: "storefront",
  Sun: "light_mode",
  SunMoon: "contrast",
  Tag: "sell",
  Ticket: "confirmation_number",
  Timer: "timer",
  Trash2: "delete",
  TrendingDown: "trending_down",
  TrendingUp: "trending_up",
  TriangleAlert: "warning",
  Truck: "local_shipping",
  Tv: "tv",
  Umbrella: "umbrella",
  Undo2: "undo",
  Unlock: "lock_open",
  Upload: "upload",
  User: "person",
  UserCheck: "person_check",
  UserCog: "manage_accounts",
  UserPlus: "person_add",
  UserRound: "person",
  Users: "group",
  UtensilsCrossed: "restaurant",
  Wallet: "account_balance_wallet",
  Waves: "waves",
  Wifi: "wifi",
  X: "close",
  XCircle: "cancel",
  Zap: "bolt",
};

// Material's three-dot glyphs have dots about half the size Lucide's had, which read as too light on the hero's More tile.
// These redraw them as circles at the old size and spacing (centres 280 units apart, outer radius 77).
const dots = (horizontal: boolean) =>
  [-280, 0, 280]
    .map((o) => {
      const cx = horizontal ? 480 + o : 480;
      const cy = horizontal ? -480 : -480 + o;
      const r = 77 - EMBOLDEN / 2;
      return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
    })
    .join("");
const OVERRIDES: Record<string, string> = { MoreHorizontal: dots(true), MoreVertical: dots(false) };

const dir = path.join("node_modules", "@material-symbols", `svg-${WEIGHT}`, STYLE);
const missing: string[] = [];
const lines: string[] = [];

for (const [name, glyph] of Object.entries(MAP).sort(([a], [b]) => a.localeCompare(b))) {
  if (OVERRIDES[name]) {
    lines.push(`export const ${name} = glyph("${name}", "${OVERRIDES[name]}");`);
    continue;
  }
  const file = path.join(dir, `${glyph}.svg`);
  if (!fs.existsSync(file)) {
    missing.push(`${name} -> ${glyph}`);
    continue;
  }
  const d = /<path d="([^"]+)"/.exec(fs.readFileSync(file, "utf8"))?.[1];
  if (!d) {
    missing.push(`${name} -> ${glyph} (no path)`);
    continue;
  }
  lines.push(`export const ${name} = glyph("${name}", "${d}");`);
}

if (missing.length) {
  console.error("Missing Material Symbols:\n  " + missing.join("\n  "));
  process.exit(1);
}

const out = `// Generated by scripts/gen-material-icons.mts. Do not edit by hand: change the map there and run it again.
// Material Symbols (${STYLE}, weight ${WEIGHT}). The names are the app's own icon vocabulary; each one points at a Material glyph.
import type { FC, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  /** Kept so older call sites compile. Material glyphs are filled shapes, so this does nothing. */
  strokeWidth?: number | string;
};

export type Icon = FC<IconProps>;

function glyph(name: string, d: string): Icon {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Component: Icon = ({ size = 24, strokeWidth: _strokeWidth, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${TRIM} ${-960 + TRIM} ${960 - TRIM * 2} ${960 - TRIM * 2}"
      width={size}
      height={size}
      fill="currentColor"
${EMBOLDEN ? `      stroke="currentColor"
      strokeWidth={${EMBOLDEN}}
      strokeLinejoin="round"
` : ""}      aria-hidden="true"
      {...props}
    >
      <path d={d} />
    </svg>
  );
  Component.displayName = name;
  return Component;
}

${lines.join("\n")}
`;

fs.writeFileSync(path.join("src", "components", "ui", "icons.tsx"), out);
console.log(`Wrote ${lines.length} icons (${(out.length / 1024).toFixed(0)} KB source)`);
