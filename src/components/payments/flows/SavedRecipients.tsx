"use client";

import * as React from "react";
import { PayeeAvatar } from "@/components/ui/payee-avatar";

/** What the picker needs from a saved recipient: enough to show them, and to hand back to the flow. */
export interface SavedRecipient {
  id: string;
  name: string;
  bank: string;
  acct: string;
  initials?: string;
  subtitle?: string;
}

interface SavedRecipientsValue {
  items: SavedRecipient[];
  onSelect: (item: SavedRecipient) => void;
}

const GENERIC = new Set(["bank", "ltd", "limited", "plc", "ghana", "mobile", "money", "cash", "the", "of", "and", "savings", "loans"]);

/** The words that identify a bank or provider ("Stanbic Bank Ghana Ltd" and "Stanbic Bank" are both just "stanbic"). */
function providerWords(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !GENERIC.has(w))
    .sort()
    .join(" ");
}

const SavedRecipientsContext = React.createContext<SavedRecipientsValue | null>(null);

/**
 * The saved recipients that fit the payment the customer is making. Put once around a flow; each beneficiary
 * field is then wrapped in `SavedSuggestions`, which suggests them as the person focuses or types. Nothing is drawn until then.
 */
export function SavedRecipientsProvider<T extends SavedRecipient>({
  items,
  onSelect,
  children,
}: {
  items: T[];
  onSelect: (item: T) => void;
  children: React.ReactNode;
}) {
  // The picker hands back the same object it was given, so the flow gets its own type back
  const value = React.useMemo(
    () => ({ items, onSelect: onSelect as (item: SavedRecipient) => void }),
    [items, onSelect],
  );
  return <SavedRecipientsContext.Provider value={value}>{children}</SavedRecipientsContext.Provider>;
}

/**
 * Suggestions under a beneficiary field. Focus the field and the saved people at the chosen bank or provider appear;
 * type a name or the start of a number and the list narrows. Pick one and the flow fills in. Nothing shows when
 * nobody fits, and a number that is already complete and saved needs no suggestion.
 */
export function SavedSuggestions({
  provider,
  requireProvider,
  query,
  onPicked,
  children,
}: {
  /** The bank or network chosen on the form. Only people at it are suggested. */
  provider?: string;
  /** Don't suggest anyone until a provider has been chosen. */
  requireProvider?: boolean;
  /** What is typed in the field. */
  query: string;
  /** Called after someone is picked, so the field can drop the text it was searching with or remember who was picked. */
  onPicked?: (item: SavedRecipient) => void;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(SavedRecipientsContext);
  const [focused, setFocused] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const matches = React.useMemo(() => {
    if (!ctx || (requireProvider && !provider)) return [];
    const want = provider ? providerWords(provider) : null;
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return ctx.items
      .filter((i) => want === null || providerWords(i.bank) === want)
      .filter((i) => {
        if (!q) return true;
        const acctDigits = i.acct.replace(/\D/g, "");
        if (digits.length > 0 && acctDigits === digits) return false; // already typed in full
        return i.name.toLowerCase().includes(q) || i.acct.toLowerCase().includes(q) || (digits.length > 0 && acctDigits.includes(digits));
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [ctx, provider, requireProvider, query]);

  const open = focused && matches.length > 0;

  return (
    <div
      ref={boxRef}
      className="relative w-full"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {children}
      {open && ctx && (
        <ul
          role="listbox"
          aria-label="Saved recipients"
          className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-border bg-menu p-2 shadow-lg animate-in fade-in duration-150"
        >
          {matches.map((item) => (
            <li key={item.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  ctx.onSelect(item);
                  onPicked?.(item);
                  setFocused(false);
                }}
                className="group flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/60"
              >
                <PayeeAvatar name={item.name} initials={item.initials} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] text-foreground">{item.name}</span>
                  <span className="truncate text-[12px] text-muted-foreground tabular">
                    {item.subtitle || [item.bank, item.acct].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
