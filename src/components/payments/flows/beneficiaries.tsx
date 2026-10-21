"use client";

import { HorizontalScrollStrip } from "@/components/ui/horizontal-scroll-strip";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import React, { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";

export interface RecentPayeeAvatar {
  id: string;
  name: string;
  bank: string;
  acct: string;
  initials: string;
  rail: string;
  colorBg?: string;
  colorDarkBg?: string;
  colorDarkText?: string;
  billerId?: string;
  category?: string;
  country?: string;
  subtitle?: string;
}

const GROUP_AVATAR_TINTS = [
  "var(--avatar-teal)",
  "var(--avatar-sand)",
  "var(--avatar-green)",
  "var(--avatar-lilac)",
  "var(--avatar-blue)",
  "var(--avatar-pink)",
] as const;

/** A group's avatar fill: one of the shared pastel tokens, chosen from its id so a group keeps its colour everywhere. */
export function groupAvatarTint(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GROUP_AVATAR_TINTS[hash % GROUP_AVATAR_TINTS.length];
}

export const SINGLE_RECENT_AVATARS: RecentPayeeAvatar[] = [
  {
    id: "rec-s1",
    name: "Mum (Yaa Gyan)",
    bank: "MTN Mobile Money",
    acct: "0244 889 900",
    initials: "YG",
    rail: "wallet",
    colorBg: "var(--avatar-teal)",
  },
  {
    id: "rec-s2",
    name: "ECG Electricity",
    bank: "ECG",
    acct: "P-992014",
    initials: "EC",
    rail: "bill",
    category: "Utilities",
    colorBg: "var(--avatar-sand)",
  },
];

export function getSimulatedRecentAvatars(): RecentPayeeAvatar[] {
  if (typeof window === "undefined") return RECENT_AVATARS;
  try {
    const sessionRaw = window.localStorage.getItem("nibs-session");
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      const actorId = parsed?.state?.actor?.id;
      if (actorId === "u-clean") return [];
      if (actorId === "u-single") return SINGLE_RECENT_AVATARS;
    }
    const devRaw = window.localStorage.getItem("nibs-dev-user-simulation");
    if (devRaw) {
      const parsedDev = JSON.parse(devRaw);
      if (parsedDev?.state?.userType === "clean") return [];
      if (parsedDev?.state?.userType === "single") return SINGLE_RECENT_AVATARS;
    }
  } catch {
    // fallback
  }
  return RECENT_AVATARS;
}

export function useRecentAvatars(): RecentPayeeAvatar[] {
  const [avatars, setAvatars] = useState<RecentPayeeAvatar[]>(getSimulatedRecentAvatars);

  useEffect(() => {
    setAvatars(getSimulatedRecentAvatars());
    const handleStorage = () => setAvatars(getSimulatedRecentAvatars());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return avatars;
}

export const RECENT_AVATARS: RecentPayeeAvatar[] = [
  // Bank payees
  {
    id: "rec-b1",
    name: "Justice Oduro",
    bank: "GCB Bank",
    acct: "0231 4455 88901",
    initials: "JO",
    rail: "bank",
    colorBg: "var(--avatar-teal)",
  },
  {
    id: "rec-b2",
    name: "Abena Osei",
    bank: "Stanbic Bank",
    acct: "1089 3322 1100",
    initials: "AO",
    rail: "bank",
    colorBg: "var(--avatar-sand)",
  },
  {
    id: "rec-b3",
    name: "Accra Fabrics Ltd",
    bank: "Ecobank Ghana",
    acct: "0142 8899 0011",
    initials: "AF",
    rail: "bank",
    colorBg: "var(--avatar-green)",
  },
  {
    id: "rec-b4",
    name: "Jane Asare",
    bank: "Access Bank",
    acct: "0102 3344 5566",
    initials: "JA",
    rail: "bank",
    colorBg: "var(--avatar-lilac)",
  },
  {
    id: "rec-b5",
    name: "Kumasi Supplies",
    bank: "GCB Bank",
    acct: "0788 3312 00911",
    initials: "KS",
    rail: "bank",
    colorBg: "var(--avatar-yellow)",
  },
  {
    id: "rec-b6",
    name: "Volta Machinery",
    bank: "Absa Ghana",
    acct: "0661 9902 3345",
    initials: "VM",
    rail: "bank",
    colorBg: "var(--avatar-blue)",
  },

  // Mobile Wallet payees
  {
    id: "rec-w1",
    name: "Ransford Gyasi",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "wallet",
    colorBg: "var(--avatar-yellow)",
  },
  {
    id: "rec-w2",
    name: "Ishmael Gyan",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "IG",
    rail: "wallet",
    colorBg: "var(--avatar-red)",
  },
  {
    id: "rec-w3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "wallet",
    colorBg: "var(--avatar-blue)",
  },
  {
    id: "rec-w4",
    name: "Tsotsoo Mills",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "TM",
    rail: "wallet",
    colorBg: "var(--avatar-lilac)",
  },

  // Proxy payees
  {
    id: "rec-px1",
    name: "Kwame Boateng",
    bank: "Proxy ID",
    acct: "@kwame.b",
    initials: "KB",
    rail: "proxy",
    subtitle: "@kwame.b",
    colorBg: "var(--avatar-teal)",
  },
  {
    id: "rec-px2",
    name: "Ransford Gyasi",
    bank: "Proxy ID",
    acct: "@ama.serwaa",
    initials: "AS",
    rail: "proxy",
    subtitle: "@ama.serwaa",
    colorBg: "var(--avatar-blue)",
  },
  {
    id: "rec-px3",
    name: "Kofi Appiah",
    bank: "Ghana Card",
    acct: "GHA-718293041-1",
    initials: "KA",
    rail: "proxy",
    subtitle: "Ghana Card ID",
    colorBg: "var(--avatar-yellow)",
  },

  // Airtime payees
  {
    id: "rec-air-self",
    name: "My Phone (Self)",
    bank: "MTN Mobile Money",
    acct: "0244 123 821",
    initials: "ME",
    rail: "airtime",
    subtitle: "0244 123 821",
    colorBg: "var(--avatar-yellow)",
  },
  {
    id: "rec-air-1",
    name: "Ransford Gyasi",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "airtime",
    subtitle: "0244 123 456",
    colorBg: "var(--avatar-blue)",
  },
  {
    id: "rec-air-2",
    name: "Ishmael Gyan",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "IG",
    rail: "airtime",
    subtitle: "0201 987 654",
    colorBg: "var(--avatar-red)",
  },
  {
    id: "rec-air-3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "airtime",
    subtitle: "0277 456 789",
    colorBg: "var(--avatar-green)",
  },
  {
    id: "rec-air-4",
    name: "Tsotsoo Mills",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "TM",
    rail: "airtime",
    subtitle: "0559 220 118",
    colorBg: "var(--avatar-lilac)",
  },

  // Data Bundle payees
  {
    id: "rec-dat-self",
    name: "My Device (Self)",
    bank: "MTN Mobile Money",
    acct: "0244 123 821",
    initials: "ME",
    rail: "data",
    subtitle: "0244 123 821",
    colorBg: "var(--avatar-yellow)",
  },
  {
    id: "rec-dat-1",
    name: "Home Router (MiFi)",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "HR",
    rail: "data",
    subtitle: "0201 987 654",
    colorBg: "var(--avatar-red)",
  },
  {
    id: "rec-dat-2",
    name: "Office iPad",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "IP",
    rail: "data",
    subtitle: "0277 456 789",
    colorBg: "var(--avatar-green)",
  },
  {
    id: "rec-dat-3",
    name: "Ransford Gyasi",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "data",
    subtitle: "0244 123 456",
    colorBg: "var(--avatar-blue)",
  },
  {
    id: "rec-dat-4",
    name: "Tsotsoo Mills",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "TM",
    rail: "data",
    subtitle: "0559 220 118",
    colorBg: "var(--avatar-lilac)",
  },
];


/** What the strip and the picker need from a saved recipient: enough to show them, and to hand back to the flow. */
export interface StripRecipient {
  id: string;
  name: string;
  bank: string;
  acct: string;
  initials: string;
  subtitle?: string;
}

/** The most recipients the strip shows. More than this and a "See all" tile opens the full, searchable list. */
export const STRIP_LIMIT = 5;

/**
 * The saved recipients on a chooser screen: the first five as quick picks, and, once there are more than that, a
 * "See all" tile that opens a picker with search. Every chooser that offers saved recipients uses this, so the
 * strip never grows with the list.
 */
export function RailBeneficiaryStrip<T extends StripRecipient>({
  items,
  onSelect,
}: {
  items: T[];
  onSelect: (item: T) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!items || items.length === 0) return null;
  const shown = items.slice(0, STRIP_LIMIT);
  return (
    <>
      <HorizontalScrollStrip>
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group flex w-[84px] shrink-0 cursor-pointer flex-col items-center gap-2 text-center"
            title={`${item.name} (${item.subtitle || item.bank || item.acct})`}
          >
            <PayeeAvatar name={item.name} initials={item.initials} size="lg" />
            <div className="flex w-full flex-col px-0.5">
              <span className="w-full truncate text-[12px] font-medium text-foreground">{item.name}</span>
              <span className="w-full truncate text-[11px] text-muted-foreground">{item.subtitle || item.bank}</span>
            </div>
          </button>
        ))}
        {items.length > STRIP_LIMIT && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="group flex w-[84px] shrink-0 cursor-pointer flex-col items-center gap-2 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-dashed border-border bg-card text-foreground transition-colors duration-hover group-hover:bg-muted">
              <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="flex w-full flex-col px-0.5">
              <span className="text-[12px] font-medium text-foreground">See all</span>
              <span className="text-[11px] text-muted-foreground">
                <span className="tabular">{items.length}</span> <span>saved</span>
              </span>
            </div>
          </button>
        )}
      </HorizontalScrollStrip>
      <BeneficiaryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        items={items}
        onSelect={(item) => {
          setPickerOpen(false);
          onSelect(item);
        }}
      />
    </>
  );
}

/** Everyone saved for this payment, A to Z, with a search over name, bank and number. */
export function BeneficiaryPicker<T extends StripRecipient>({
  open,
  onOpenChange,
  items,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: T[];
  onSelect: (item: T) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");

  const rows = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (i) =>
        [i.name, i.bank, i.subtitle, i.acct].some((v) => v && v.toLowerCase().includes(q)) ||
        (digits.length > 0 && i.acct.replace(/\D/g, "").includes(digits)),
    );
  }, [items, q, digits]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
      title="Choose a recipient"
      size="md"
    >
      <div className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, bank or number"
          aria-label="Search recipients"
        />
        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">Nobody saved matches that. Clear the search to see everyone.</p>
        ) : (
          <div className="custom-scrollbar -mx-1 flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1">
            {rows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors duration-hover hover:bg-muted/50"
              >
                <PayeeAvatar name={item.name} initials={item.initials} size="md" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] text-foreground">{item.name}</span>
                  <span className="truncate text-[12px] text-muted-foreground">{item.subtitle || item.bank}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
