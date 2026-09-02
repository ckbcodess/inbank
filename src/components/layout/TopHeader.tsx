"use client";

import Link from "next/link";
import { Bell, Check, Eye, EyeOff, Layers, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { useDevState } from "@/components/providers/DevStateProvider";
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
import HeaderBreadcrumbs from "./HeaderBreadcrumbs";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials = actor.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-border px-6 sm:px-10 lg:px-14 xl:px-16">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onMenuToggle} className="lg:hidden" aria-label="Open menu">
          <Menu size={17} strokeWidth={1.9} />
        </Button>
        <HeaderBreadcrumbs />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dev Mode Dropdown Menu — hidden in capture mode so it stays out of Figma captures */}
        {devState && !captureMode && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 gap-1.5 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-800 dark:hover:text-amber-200 text-[12px] font-medium transition-colors flex items-center outline-none cursor-pointer">
              <Layers size={13} strokeWidth={2} />
              <span className="hidden sm:inline">Dev Mode</span>
              {devState.section && (
                <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[10px] font-mono">
                  {devState.section}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>Dev Mode States</span>
                {devState.section && <span className="font-mono">{devState.section}</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {devState.states.map((st) => (
                <DropdownMenuItem
                  key={st.id}
                  onClick={() => devState.onChange(st.id)}
                  className="flex items-center justify-between text-[13px] cursor-pointer"
                >
                  <span>{st.label}</span>
                  {devState.value === st.id && (
                    <Check size={14} strokeWidth={2} className="text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* FR-22 — notifications */}
        {actor.shell === "customer" && (
          <Button
            nativeButton={false}
            render={<Link href="/notifications" />}
            variant="ghost"
            size="icon-sm"
            className="relative"
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
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleAmountVisibility}
          aria-label={showAmounts ? "Hide cash amounts" : "Show cash amounts"}
          title={showAmounts ? "Hide cash amounts" : "Show cash amounts"}
          className="relative text-muted-foreground hover:text-foreground"
        >
          {mounted && showAmounts ? (
            <Eye size={16} strokeWidth={1.9} />
          ) : (
            <EyeOff size={16} strokeWidth={1.9} className="text-amber-600 dark:text-amber-400" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun size={16} strokeWidth={1.9} />
          ) : (
            <Moon size={16} strokeWidth={1.9} />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover-surface flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none"
            aria-label="Account menu"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] text-foreground">{actor.name}</span>
              <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[actor.role]}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-[13px] text-foreground">{actor.name}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">{actor.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="gap-2.5">
              <LogOut size={15} strokeWidth={1.8} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
