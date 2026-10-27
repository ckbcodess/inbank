"use client";

import { useState } from "react";
import { Bell, ChevronRight, Lock, SlidersHorizontal, User, X } from "@/components/ui/icons";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { maskMobile } from "@/lib/auth-shared";
import { useSession } from "@/lib/session-store";
import { closeSettings, showSettingsSection, useSettingsModal, type SettingsSection } from "@/lib/settings-modal";
import { cn } from "@/lib/utils";
import { AlertsPane, PreferencesPane, ProfilePane, SecurityPane, type SettingsData } from "./SettingsPanes";

/** Settings in one place: a modal beside a section list on desktop, a bottom sheet that drills in on phone. */

const GROUPS: { label: string; items: { id: SettingsSection; label: string; icon: typeof User }[] }[] = [
  {
    label: "You",
    items: [
      { id: "profile", label: "Profile", icon: User },
      { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Safety",
    items: [
      { id: "security", label: "Security", icon: Lock },
      { id: "alerts", label: "Alerts", icon: Bell },
    ],
  },
];

const SUMMARY: Record<Exclude<SettingsSection, "profile">, string> = {
  preferences: "Theme and language",
  security: "Password and sign-in",
  alerts: "SMS, email, statements",
};

export default function SettingsDialog() {
  const { actor } = useSession();
  const { open, section } = useSettingsModal();
  // What the customer has changed this session, over what the account already says. Held here so it survives
  // closing and reopening the modal.
  const [changes, setChanges] = useState<Partial<SettingsData>>({});

  if (!actor) return null;

  const data: SettingsData = {
    mobile: actor.phone,
    email: actor.email,
    address: "Plot 14, Senchi Street, Airport Residential Area, Accra",
    smsAlerts: true,
    emailReceipts: true,
    eStatements: true,
    timeout: "15",
    ...changes,
  };
  const update = (patch: Partial<SettingsData>) => setChanges((prev) => ({ ...prev, ...patch }));

  // Desktop always has a section open; on a phone no section means the list.
  const active: SettingsSection = section ?? "profile";
  const paneProps = { data, update, onBackToMenu: () => showSettingsSection("menu") };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSettings();
      }}
    >
      {/* `data-morph` hands size and position to the rule in globals.css, which eases between modal and sheet. */}
      <DialogContent showCloseButton={false} data-morph="" className="p-0">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            aria-label="Settings"
            className={cn(
              "custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6 sm:w-60 sm:flex-none sm:gap-6 sm:border-r sm:border-border/60 sm:bg-muted/30 sm:pt-6",
              section !== null && "max-sm:hidden",
            )}
          >
            <div className="flex h-12 items-center justify-between pl-3 sm:hidden">
              <h2 className="text-[18px] font-medium tracking-[var(--ls-heading)] text-foreground">Settings</h2>
              <DialogClose
                aria-label="Close settings"
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:text-foreground"
              >
                <X size={18} />
              </DialogClose>
            </div>

            {GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <span className="flex h-7 items-center px-3 text-[12px] text-muted-foreground">{group.label}</span>
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => showSettingsSection(id)}
                    aria-current={active === id ? "page" : undefined}
                    // On desktop the list is a tab strip styled like the sidebar: the active section is a solid amber pill.
                    className={cn(
                      "flex min-h-14 w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-2 text-left transition duration-150 hover:bg-muted/50 sm:h-8 sm:min-h-0 sm:gap-2 sm:rounded-lg sm:px-2 sm:py-0",
                      active === id
                        ? "sm:bg-primary sm:text-primary-foreground sm:hover:bg-primary"
                        : "sm:text-muted-foreground sm:hover:text-foreground",
                    )}
                  >
                    <Icon size={18} strokeWidth={1.8} className="shrink-0 text-muted-foreground sm:size-4 sm:text-current" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] text-foreground sm:text-[13px] sm:font-medium sm:text-current">{label}</span>
                      <span className="truncate text-[12px] text-muted-foreground sm:hidden">
                        {id === "profile" ? (
                          <span className="tabular">{`${actor.name} · ${maskMobile(data.mobile)}`}</span>
                        ) : (
                          SUMMARY[id]
                        )}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground sm:hidden" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}

          </nav>

          <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", section === null && "max-sm:hidden")}>
            <DialogClose
              aria-label="Close settings"
              className="absolute right-4 top-4 z-10 flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:text-foreground max-sm:hidden"
            >
              <X size={18} />
            </DialogClose>

            {active === "profile" && <ProfilePane key="profile" name={actor.name} {...paneProps} />}
            {active === "preferences" && <PreferencesPane key="preferences" {...paneProps} />}
            {active === "security" && <SecurityPane key="security" {...paneProps} />}
            {active === "alerts" && <AlertsPane key="alerts" {...paneProps} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
