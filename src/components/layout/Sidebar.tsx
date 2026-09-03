"use client";

/**
 * Shell navigation. Layout and interaction reworked from the Halepulse
 * dashboard sidebar; the item set is supplied by `getNavigation(actor)` so it
 * is always role-derived (section 12.3) rather than static.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Receipt,
  Send,
  Ship,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Admin Portal carries its own mark so the two shells are never mistaken for
  // one another (section 12.1).
  const BrandIcon = shell === "admin" ? ShieldCheck : Landmark;
  const brandLabel = shell === "admin" ? "NIBS Admin" : "NIBS";

  return (
    /* Only width and transform animate. `transition-all` also animated colour,
       opacity and layout properties, so any incidental style recalculation on a
       parent re-render read as a flicker. */
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--surface)] transition-[width,transform] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:relative lg:z-20 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ width: collapsed ? 68 : 260 }}
    >
      {/* Header */}
      <div
        className={`flex h-14 flex-shrink-0 items-center border-b border-border ${
          collapsed ? "justify-center px-0" : "justify-between px-4"
        }`}
      >
        {collapsed ? (
          <SimpleTooltip content="Expand sidebar" side="right" sideOffset={12}>
            <button
              onClick={onToggleCollapse}
              className="group/logo relative hidden size-7 flex-shrink-0 items-center justify-center lg:flex cursor-pointer"
              aria-label="Expand sidebar"
            >
              <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 group-hover/logo:opacity-0">
                <BrandIcon size={16} strokeWidth={2.1} className="text-foreground" />
              </span>
              <PanelLeftOpen
                size={16}
                strokeWidth={1.7}
                className="relative text-foreground opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100"
              />
            </button>
          </SimpleTooltip>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <BrandIcon size={18} strokeWidth={2.1} className="flex-shrink-0 text-foreground" />
              <span className="truncate text-[14px] leading-tight tracking-tight text-foreground">
                {brandLabel}
              </span>
            </div>
            <SimpleTooltip content="Collapse sidebar" side="bottom">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleCollapse}
                className="hidden lg:flex"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={16} strokeWidth={1.9} />
              </Button>
            </SimpleTooltip>
          </>
        )}

        <Button variant="ghost" size="icon-sm" onClick={onClose} className="lg:hidden" aria-label="Close menu">
          <X size={16} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <div className="flex flex-col gap-0.5">
          {groups.map((grp, gi) => (
            <div key={grp.name ?? `g-${gi}`} className="flex flex-col gap-0.5">
              {collapsed
                ? gi > 0 && <div className="mx-2 my-2 h-px bg-border" aria-hidden />
                : grp.name && (
                    <span
                      className={`mb-2 px-2.5 text-[11px] uppercase tracking-wider text-muted-foreground/70 ${
                        gi > 0 ? "mt-3" : ""
                      }`}
                    >
                      {grp.name}
                    </span>
                  )}

              {grp.items.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? Wallet;
                const active = isItemActive(item, pathname, items);

                if (collapsed) {
                  return (
                    <SimpleTooltip
                      key={item.key}
                      content={item.label}
                      side="right"
                      sideOffset={12}
                    >
                      <div className="w-full">
                        <Link
                          href={item.path}
                          onClick={onClose}
                          aria-label={item.label}
                          className={`relative flex h-9 w-full items-center justify-center rounded-md transition-all duration-150 ${
                            active
                              ? "bg-[var(--active-bg)] text-[var(--active-border)]"
                              : "surface-interactive text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {active && (
                            <span className="absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-r-full bg-[var(--active-border)]" />
                          )}
                          <Icon size={18} strokeWidth={1.7} />
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
                    className={`relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition-all duration-200 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
                    <span className="leading-none">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
