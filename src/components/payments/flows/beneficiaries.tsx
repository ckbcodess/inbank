"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export const RECENT_AVATARS: RecentPayeeAvatar[] = [
  // Bank payees
  {
    id: "rec-b1",
    name: "Justice Oduro",
    bank: "GCB Bank",
    acct: "0231 4455 8890",
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
    acct: "0788 3312 0091",
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
    acct: "GHA-71829304-1",
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

export function HorizontalScrollStrip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => checkScroll());
    observer.observe(el);

    window.addEventListener("resize", checkScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(180, el.clientWidth * 0.65);
    el.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  // Fade the cards out under the chevrons with a mask, so the fade is transparency, not a colour to match.
  const fade = `linear-gradient(to right, transparent 0, #000 ${canScrollLeft ? 56 : 0}px, #000 calc(100% - ${canScrollRight ? 56 : 0}px), transparent 100%)`;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Contextual left chevron */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pl-0 pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur-md transition active:scale-95 cursor-pointer -ml-1"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Horizontally scrollable track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-none scroll-smooth"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {children}
      </div>

      {/* Contextual right chevron */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pr-0 pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("right")}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur-md transition active:scale-95 cursor-pointer -mr-1"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>
  );
}

export function RailBeneficiaryStrip({
  items,
  onSelect,
}: {
  title?: string;
  items: RecentPayeeAvatar[];
  onSelect: (item: RecentPayeeAvatar) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="pb-2">
      <HorizontalScrollStrip>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group flex flex-col items-center gap-2 w-[84px] shrink-0 text-center cursor-pointer"
            title={`Select ${item.name} (${item.subtitle || item.bank || item.acct})`}
          >
            <span
              className="flex size-14 items-center justify-center rounded-full text-[14px] font-semibold text-primary-foreground transition-[filter] duration-150 group-hover:saturate-150 group-hover:brightness-[0.97] dark:group-hover:saturate-200 dark:group-hover:brightness-[0.85] shadow-xs border border-black/5 dark:border-white/10"
              style={{ backgroundColor: item.colorBg || "var(--avatar-teal)" }}
            >
              {item.initials}
            </span>
            <div className="flex flex-col w-full px-0.5">
              <span className="text-[12px] font-medium text-foreground truncate w-full" title={item.name}>
                {item.name}
              </span>
              <span className="text-[11px] text-muted-foreground truncate w-full" title={item.subtitle || item.bank}>
                {item.subtitle || item.bank}
              </span>
            </div>
          </button>
        ))}
      </HorizontalScrollStrip>
    </div>
  );
}
