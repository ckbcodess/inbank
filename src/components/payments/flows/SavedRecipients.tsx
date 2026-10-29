"use client";

import * as React from "react";
import { BeneficiaryPicker } from "./beneficiaries";

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
 * field is then given a `SavedRecipientLink` in its label row, which opens them.
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

/** Two entries are the same recipient when their letters and digits match; phone numbers compare on their last nine digits. */
function recipientKey(v: string): string {
  const k = v.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return /^\d+$/.test(k) ? k.slice(-9) : k;
}

/**
 * The way into the saved recipients, for the end of a beneficiary field's label row (`Field`'s `action`). It reads
 * "Choose saved" until the field holds someone who is saved, then "Change", so the same link is also the way back. The
 * list is everyone saved for this kind of payment, whichever bank or network the form shows; the chosen `provider`
 * only puts its people on top, and picking someone elsewhere switches the form to them. Nothing is drawn when nobody
 * is saved, so there is never an empty list to open.
 */
export function SavedRecipientLink({
  provider,
  value,
  onPicked,
}: {
  /** The bank or network chosen on the form. Its people are listed first. */
  provider?: string;
  /** What the field holds now (account, number or reference), to tell whether it is a saved person. */
  value?: string;
  /** Called after someone is picked, so the flow can remember who was picked. */
  onPicked?: (item: SavedRecipient) => void;
}) {
  const ctx = React.useContext(SavedRecipientsContext);
  const [open, setOpen] = React.useState(false);

  const items = React.useMemo(() => (ctx ? ctx.items.map((i) => ({ ...i, initials: i.initials ?? "" })) : []), [ctx]);
  const want = provider ? providerWords(provider) : null;

  if (!ctx || items.length === 0) return null;

  const key = value ? recipientKey(value) : "";
  const isSaved = key !== "" && items.some((i) => recipientKey(i.acct) === key);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 cursor-pointer items-center text-[13px] text-foreground underline underline-offset-4 transition-colors duration-hover hover:text-muted-foreground"
      >
        {isSaved ? "Change" : "Choose saved"}
      </button>
      <BeneficiaryPicker
        open={open}
        onOpenChange={setOpen}
        items={items}
        first={want ? (i) => providerWords(i.bank) === want : undefined}
        firstLabel={provider}
        onSelect={(item) => {
          setOpen(false);
          ctx.onSelect(item);
          onPicked?.(item);
        }}
      />
    </>
  );
}
