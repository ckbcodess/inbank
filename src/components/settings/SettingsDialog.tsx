"use client";

import { useState } from "react";
import { Bell, Gauge, ChevronRight, Lock, Smartphone, Palette, User, UserPlus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/lib/session-store";
import { closeSettings, showSettingsSection, useSettingsModal, type SettingsSection } from "@/lib/settings-modal";
import { cn } from "@/lib/utils";
import { AlertsPane, DevicesPane, LimitsPane, PreferencesPane, ProfilePane, ReferralPane, SecurityPane, type SettingsData } from "./SettingsPanes";

/** Settings in one place: a modal beside a section list on desktop, a bottom sheet that drills in on phone. */

const GROUPS: { label: string; items: { id: SettingsSection; label: string; icon: typeof User }[] }[] = [
  {
    label: "You",
    items: [
      { id: "profile", label: "Profile", icon: User },
      { id: "preferences", label: "Appearance", icon: Palette },
    ],
  },
  {
    label: "Safety",
    items: [
      { id: "security", label: "Security", icon: Lock },
      { id: "devices", label: "Trusted devices", icon: Smartphone },
      { id: "limits", label: "Limits", icon: Gauge },
      { id: "alerts", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "More",
    items: [{ id: "referral", label: "Refer a Friend", icon: UserPlus }],
  },
];

/**
 * Every setting a person might look for, by the words they'd use. Search lists these one by one, each with the section
 * it lives in, so "email" finds Email (Profile) and Email receipts (Notifications) rather than just a section.
 */
const SETTINGS_INDEX: { label: string; section: SettingsSection; words?: string }[] = [
  { label: "Profile photo", section: "profile", words: "picture avatar image" },
  { label: "Full name", section: "profile" },
  { label: "Mobile number", section: "profile", words: "phone login" },
  { label: "Email", section: "profile", words: "address" },
  { label: "Theme", section: "preferences", words: "dark light mode appearance" },
  { label: "Backdrop", section: "preferences", words: "dashboard colour color hero theme green blue orange amber yellow" },
  { label: "Language", section: "preferences", words: "english french spanish chinese" },
  { label: "Password", section: "security", words: "change reset" },
  { label: "Auto log out", section: "security", words: "timeout session inactivity" },
  { label: "Trusted devices", section: "devices", words: "remember code phone computer skip" },
  { label: "Bank transfers limit", section: "limits", words: "daily gcb other banks" },
  { label: "Mobile money limit", section: "limits", words: "daily wallet airtime data" },
  { label: "Bills limit", section: "limits", words: "daily utilities tv school fees" },
  { label: "Outside Ghana limit", section: "limits", words: "daily papss swift international" },
  { label: "SMS alerts", section: "alerts", words: "text debit credit" },
  { label: "Email receipts", section: "alerts", words: "payment" },
  { label: "E-statements", section: "alerts", words: "statement monthly email" },
  { label: "Referral alerts", section: "alerts", words: "friend joined" },
  { label: "Your referral link", section: "referral", words: "invite share whatsapp friend" },
  { label: "Your referral code", section: "referral", words: "invite friend" },
  { label: "Your referrals", section: "referral", words: "friends joined signed up" },
];

const SECTION_ITEMS = GROUPS.flatMap((g) => g.items);


export default function SettingsDialog() {
  const { actor } = useSession();
  const { open, section } = useSettingsModal();
  // What the customer has changed this session, over what the account already says. Held here so it survives
  // closing and reopening the modal.
  const [changes, setChanges] = useState<Partial<SettingsData>>({});
  const [query, setQuery] = useState("");
  // The section on screen while Settings is open, held through the closing animation.
  const [held, setHeld] = useState<SettingsSection | null>(section);
  if (open && section !== held) setHeld(section);
  // The one search result picked, so only it shows as selected (several results can share a section).
  const [picked, setPicked] = useState<string | null>(null);

  if (!actor) return null;

  const q = query.trim().toLowerCase();
  const results = q
    ? [
        // A section's own name first, then the settings inside every section.
        ...SECTION_ITEMS.filter((i) => i.label.toLowerCase().includes(q)).map((i) => ({ label: i.label, section: i.id, isSection: true })),
        ...SETTINGS_INDEX.filter((e) => `${e.label} ${e.words ?? ""}`.toLowerCase().includes(q)).map((e) => ({ ...e, isSection: false })),
      ]
    : [];

  const data: SettingsData = {
    mobile: actor.phone,
    email: actor.email,
    smsAlerts: true,
    emailReceipts: true,
    eStatements: true,
    referralAlerts: true,
    timeout: "15",
    ...changes,
  };
  const update = (patch: Partial<SettingsData>) => setChanges((prev) => ({ ...prev, ...patch }));

  // Desktop always has a section open; on a phone no section means the list.
  // Closing clears the URL before the exit animation ends; keep showing what was open so it doesn't flash to Profile.
  const shown = open ? section : held;
  const active: SettingsSection = shown ?? "profile";
  const paneProps = { data, update, onBackToMenu: () => showSettingsSection("menu") };

  return (
    <>
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
              shown !== null && "max-sm:hidden",
            )}
          >
            <div className="flex h-12 items-center justify-between pl-3 pr-2 sm:hidden">
              <h2 className="text-h3 font-medium tracking-[var(--ls-heading)] text-foreground">Settings</h2>
              <DialogClose render={<Button variant="ghost" size="md" aria-label="Close settings" />}>
                <X size={20} />
              </DialogClose>
            </div>

            <SearchField value={query} onChange={(v) => { setQuery(v); setPicked(null); }} placeholder="Search settings" className="flex-none" />

            {q ? (
              results.length === 0 ? (
                <p className="px-3 text-body leading-relaxed text-muted-foreground">{`Nothing matches “${query.trim()}”.`}</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {results.map((r) => {
                    const item = SECTION_ITEMS.find((i) => i.id === r.section)!;
                    const Icon = item.icon;
                    return (
                      <button
                        key={`${r.section}-${r.label}`}
                        type="button"
                        onClick={() => {
                          setPicked(`${r.section}-${r.label}`);
                          showSettingsSection(r.section);
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left transition duration-hover hover:bg-muted/50",
                          picked === `${r.section}-${r.label}` && "bg-muted/50",
                        )}
                      >
                        <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-body text-foreground">{r.label}</span>
                          {r.isSection ? null : <span className="text-caption text-muted-foreground">{item.label}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : null}

            {q ? null : GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <span className="flex h-7 items-center px-3 text-caption text-muted-foreground">{group.label}</span>
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => showSettingsSection(id)}
                    aria-current={active === id ? "page" : undefined}
                    // On desktop the list is a tab strip styled like the sidebar: the active section is a solid amber pill.
                    className={cn(
                      "flex min-h-12 w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-2 text-left transition duration-hover hover:bg-muted/50 sm:h-8 sm:min-h-0 sm:gap-2 sm:rounded-lg sm:px-2 sm:py-0",
                      active === id
                        ? "sm:bg-primary sm:text-primary-foreground sm:hover:bg-primary"
                        : "sm:text-muted-foreground sm:hover:text-foreground",
                    )}
                  >
                    <Icon size={18} strokeWidth={1.8} className="shrink-0 text-muted-foreground sm:size-4 sm:text-current" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-body text-foreground sm:font-medium sm:text-current">{label}</span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground sm:hidden" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ))}

          </nav>

          <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", shown === null && "max-sm:hidden")}>
            {/* The header row holds the close button alone, on its own line above the page title. Desktop only: the phone sheet has its own. */}
            <div className="flex shrink-0 justify-end px-3 pt-3 max-sm:hidden">
              <DialogClose render={<Button variant="ghost" size="md" aria-label="Close settings" />}>
                <X size={20} />
              </DialogClose>
            </div>

            {active === "profile" && <ProfilePane key="profile" name={actor.name} {...paneProps} />}
            {active === "preferences" && <PreferencesPane key="preferences" {...paneProps} />}
            {active === "security" && <SecurityPane key="security" {...paneProps} />}
            {active === "devices" && <DevicesPane key="devices" {...paneProps} />}
            {active === "alerts" && <AlertsPane key="alerts" {...paneProps} />}
            {active === "limits" && <LimitsPane key="limits" {...paneProps} />}
            {active === "referral" && <ReferralPane key="referral" {...paneProps} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
