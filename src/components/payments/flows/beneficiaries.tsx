"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { rankBeneficiaries, useBeneficiariesStore, type BeneficiaryRecord } from "@/lib/beneficiaries-store";
import { BILLERS } from "@/lib/mock-data";
import { ChevronLeft, ChevronRight, Contact, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { operatorFromName } from "@/lib/operators";
import { Modal } from "@/components/ui/dialog";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

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
  /** The saved record behind this avatar, and how it has been used (what the pickers rank and show). */
  benId?: string;
  pinned?: boolean;
  lastPaidAt?: string;
  lastAmount?: number;
  payCount?: number;
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

/** Initials for an avatar: the first letters of the first two words, ignoring anything in brackets. */
function initialsOf(name: string): string {
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "")).toUpperCase();
}

/** The catalogue biller a saved biller refers to, found by name, so the bill flow opens on the right one. */
function findBillerId(name?: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  return BILLERS.find((b) => {
    const bn = b.name.toLowerCase();
    return bn === n || bn.includes(n) || n.includes(bn);
  })?.id;
}

/**
 * The saved beneficiaries as quick-pick avatars, one list for every flow. A saved number can be paid as airtime
 * or as data, and an ECG or government biller also has its own rail, so those records give more than one avatar.
 */
export function beneficiariesToAvatars(list: BeneficiaryRecord[]): RecentPayeeAvatar[] {
  const out: RecentPayeeAvatar[] = [];
  for (const b of list) {
    const base = {
      name: b.name,
      initials: initialsOf(b.name),
      colorBg: groupAvatarTint(b.id),
      benId: b.id,
      pinned: b.pinned,
      lastPaidAt: b.lastPaidAt,
      lastAmount: b.lastAmount,
      payCount: b.payCount,
    };
    switch (b.transactionType) {
      case "bank":
        out.push({ ...base, id: b.id, bank: b.bankName || "Bank", acct: b.accountNumber || "", rail: "bank" });
        break;
      case "wallet": {
        // One saved mobile number can be sent money, airtime or data
        const common = { ...base, bank: b.network || "Mobile Money", acct: b.phoneNumber || "" };
        out.push(
          { ...common, id: b.id, rail: "wallet" },
          { ...common, id: `${b.id}-airtime`, rail: "airtime", subtitle: b.phoneNumber },
          { ...common, id: `${b.id}-data`, rail: "data", subtitle: b.phoneNumber },
        );
        break;
      }
      case "proxy":
        out.push({ ...base, id: b.id, bank: "Proxy ID", acct: b.proxyId || "", rail: "proxy", subtitle: b.proxyId });
        break;
      case "airtime": {
        const common = { ...base, bank: b.network || "Mobile Money", acct: b.phoneNumber || "", subtitle: b.phoneNumber };
        out.push({ ...common, id: b.id, rail: "airtime" }, { ...common, id: `${b.id}-data`, rail: "data" });
        break;
      }
      case "bill": {
        const ref = b.billerReference || "";
        const common = { ...base, bank: b.billerName || "Biller", acct: ref, subtitle: ref ? `Ref: ${ref}` : undefined };
        out.push({ ...common, id: b.id, rail: "bill", billerId: findBillerId(b.billerName), category: b.billerCategory });
        if (/ecg/i.test(b.billerName ?? "")) out.push({ ...common, id: `${b.id}-ecg`, rail: "ecg" });
        if (b.billerCategory === "Government Services") out.push({ ...common, id: `${b.id}-gov`, rail: "ghanagov" });
        break;
      }
      case "papss":
      case "swift":
        out.push({
          ...base,
          id: b.id,
          bank: b.bankName || "",
          acct: b.accountNumber || "",
          rail: b.transactionType,
          country: b.country,
          subtitle: [b.currency, b.country].filter(Boolean).join(" \u00b7 "),
        });
        break;
    }
  }
  return out;
}

/** The quick-pick list for the current customer: the saved beneficiaries, pinned first, then most recently paid. */
export function useRecentAvatars(): RecentPayeeAvatar[] {
  const list = useBeneficiariesStore((s) => s.beneficiaries);
  return useMemo(() => beneficiariesToAvatars(rankBeneficiaries(list)), [list]);
}

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

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", or the date once it is a while back. */
export function agoLabel(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STRIP_LIMIT = 5;

/**
 * The strip: the five people most likely to be paid next (the list arrives ranked: pinned, then most recently
 * paid), and, once there are more than that, a "See all" tile that opens the full picker. Used by every flow
 * that picks a saved recipient.
 */
export function RailBeneficiaryStrip<T extends RecentPayeeAvatar>({
  items,
  onSelect,
}: {
  title?: string;
  items: T[];
  onSelect: (item: T) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!items || items.length === 0) return null;
  const shown = items.slice(0, STRIP_LIMIT);
  return (
    <div className="pb-2">
      <HorizontalScrollStrip>
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group flex flex-col items-center gap-2 w-[84px] shrink-0 text-center cursor-pointer"
            title={`Select ${item.name} (${item.subtitle || item.bank || item.acct})`}
          >
            <span
              className="relative flex size-14 items-center justify-center rounded-full text-[14px] font-medium text-primary-foreground transition-[filter] duration-150 group-hover:saturate-150 group-hover:brightness-[0.97] dark:group-hover:saturate-200 dark:group-hover:brightness-[0.85] shadow-xs border border-black/5 dark:border-white/10"
              style={{ backgroundColor: item.colorBg || "var(--avatar-teal)" }}
            >
              {item.initials}
              {item.pinned && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border border-border bg-card text-foreground">
                  <Star size={11} strokeWidth={1.8} className="fill-current" aria-label="Pinned" />
                </span>
              )}
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
        {items.length > STRIP_LIMIT && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="group flex flex-col items-center gap-2 w-[84px] shrink-0 text-center cursor-pointer"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-border bg-card text-foreground transition-colors duration-150 group-hover:bg-muted">
              <Search size={18} strokeWidth={1.8} />
            </span>
            <div className="flex flex-col w-full px-0.5">
              <span className="text-[12px] font-medium text-foreground">See all</span>
              <span className="text-[11px] text-muted-foreground tabular">{items.length} saved</span>
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
    </div>
  );
}

/**
 * Every saved recipient for the current flow, with search. Pinned people sit first, then the ones paid most
 * recently, then everyone else A to Z. Each row says when and how much you last paid them, and the star
 * pins or unpins (a pin keeps someone on the strip, whatever else happens).
 */
export function BeneficiaryPicker<T extends RecentPayeeAvatar>({
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
  const listRef = useRef<HTMLDivElement>(null);
  // Fade the list out at whichever edge has more to scroll to, so it is clear there is more
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const updateEdges = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setEdges({ top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 });
  }, []);
  const togglePinned = useBeneficiariesStore((s) => s.togglePinned);
  const { formatMoney } = useAmountVisibility();

  const q = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (q) {
      const hits = items.filter((i) =>
        [i.name, i.bank, i.acct, i.subtitle].some((v) => v && v.toLowerCase().includes(q)),
      );
      return [{ label: "", rows: hits }];
    }
    const pinned = items.filter((i) => i.pinned);
    const rest = items.filter((i) => !i.pinned);
    const recent = rest.filter((i) => i.lastPaidAt).slice(0, 5);
    const recentIds = new Set(recent.map((i) => i.id));
    const others = rest.filter((i) => !recentIds.has(i.id)).sort((a, b) => a.name.localeCompare(b.name));
    const out = [
      { label: "Pinned", rows: pinned },
      { label: "Recent", rows: recent },
      { label: "Everyone else", rows: others },
    ].filter((s) => s.rows.length > 0);
    // One group needs no heading
    return out.length === 1 ? [{ label: "", rows: out[0].rows }] : out;
  }, [items, q]);

  // A new search starts from the top
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
    updateEdges();
  }, [q, open, updateEdges]);

  const fade = `linear-gradient(to bottom, transparent 0, #000 ${edges.top ? 20 : 0}px, #000 calc(100% - ${edges.bottom ? 28 : 0}px), transparent 100%)`;

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
      <div className="flex flex-col gap-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, bank or number"
          aria-label="Search recipients"
        />
        {sections.every((s) => s.rows.length === 0) ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            No one saved matches &ldquo;{query.trim()}&rdquo;. Clear the search to see everyone.
          </p>
        ) : (
          <div
            ref={listRef}
            onScroll={updateEdges}
            className="custom-scrollbar -mx-1 flex max-h-[55vh] flex-col gap-4 overflow-y-auto overscroll-contain px-1"
            style={{ maskImage: fade, WebkitMaskImage: fade }}
          >
            {sections.map((section) => (
              <div key={section.label || "all"} className="flex flex-col gap-1">
                {section.label && (
                  <p className="sticky top-0 z-10 bg-modal px-2 py-1 text-[12px] text-muted-foreground">{section.label}</p>
                )}
                {section.rows.map((item) => (
                  <div key={item.id} className="flex items-center rounded-xl hover:bg-muted/50">
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl p-2 text-left"
                    >
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-medium text-primary-foreground"
                        style={{ backgroundColor: item.colorBg || "var(--avatar-teal)" }}
                      >
                        {item.initials}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[14px] text-foreground">{item.name}</span>
                        <span className="truncate text-[12px] text-muted-foreground">
                          {item.subtitle || item.bank}
                        </span>
                        {item.lastPaidAt && (
                          <span className="truncate text-[12px] text-muted-foreground">
                            Last paid{item.lastAmount ? ` ${formatMoney(item.lastAmount)}` : ""} · {agoLabel(item.lastPaidAt)}
                          </span>
                        )}
                      </span>
                    </button>
                    {item.benId && (
                      <button
                        type="button"
                        onClick={() => togglePinned(item.benId!)}
                        aria-pressed={!!item.pinned}
                        aria-label={item.pinned ? `Unpin ${item.name}` : `Pin ${item.name}`}
                        title={item.pinned ? "Unpin" : "Pin to the top"}
                        className="mr-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      >
                        <Star size={16} strokeWidth={1.7} className={item.pinned ? "fill-current text-foreground" : ""} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

const SUGGEST_LIMIT = 5;

/**
 * Saved recipients for a recipient field. A contacts button sits at the end of the field (hidden when there is
 * nobody to pick) and opens the full picker. On top of that, a quiet type-ahead appears under the field once the
 * person has typed something that matches a saved recipient (by name, bank or number); it never opens on a bare
 * tap, and it steps aside for a whole number, so entering new details is never in its way. Picking someone
 * calls `onSelect`; the parent fills the form from them.
 *
 * `children` is a render function: put `endAdornment` at the end of the field.
 */
export function SavedRecipientSuggest<T extends RecentPayeeAvatar>({
  items,
  query,
  onSelect,
  children,
}: {
  items: T[];
  /** What the person has typed in the field so far. */
  query: string;
  onSelect: (item: T) => void;
  children: (field: { endAdornment: React.ReactNode; overlayAdornment: React.ReactNode }) => React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const matches = useMemo(() => {
    if (!q) return items;
    return items.filter((i) => {
      if (i.name.toLowerCase().includes(q) || i.bank.toLowerCase().includes(q) || i.acct.toLowerCase().includes(q)) return true;
      return digits.length > 0 && i.acct.replace(/\D/g, "").includes(digits);
    });
  }, [items, q, digits]);

  // A whole number typed in is new details (or a saved number already matched), so step aside
  const typedWholeNumber = digits.length >= 10;
  const openButton =
    items.length > 0 ? (
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Choose from saved recipients"
        title="Saved recipients"
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        <Contact size={18} strokeWidth={1.7} />
      </button>
    ) : null;
  const showList = focused && q.length > 0 && !typedWholeNumber && matches.length > 0;
  const shown = matches.slice(0, SUGGEST_LIMIT);

  return (
    <div
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {children({
        endAdornment: openButton,
        overlayAdornment: openButton ? (
          <span className="absolute right-1 top-1/2 flex -translate-y-1/2">{openButton}</span>
        ) : null,
      })}
      {showList && (
        <div
          // Keep focus in the field while a row is pressed
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-20 mt-1.5 flex flex-col gap-0.5 rounded-xl border border-border bg-menu p-1.5 shadow-lg animate-in fade-in duration-150"
        >
          {shown.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFocused(false);
                onSelect(item);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 hover:bg-muted/60"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-primary-foreground"
                style={{ backgroundColor: item.colorBg || "var(--avatar-teal)" }}
              >
                {item.initials}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] text-foreground">{item.name}</span>
                <span className="truncate text-[12px] text-muted-foreground tabular">
                  {[item.bank, item.acct].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
          {matches.length > SUGGEST_LIMIT && (
            <button
              type="button"
              onClick={() => {
                setFocused(false);
                setPickerOpen(true);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground"
            >
              <Search size={15} strokeWidth={1.8} />
              See all {matches.length}
            </button>
          )}
        </div>
      )}
      <BeneficiaryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        items={items}
        onSelect={(item) => {
          setPickerOpen(false);
          onSelect(item);
        }}
      />
    </div>
  );
}

/** Saved recipients on one mobile network. With no network chosen yet, everyone is kept. */
export function onNetwork<T extends RecentPayeeAvatar>(items: T[], network?: string): T[] {
  if (!network) return items;
  const chosen = operatorFromName(network) ?? network;
  return items.filter((r) => (operatorFromName(r.bank) ?? r.bank) === chosen);
}

/** Saved recipients at one bank (names differ slightly between lists, so compare loosely). With no bank chosen, everyone is kept. */
export function atBank<T extends RecentPayeeAvatar>(items: T[], bank?: string): T[] {
  if (!bank) return items;
  const b = bank.toLowerCase();
  return items.filter((r) => {
    const rb = r.bank.toLowerCase();
    return rb.includes(b) || b.includes(rb);
  });
}
