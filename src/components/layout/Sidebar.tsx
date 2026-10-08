"use client";

/**
 * Shell navigation. Layout and interaction reworked from the Halepulse
 * dashboard sidebar; the item set is supplied by `getNavigation(actor)` so it
 * is always role-derived (section 12.3) rather than static.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Home,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Receipt,
  Send,
  Settings,
  Shield,
  Ship,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { GCBLogo } from "@/components/ui/GCBLogo";
import type { NavItem } from "@/lib/navigation";
import type { Shell } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  BarChart3,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Send,
  UserCheck,
  Ship,
  CheckCircle2,
  Users,
  AlertTriangle,
  Building2,
  TrendingUp,
  Percent,
  Receipt,
  Home,
  Shield,
  LineChart,
  Landmark,
  Sparkles,
  LayoutGrid,
  MapPin,
  Settings,
};

/**
 * Groups rendered as a collapsible dropdown (expanded sidebar only). The group's
 * `group` name doubles as its visible header label; the icon fronts the header.
 */
const DROPDOWN_GROUPS: Record<string, { icon: string }> = {
  "More Services": { icon: "LayoutGrid" },
};

interface SidebarProps {
  items: NavItem[];
  shell: Shell;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Longest-matching-prefix active resolver: keeps a parent like /payments from
 * lighting up when a sibling owns a deeper subtree.
 */
function isItemActive(item: NavItem, pathname: string, all: NavItem[]): boolean {
  if (pathname === item.path) return true;
  const isPrefix = (p: string) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`);
  if (!isPrefix(item.path)) return false;
  const longest = all.reduce(
    (best, c) => (isPrefix(c.path) && c.path.length > best.length ? c.path : best),
    "",
  );
  return item.path === longest;
}

interface Group {
  name: string | null;
  items: NavItem[];
}

function groupItems(items: NavItem[]): Group[] {
  const order: (string | null)[] = [];
  const map = new Map<string | null, NavItem[]>();
  for (const item of items) {
    const key = item.group ?? null;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }
  return order.map((name) => ({ name, items: map.get(name)! }));
}

export default function Sidebar({
  items,
  shell,
  isOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const groups = groupItems(items);
  // Explicit open/closed overrides for dropdown groups; absent means "auto"
  // (open when a child is active).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  // True while the width is animating after a toggle. The pointer is still over the sidebar when it was just
  // collapsed by clicking inside it, and the "expand" hint must not flash in during that closing animation.
  const [resizing, setResizing] = useState(false);
  // After a toggle the browser can leave the hover flag stale (the sidebar shrinks out from under a still pointer
  // and no mouseleave arrives), which brought the expand icon in once the animation ended. So hover only counts
  // again after the pointer actually moves over the sidebar.
  const [pointerSeen, setPointerSeen] = useState(true);
  const toggleCollapse = () => {
    setResizing(true);
    setPointerSeen(false);
    window.setTimeout(() => setResizing(false), 260);
    onToggleCollapse?.();
  };
  const showExpandHint = collapsed && isSidebarHovered && pointerSeen && !resizing;

  // A single nav link — shared by flat groups and dropdown children.
  const renderNavLink = (item: NavItem, indent = false) => {
    const Icon = ICON_MAP[item.icon] ?? Wallet;
    const active = isItemActive(item, pathname, items);
    const label = t(`nav.${item.key}`, item.label);

    // One markup for both states, so the icon never moves and the label is only clipped as the sidebar narrows
    // (the old collapsed branch was a different element, so everything popped at the first frame).
    return (
      <SimpleTooltip
        key={item.key}
        content={label}
        side="right"
        sideOffset={12}
        disabled={!collapsed}
        triggerClassName="flex w-full"
      >
        <Link
          href={item.path}
          onClick={onClose}
          aria-label={collapsed ? label : undefined}
          className={`relative flex h-9 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-[13px] font-medium transition duration-150 ${
            indent ? "ml-2.5 w-[calc(100%-0.625rem)]" : "w-full"
          } ${
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <Icon size={17} strokeWidth={active ? 2.1 : 1.8} className="shrink-0" />
          {/* A fixed max width (not min-w-0 truncation) so the ellipsis can't move while the sidebar animates. */}
          <span
            className={`max-w-[11rem] shrink-0 truncate leading-normal whitespace-nowrap transition-opacity duration-150 ${
              collapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            {label}
          </span>
        </Link>
      </SimpleTooltip>
    );
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Admin Portal carries its own mark (section 12.1), customer portal renders official GCB logo mark.
  const brandLabel = shell === "admin" ? "GCB Admin" : t("header.brand", "Internet Banking");

  return (
    /* Only width and transform animate. `transition-all` also animated colour,
       opacity and layout properties, so any incidental style recalculation on a
       parent re-render read as a flicker. */
    <aside
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseMove={() => !pointerSeen && setPointerSeen(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
      className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-[var(--surface)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform lg:relative lg:z-20 lg:shadow-none lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none lg:pointer-events-auto"
      }`}
      style={{ width: collapsed ? 56 : 224 }}
    >
      {/* Header: the same elements in both states. The mark stays put (it is the expand button when collapsed),
          and the brand name and collapse button are clipped by the header as the sidebar narrows. */}
      <div
        // Below sm the page card is edge to edge; from sm up it sits inside 12px (14px at lg) of padding and a 1px
        // border, so the header takes the same offset (in rem, like that padding) to put its divider on the same line as the top bar's.
        className="flex h-14 flex-shrink-0 items-center gap-2.5 overflow-hidden pl-3.5 pr-[0.768rem] sm:h-[calc(3.5rem+0.75rem+1px)] sm:pt-[calc(0.75rem+1px)] lg:h-[calc(3.5rem+0.875rem+1px)] lg:pt-[calc(0.875rem+1px)]"
      >
        <SimpleTooltip content="Expand sidebar" side="right" sideOffset={12} disabled={!collapsed}>
          <button
            type="button"
            onClick={collapsed ? toggleCollapse : undefined}
            tabIndex={collapsed ? 0 : -1}
            aria-label={collapsed ? "Expand sidebar" : brandLabel}
            className={`relative flex size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg text-muted-foreground transition-colors ${
              collapsed ? "cursor-pointer hover:bg-muted/70 hover:text-foreground" : "pointer-events-none"
            }`}
          >
            <span
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-in-out ${
                showExpandHint ? "opacity-0" : "opacity-100"
              }`}
            >
              {shell === "admin" ? (
                <ShieldCheck size={18} strokeWidth={2.1} className="text-primary" />
              ) : (
                <GCBLogo className="h-6 w-auto shrink-0" />
              )}
            </span>
            <span
              className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-in-out ${
                showExpandHint ? "opacity-100" : "opacity-0"
              }`}
            >
              <PanelLeftOpen className="size-[17.5px]" strokeWidth={1.8} />
            </span>
          </button>
        </SimpleTooltip>
        <span
          className={`min-w-0 max-w-[9rem] shrink-0 truncate text-[14px] font-medium leading-tight tracking-tight text-foreground transition-opacity duration-150 ${
            collapsed ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden={collapsed}
        >
          {brandLabel}
        </span>
        <button
          type="button"
          onClick={toggleCollapse}
          tabIndex={collapsed ? -1 : 0}
          className={`ml-auto hidden size-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,opacity] duration-150 hover:bg-muted/70 hover:text-foreground lg:flex ${
            collapsed ? "pointer-events-none opacity-0" : "cursor-pointer opacity-100"
          }`}
          aria-label="Collapse sidebar"
          aria-hidden={collapsed}
        >
          <PanelLeftClose className="size-[17.5px]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Navigation */}
      {/* The side padding is what centres the icons when collapsed (4rem wide): 0.768rem + the link's 0.625rem
          padding + half the 17px icon = 2rem, the middle of the sidebar. The header's pl-3.5 centres the mark on the
          same line. The root font is 14px, so these are rem values, not px. */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[0.768rem] py-2.5">
        <div className="flex flex-col gap-0.5">
          {groups.map((grp, gi) => {
            const hasActiveChild = grp.items.some((i) => isItemActive(i, pathname, items));
            const isDropdown =
              !collapsed && grp.name != null && grp.name in DROPDOWN_GROUPS;

            // Collapsible dropdown group (expanded sidebar only).
            if (isDropdown) {
              const name = grp.name as string;
              const DropIcon = ICON_MAP[DROPDOWN_GROUPS[name].icon] ?? LayoutGrid;
              const open = openGroups[name] ?? hasActiveChild;
              return (
                <div key={name} className={`flex flex-col gap-0.5 ${gi > 0 ? "mt-3" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setOpenGroups((p) => ({ ...p, [name]: !open }))}
                    aria-expanded={open}
                    className={`relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition duration-150 cursor-pointer hover:bg-muted/50 hover:text-foreground ${
                      hasActiveChild && !open ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <DropIcon size={17} strokeWidth={1.8} className="shrink-0" />
                    <span className="leading-normal whitespace-nowrap truncate">
                      {name === "More Services" ? t("nav.moreServices", name) : name}
                    </span>
                    <ChevronDown
                      size={15}
                      strokeWidth={1.9}
                      className={`ml-auto shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="flex flex-col gap-0.5">
                      {grp.items.map((item) => renderNavLink(item, true))}
                    </div>
                  )}
                </div>
              );
            }

            // Flat group — separated from the previous group by spacing (expanded)
            // or a divider (collapsed). No section title.
            return (
              <div
                key={grp.name ?? `g-${gi}`}
                className={`flex flex-col gap-0.5 ${gi > 0 ? "mt-3" : ""}`}
              >
                {grp.items.map((item) => renderNavLink(item))}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
