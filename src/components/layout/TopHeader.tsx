"use client";

import Link from "next/link";
import { Bell, Eye, EyeOff, Layers, LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { useDevState } from "@/components/providers/DevStateProvider";
import { DevStateMenuItems } from "@/components/states/DevStateMenuItems";
import { useCaptureMode } from "@/lib/capture-mode";
import { NOTIFICATIONS } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, type Actor, type Profile } from "@/lib/roles";
import { SimpleTooltip } from "@/components/ui/tooltip";
import HeaderBreadcrumbs from "./HeaderBreadcrumbs";
import LanguageToggle from "./LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { switchTheme } from "@/lib/theme-transition";

interface TopHeaderProps {
  actor: Actor;
  /** Omitted entirely for the Admin Portal — internal staff never see it (12.2). */
  activeProfile?: Profile | null;
  onSelectProfile?: (p: Profile) => void;
  onMenuToggle: () => void;
  onSignOut: () => void;
}

export default function TopHeader({
  actor,
  activeProfile,
  onSelectProfile,
  onMenuToggle,
  onSignOut,
}: TopHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const { devState } = useDevState();
  const captureMode = useCaptureMode();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials = actor.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-border px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onMenuToggle} className="lg:hidden shrink-0" aria-label="Open menu">
          <Menu size={17} strokeWidth={1.9} />
        </Button>
        <Suspense fallback={null}><HeaderBreadcrumbs /></Suspense>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {/* Dev Mode Dropdown Menu — hidden in capture mode so it stays out of Figma captures */}
        {devState && !captureMode && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 gap-1.5 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-800 dark:hover:text-amber-200 text-[12px] font-medium transition-colors flex items-center outline-none cursor-pointer whitespace-nowrap shrink-0">
              <Layers size={13} strokeWidth={2} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Dev Mode</span>
              {devState.section && (
                <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[10px] font-mono shrink-0">
                  {devState.section}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DevStateMenuItems devState={devState} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* FR-22 — notifications */}
        {actor.shell === "customer" && (
          <SimpleTooltip
            content={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "Notifications"}
            side="bottom"
          >
            <Button
              nativeButton={false}
              render={<Link href="/notifications" />}
              variant="ghost"
              size="icon-sm"
              className="relative shrink-0"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
              }
            >
              <Bell size={16} strokeWidth={1.9} />
              {unreadCount > 0 && (
                <span
                  className="absolute right-1 top-1 size-2 rounded-full bg-destructive ring-2 ring-card"
                  aria-hidden
                />
              )}
            </Button>
          </SimpleTooltip>
        )}

        <SimpleTooltip
          content={showAmounts ? t("header.hideAmounts", "Hide cash amounts") : t("header.showAmounts", "Show cash amounts")}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleAmountVisibility}
            aria-label={showAmounts ? t("header.hideAmounts", "Hide cash amounts") : t("header.showAmounts", "Show cash amounts")}
            className="relative shrink-0 text-muted-foreground hover:text-foreground"
          >
            {mounted && showAmounts ? (
              <Eye size={16} strokeWidth={1.9} />
            ) : (
              <EyeOff size={16} strokeWidth={1.9} className="text-amber-600 dark:text-amber-400" />
            )}
          </Button>
        </SimpleTooltip>

        <SimpleTooltip
          content={resolvedTheme === "dark" ? t("header.themeLight", "Switch to light mode") : t("header.themeDark", "Switch to dark mode")}
          side="bottom"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const next = resolvedTheme === "dark" ? "light" : "dark";
              switchTheme(next, () => setTheme(next));
            }}
            aria-label={resolvedTheme === "dark" ? t("header.themeLight", "Switch to light mode") : t("header.themeDark", "Switch to dark mode")}
            className="shrink-0"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun size={16} strokeWidth={1.9} />
            ) : (
              <Moon size={16} strokeWidth={1.9} />
            )}
          </Button>
        </SimpleTooltip>

        {/* Global Language Selector */}
        <LanguageToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover-surface flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 outline-none cursor-pointer"
            aria-label="Account menu"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block whitespace-nowrap">
              <span className="block text-[13px] font-medium text-foreground whitespace-nowrap">{actor.name}</span>
              <span className="block text-[11px] text-muted-foreground whitespace-nowrap">{ROLE_LABEL[actor.role]}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-[13px] text-foreground">{actor.name}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">{actor.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/settings" className="flex items-center gap-2.5 w-full">
                  <Settings size={15} strokeWidth={1.8} />
                  {t("header.settings", "Settings")}
                </Link>
              }
            />
            <DropdownMenuItem onClick={onSignOut} className="gap-2.5">
              <LogOut size={15} strokeWidth={1.8} />
              {t("header.signOut", "Sign out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
