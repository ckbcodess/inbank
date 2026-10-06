"use client";

/**
 * "For myself" destinations: every wallet / phone line that's yours — the one
 * on your registered number plus each MoMo wallet you've linked as a source of
 * funds — so paying yourself never means retyping a number, and never quietly
 * narrows to the registered line.
 *
 * Shown as a dropdown with the registered one already chosen, so the usual case needs no tap and
 * any other of your numbers is one pick away. Used by the mobile wallet flow ("Send to myself") and
 * by Airtime and Data ("My own number"). "Add another …" is the last item and opens the same link
 * modal as Accounts (one store, one flow); what it links is selected straight away.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Account } from "@/lib/mock-data";
import { useLinkedSources } from "@/lib/accounts-store";
import LinkSourceAccountModal from "@/components/dashboard/LinkSourceAccountModal";
import { formatGhPhone, normalizeNetworkName } from "./shared";
import { OperatorLogo } from "@/components/ui/operator-logo";
import { OPERATORS } from "@/lib/operators";

/** The wallet on the customer's registered number (the demo customer's MTN line). */
export const REGISTERED_WALLET = { phone: "0244123821", network: "MTN Mobile Money" } as const;

export interface OwnWallet {
  id: string;
  phone: string;
  /** The wallet name ("MTN Mobile Money"); `normalizeNetworkName` gives the line ("MTN Ghana"). */
  network: string;
  tag: "Registered" | "Linked";
}

export const digitsOf = (s: string) => s.replace(/\D/g, "");

/** The registered wallet first, then linked MoMo wallets (a linked copy of the registered number is skipped). */
export function useOwnWallets(): OwnWallet[] {
  const sources = useLinkedSources((s) => s.sources);
  return useMemo(() => {
    const registered: OwnWallet = { id: "registered", tag: "Registered", ...REGISTERED_WALLET };
    const linked = sources
      .filter((s) => s.type === "momo" && s.operator)
      .map<OwnWallet>((s) => ({ id: s.id, phone: s.maskedNumber, network: OPERATORS[s.operator!].wallet, tag: "Linked" }))
      .filter((w) => digitsOf(w.phone) !== digitsOf(registered.phone));
    return [registered, ...linked];
  }, [sources]);
}

/**
 * The "for myself" choice for a flow.
 *
 * - The registered one is pre-selected, and filled in so a payment always carries it.
 * - If the chosen one stops being yours mid-payment (unlinked in another tab),
 *   it falls back to the registered one and sets `removedNotice`.
 */
export function useOwnDestination({
  isSelf,
  phone,
  apply,
}: {
  isSelf: boolean;
  phone: string;
  /** Writes a destination into the flow's form (phone, network, name). */
  apply: (wallet: OwnWallet) => void;
}) {
  const wallets = useOwnWallets();
  const [removedNotice, setRemovedNotice] = useState(false);
  const selected = wallets.find((w) => digitsOf(w.phone) === digitsOf(phone));

  // The flow passes a fresh `apply` each render; read it through a ref.
  const applyRef = useRef(apply);
  useLayoutEffect(() => {
    applyRef.current = apply;
  });

  useEffect(() => {
    if (!isSelf) return;
    const registered = wallets[0];
    if (!phone) {
      applyRef.current(registered);
    } else if (!wallets.some((w) => digitsOf(w.phone) === digitsOf(phone))) {
      // The chosen wallet was unlinked: never send to a wallet that's no longer yours.
      applyRef.current(registered);
      setRemovedNotice(true);
    }
  }, [isSelf, phone, wallets]);

  return {
    wallets,
    selected,
    removedNotice,
    pick: (wallet: OwnWallet) => {
      applyRef.current(wallet);
      setRemovedNotice(false);
    },
  };
}

/** Chosen from the dropdown to link another number instead of picking one. */
const ADD_ANOTHER = "__add_another__";

export function OwnWalletPicker({
  wallets,
  selectedPhone,
  accounts,
  onSelect,
  variant = "wallet",
  removedNotice = false,
}: {
  wallets: OwnWallet[];
  selectedPhone: string;
  accounts: Account[];
  onSelect: (wallet: OwnWallet) => void;
  /** `wallet`: MoMo wallets (Send to myself). `line`: your phone numbers (Airtime, Data). */
  variant?: "wallet" | "line";
  /** The previously chosen wallet was unlinked: say why the selection changed. */
  removedNotice?: boolean;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const line = variant === "line";
  // The registered one is the default, so an empty or unknown phone shows it.
  const current = wallets.find((w) => digitsOf(w.phone) === digitsOf(selectedPhone)) ?? wallets[0];
  const nameOf = (w: OwnWallet) => (line ? normalizeNetworkName(w.network) : w.network);

  return (
    <>
      {removedNotice && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-warning/10 px-3.5 py-2.5 text-[13px] text-foreground">
          <AlertCircle size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          That {line ? "number" : "wallet"} is no longer linked, so we&apos;ve switched to your registered one. Choose again below.
        </p>
      )}

      <Select
        value={current?.id}
        onValueChange={(id) => {
          if (id === ADD_ANOTHER) {
            setLinkOpen(true);
            return;
          }
          const next = wallets.find((w) => w.id === id);
          if (next) onSelect(next);
        }}
      >
        <SelectTrigger
          aria-label={line ? "Your numbers" : "Your wallets"}
          className="flex h-[58px] min-h-[58px] w-full cursor-pointer items-center rounded-2xl border border-field-border bg-field px-3.5 py-0 text-left shadow-none transition-colors hover:bg-field-hover"
        >
          {current && (
            <div className="flex min-w-0 items-center gap-3">
              <OperatorLogo name={current.network} size={36} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[14px] text-foreground">{nameOf(current)}</span>
                <span className="truncate text-[12.5px] text-muted-foreground tabular">
                  {formatGhPhone(current.phone)} · {current.tag}
                </span>
              </span>
            </div>
          )}
        </SelectTrigger>
        <SelectContent>
          {wallets.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              <div className="flex items-center gap-3">
                <OperatorLogo name={w.network} size={32} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[14px] text-foreground">{nameOf(w)}</span>
                  <span className="truncate text-[12.5px] text-muted-foreground tabular">
                    {formatGhPhone(w.phone)} · {w.tag}
                  </span>
                </span>
              </div>
            </SelectItem>
          ))}
          <SelectItem value={ADD_ANOTHER}>
            <div className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="text-[14px] text-foreground">{line ? "Add another of your numbers" : "Link another wallet"}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <LinkSourceAccountModal
        mode="link"
        isOpen={linkOpen}
        initialScreen="link_new_momo"
        accounts={accounts}
        onClose={() => setLinkOpen(false)}
        onLinked={(source) => {
          if (source.type === "momo" && source.operator) {
            onSelect({ id: source.id, phone: source.maskedNumber, network: OPERATORS[source.operator].wallet, tag: "Linked" });
          }
        }}
      />
    </>
  );
}
