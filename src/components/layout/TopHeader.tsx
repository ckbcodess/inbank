"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Eye,
  Globe,
  EyeOff,
  Layers,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings,
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
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { switchTheme } from "@/lib/theme-transition";

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

/** The language picker: a native select, so choosing works inside the menu without closing it or opening a second popup. */
function LanguageSelect() {
  const { language, setLanguage, languages, t } = useTranslation();
  return (
    <div className="relative">
      <select
        aria-label={t("header.language", "Language")}
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-field-border bg-field py-0 pl-3 pr-8 text-[15px] text-foreground outline-none transition-colors duration-hover hover:bg-field-hover focus-visible:border-field-border-focus focus-visible:bg-field-focus"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
      <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

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
    <div role="radiogroup" aria-label="Theme" className="flex items-center gap-0.5 rounded-full bg-foreground/5 dark:bg-foreground/8 p-0.5">
      {THEME_CHOICES.map(({ value, label, Icon }) => (
        <SimpleTooltip key={value} content={label} side="top" delay={0}>
          <button
              type="button"
            role="radio"
            aria-checked={active === value}
            aria-label={label}
            onClick={() => choose(value)}
            className={`flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-hover ${
              active === value ? "bg-chip-selected text-chip-selected-foreground shadow-xs dark:bg-background" : "text-chip-foreground hover:text-chip-selected-foreground"
            }`}
          >
            <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </SimpleTooltip>
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
            <DropdownMenuTrigger className="h-8 gap-1.5 rounded-lg border border-dashed border-warning/50 bg-warning/10 px-2.5 text-warning-text hover:bg-warning/20 hover:text-warning-text dark:hover:text-warning-text text-[12px] font-medium transition-colors flex items-center outline-none cursor-pointer whitespace-nowrap shrink-0">
              <Layers size={13} strokeWidth={2} className="shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Dev Mode</span>
              {devState.section && (
                <span className="rounded bg-warning/20 px-1 py-0.5 text-[10px] shrink-0">
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
              <EyeOff size={16} strokeWidth={1.9} className="text-warning-text" />
            )}
          </Button>
        </SimpleTooltip>

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
          <DropdownMenuContent align="end" sideOffset={6} className="w-[280px] p-1.5 rounded-2xl bg-menu/97! dark:bg-menu/92! backdrop-blur-3xl">
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
              onClick={() => router.push("/settings")}
              className="flex items-center justify-between py-2 px-3 text-[13.5px] cursor-pointer rounded-lg text-foreground hover:bg-muted/70 transition-colors"
            >
              <span className="flex items-center gap-3">
                <Settings size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.settings", "Settings")}</span>
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

            <DropdownMenuSeparator className="my-1" />

            {/* Theme: Light / Dark / System */}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex items-center gap-3 text-[13.5px] text-foreground">
                <SunMoon size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.theme", "Theme")}</span>
              </span>
              <ThemeSegmented />
            </div>

            {/* Language */}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex items-center gap-3 text-[13.5px] text-foreground">
                <Globe size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{t("header.language", "Language")}</span>
              </span>
              <LanguageSelect />
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

            <DropdownMenuSeparator className="my-1" />

            <div className="px-3 py-2 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-3">
                {[
                  { key: "privacy", label: t("header.privacy", "Privacy"), href: "https://www.gcbbank.com.gh/privacy-policy" },
                  { key: "terms", label: t("header.terms", "Terms"), href: "https://www.gcbbank.com.gh" },
                  { key: "copyright", label: t("header.copyright", "Copyright"), href: "https://www.gcbbank.com.gh" },
                ].map((l) => (
                  <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer" className="transition-colors duration-hover hover:text-foreground">
                    {l.label}
                  </a>
                ))}
              </span>
            </div>
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
