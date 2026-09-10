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

export const RECENT_AVATARS: RecentPayeeAvatar[] = [
  // Bank payees
  {
    id: "rec-b1",
    name: "Kwame Boateng",
    bank: "GCB Bank",
    acct: "0231 4455 8890",
    initials: "KB",
    rail: "bank",
    colorBg: "#f1f8f9",
  },
  {
    id: "rec-b2",
    name: "Abena Osei",
    bank: "Stanbic Bank",
    acct: "1089 3322 1100",
    initials: "AO",
    rail: "bank",
    colorBg: "#ebe8de",
  },
  {
    id: "rec-b3",
    name: "Accra Fabrics Ltd",
    bank: "Ecobank Ghana",
    acct: "0142 8899 0011",
    initials: "AF",
    rail: "bank",
    colorBg: "#e0eedd",
  },
  {
    id: "rec-b4",
    name: "Jane Asare",
    bank: "Access Bank",
    acct: "0102 3344 5566",
    initials: "JA",
    rail: "bank",
    colorBg: "#f5ebf7",
  },
  {
    id: "rec-b5",
    name: "Kumasi Supplies",
    bank: "GCB Bank",
    acct: "0788 3312 0091",
    initials: "KS",
    rail: "bank",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-b6",
    name: "Volta Machinery",
    bank: "Absa Ghana",
    acct: "0661 9902 3345",
    initials: "VM",
    rail: "bank",
    colorBg: "#dbeafe",
  },

  // Mobile Wallet payees
  {
    id: "rec-w1",
    name: "Ama Serwaa Mensah",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "wallet",
    colorBg: "#fef9c3",
  },
  {
    id: "rec-w2",
    name: "Yaw Mensah",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "YM",
    rail: "wallet",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-w3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "wallet",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-w4",
    name: "Yaa Asantewaa",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "YA",
    rail: "wallet",
    colorBg: "#f5ebf7",
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
    colorBg: "#f1f8f9",
  },
  {
    id: "rec-px2",
    name: "Ama Serwaa",
    bank: "Proxy ID",
    acct: "@ama.serwaa",
    initials: "AS",
    rail: "proxy",
    subtitle: "@ama.serwaa",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-px3",
    name: "Kofi Appiah",
    bank: "Ghana Card",
    acct: "GHA-71829304-1",
    initials: "KA",
    rail: "proxy",
    subtitle: "Ghana Card ID",
    colorBg: "#fef9c3",
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
    colorBg: "#fef9c3",
  },
  {
    id: "rec-air-1",
    name: "Ama Serwaa",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "airtime",
    subtitle: "0244 123 456",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-air-2",
    name: "Kwame Boateng",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "KB",
    rail: "airtime",
    subtitle: "0201 987 654",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-air-3",
    name: "Kofi Boateng",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "KB",
    rail: "airtime",
    subtitle: "0277 456 789",
    colorBg: "#e0eedd",
  },
  {
    id: "rec-air-4",
    name: "Yaa Asantewaa",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "YA",
    rail: "airtime",
    subtitle: "0559 220 118",
    colorBg: "#f5ebf7",
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
    colorBg: "#fef9c3",
  },
  {
    id: "rec-dat-1",
    name: "Home Router (MiFi)",
    bank: "Telecel Cash",
    acct: "0201 987 654",
    initials: "HR",
    rail: "data",
    subtitle: "0201 987 654",
    colorBg: "#fee2e2",
  },
  {
    id: "rec-dat-2",
    name: "Office iPad",
    bank: "AT Money",
    acct: "0277 456 789",
    initials: "IP",
    rail: "data",
    subtitle: "0277 456 789",
    colorBg: "#e0eedd",
  },
  {
    id: "rec-dat-3",
    name: "Ama Serwaa",
    bank: "MTN Mobile Money",
    acct: "0244 123 456",
    initials: "AS",
    rail: "data",
    subtitle: "0244 123 456",
    colorBg: "#dbeafe",
  },
  {
    id: "rec-dat-4",
    name: "Kwame Boateng",
    bank: "MTN Mobile Money",
    acct: "0559 220 118",
    initials: "KB",
    rail: "data",
    subtitle: "0559 220 118",
    colorBg: "#f5ebf7",
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

  return (
    <div className={`relative w-full ${className}`}>
      {/* Contextual Left Chevron with gradient mask */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-5 pl-0 bg-gradient-to-r from-card via-card/70 to-transparent dark:from-card dark:via-card/40 dark:to-transparent pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border/80 bg-card/90 dark:bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer -ml-1"
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
      >
        {children}
      </div>

      {/* Contextual Right Smart Chevron with gradient mask */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-6 pr-0 bg-gradient-to-l from-card via-card/70 to-transparent dark:from-card dark:via-card/40 dark:to-transparent pointer-events-none animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => scroll("right")}
            className="pointer-events-auto flex size-8 items-center justify-center rounded-full border border-border/80 bg-card/90 dark:bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer -mr-1"
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
              className="flex size-14 items-center justify-center rounded-full text-[14px] font-semibold text-[#111] transition-transform group-hover:scale-105 shadow-xs border border-black/5 dark:border-white/10"
              style={{ backgroundColor: item.colorBg || "#f1f8f9" }}
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
