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
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Receipt,
  Send,
  Shield,
  Ship,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { GCBLogo } from "@/components/ui/GCBLogo";
import type { NavItem } from "@/lib/navigation";
import type { Shell } from "@/lib/roles";

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
  const groups = groupItems(items);
  // Explicit open/closed overrides for dropdown groups; absent means "auto"
  // (open when a child is active).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // A single nav link — shared by flat groups and dropdown children.
  const renderNavLink = (item: NavItem, indent = false) => {
    const Icon = ICON_MAP[item.icon] ?? Wallet;
    const active = isItemActive(item, pathname, items);

    if (collapsed) {
      return (
        <SimpleTooltip key={item.key} content={item.label} side="right" sideOffset={12}>
          <div className="w-full flex justify-center">
            <Link
              href={item.path}
              onClick={onClose}
              aria-label={item.label}
              className={`relative flex size-9 items-center justify-center rounded-lg transition-all duration-150 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "surface-interactive text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.1 : 1.8} />
            </Link>
          </div>
        </SimpleTooltip>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.path}
        onClick={onClose}
        className={`relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150 ${
          indent ? "ml-2.5" : ""
        } ${
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2.1 : 1.8} className="shrink-0" />
        <span className="leading-none whitespace-nowrap truncate">{item.label}</span>
      </Link>
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
  const brandLabel = shell === "admin" ? "GCB Admin" : "GCB Bank";

  return (
    /* Only width and transform animate. `transition-all` also animated colour,
       opacity and layout properties, so any incidental style recalculation on a
       parent re-render read as a flicker. */
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-[var(--surface)] transition-[width,transform] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:relative lg:z-20 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ width: collapsed ? 56 : 224 }}
    >
      {/* Header */}
      <div
        className={`flex h-14 flex-shrink-0 items-center border-b border-border ${
          collapsed ? "justify-center px-0" : "justify-between px-3.5"
        }`}
      >
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="group/logo relative hidden size-8 flex-shrink-0 items-center justify-center lg:flex cursor-pointer"
            aria-label="Expand sidebar"
          >
            <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover/logo:opacity-0">
              {shell === "admin" ? (
                <ShieldCheck size={18} strokeWidth={2.1} className="text-primary" />
              ) : (
                <GCBLogo className="h-6 w-auto shrink-0" showWordmark={false} />
              )}
            </span>
            <PanelLeftOpen
              size={16}
              strokeWidth={1.7}
              className="relative text-foreground opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100"
            />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              {shell === "admin" ? (
                <ShieldCheck size={20} strokeWidth={2.1} className="flex-shrink-0 text-primary" />
              ) : (
                <GCBLogo className="h-7 w-auto shrink-0" />
              )}
              <span className="truncate text-[15px] font-bold leading-tight tracking-tight text-foreground">
                {brandLabel}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              className="hidden lg:flex cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={16} strokeWidth={1.9} />
            </Button>
          </>
        )}

        <Button variant="ghost" size="icon-sm" onClick={onClose} className="lg:hidden" aria-label="Close menu">
          <X size={16} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-2.5 ${collapsed ? "px-1.5" : "px-2.5"}`}>
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
                    className={`relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer hover:bg-muted/50 hover:text-foreground ${
                      hasActiveChild && !open ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <DropIcon size={17} strokeWidth={1.8} className="shrink-0" />
                    <span className="leading-none whitespace-nowrap truncate">{name}</span>
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
                className={`flex flex-col gap-0.5 ${!collapsed && gi > 0 ? "mt-3" : ""}`}
              >
                {collapsed && gi > 0 && <div className="mx-1.5 my-2 h-px bg-border" aria-hidden />}
                {grp.items.map((item) => renderNavLink(item))}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
