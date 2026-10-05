"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  SunMoon,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { useDevState } from "@/components/providers/DevStateProvider";
import { DevStateMenuItems } from "@/components/states/DevStateMenuItems";
import { useCaptureMode } from "@/lib/capture-mode";
import { NOTIFICATIONS } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, type Actor } from "@/lib/roles";
import { SimpleTooltip } from "@/components/ui/tooltip";
import HeaderBreadcrumbs from "./HeaderBreadcrumbs";
import LanguageToggle from "./LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { switchTheme, toggleTheme } from "@/lib/theme-transition";

interface TopHeaderProps {
  actor: Actor;
  onMenuToggle: () => void;
  onSignOut: () => void;
}

const THEME_CHOICES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/** Three-way theme switch. Sits in a plain div, not a menu item, so choosing doesn't close the menu. */
function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? (theme ?? "light") : "light";

  function choose(value: (typeof THEME_CHOICES)[number]["value"]) {
    const target = value === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    switchTheme(target, () => setTheme(value));
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
      {THEME_CHOICES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={active === value}
          aria-label={label}
          onClick={() => choose(value)}
          className={`flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-hover ${
            active === value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export default function TopHeader({
  actor,
  onMenuToggle,
  onSignOut,
}: TopHeaderProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const { devState } = useDevState();
  const captureMode = useCaptureMode();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [logoutOpen, setLogoutOpen] = useState(false);

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
                <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[10px] shrink-0">
                  {devState.section}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[80vh] overflow-y-auto">
              <DevStateMenuItems devState={devState} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Global FX Header Ticker */}

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
            onClick={() => toggleTheme(setTheme)}
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
            {/* Customers get the avatar alone (the name is in the menu and the greeting, and a full name
                pinned to every page leaks on shared screens). Staff need to see who and in what role. */}
            {actor.shell === "admin" && (
              <span className="hidden text-left leading-tight sm:block whitespace-nowrap">
                <span className="block text-[13px] font-medium text-foreground whitespace-nowrap">{actor.name}</span>
                <span className="block text-[11px] text-muted-foreground whitespace-nowrap">{ROLE_LABEL[actor.role]}</span>
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-[260px] p-1.5 rounded-2xl">
            {/* Header: Avatar beside Name & Email */}
            <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted border border-border/80 text-foreground font-medium text-[15px] shadow-2xs">
                {initials}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14.5px] font-medium text-foreground tracking-[-0.01em]">{actor.name}</span>
                <span className="truncate text-[12px] text-muted-foreground">{actor.email}</span>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1" />

            {/* Core Navigation Links */}
            <DropdownMenuItem
              onClick={() => router.push(actor.shell === "customer" ? "/settings?tab=profile" : "/settings")}
              className="flex items-center justify-between py-2 px-3 text-[13.5px] cursor-pointer rounded-lg text-foreground hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-3">
                <User size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.profile", "Profile")}</span>
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push(actor.shell === "customer" ? "/notifications" : "/settings?tab=notifications")}
              className="flex items-center justify-between py-2 px-3 text-[13.5px] cursor-pointer rounded-lg text-foreground hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Bell size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.notifications", "Notifications")}</span>
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push(actor.shell === "customer" ? "/settings?tab=security" : "/settings?tab=security")}
              className="flex items-center justify-between py-2 px-3 text-[13.5px] cursor-pointer rounded-lg text-foreground hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.security", "Security")}</span>
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => window.open("https://www.gcbbank.com.gh/privacy-policy", "_blank")}
              className="flex items-center justify-between py-2 px-3 text-[13.5px] cursor-pointer rounded-lg text-foreground hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Lock size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.privacy", "Privacy")}</span>
              </span>
              <ExternalLink size={14} className="text-muted-foreground/70" strokeWidth={1.8} />
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            {/* Theme: Light / Dark / System */}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex items-center gap-3 text-[13.5px] text-foreground">
                <SunMoon size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.theme", "Theme")}</span>
              </span>
              <ThemeSegmented />
            </div>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={() => setLogoutOpen(true)}
              className="flex items-center justify-between py-2 px-3 text-[13.5px] cursor-pointer rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <span className="flex items-center gap-3">
                <LogOut size={16} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                <span>{t("header.signOut", "Log out")}</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("header.signOutConfirmTitle", "Log out?")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {t("header.signOutConfirmBody", "You’ll need to log in again to see your accounts.")}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setLogoutOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setLogoutOpen(false);
                onSignOut();
              }}
            >
              {t("header.signOut", "Log out")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
