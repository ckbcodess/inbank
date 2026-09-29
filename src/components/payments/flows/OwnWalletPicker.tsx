"use client";

/**
 * "For myself" destinations: every wallet / phone line that's yours — the one
 * on your registered number plus each MoMo wallet you've linked as a source of
 * funds — so paying yourself never means retyping a number, and never quietly
 * narrows to the registered line.
 *
 * Used by the mobile wallet flow ("Send to myself") and by Airtime and Data
 * ("My own number"). "Link another …" opens the same link modal as Accounts
 * (one store, one flow), and what it links is selected straight away.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/mock-data";
import { useLinkedSources, type NetworkOperator } from "@/lib/accounts-store";
import LinkSourceAccountModal from "@/components/dashboard/LinkSourceAccountModal";
import { formatGhPhone, getTelcoLogo, normalizeNetworkName } from "./shared";

const WALLET_NAME: Record<NetworkOperator, string> = {
  MTN: "MTN Mobile Money",
  Telecel: "Telecel Cash",
  AT: "AT Money",
};

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
      .map<OwnWallet>((s) => ({ id: s.id, phone: s.maskedNumber, network: WALLET_NAME[s.operator!], tag: "Linked" }))
      .filter((w) => digitsOf(w.phone) !== digitsOf(registered.phone));
    return [registered, ...linked];
  }, [sources]);
}

/**
 * The "for myself" choice for a flow.
 *
 * - `choosing`: with 2+ own destinations, the picker shows until one is picked
 *   (the registered one is pre-selected, and filled in so a payment always
 *   carries it).
 * - If the chosen one stops being yours mid-payment (unlinked in another tab),
 *   it falls back to the registered one, reopens the picker and sets `removedNotice`.
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
  const [picked, setPicked] = useState(false);
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
      setPicked(false);
      setRemovedNotice(true);
    }
  }, [isSelf, phone, wallets]);

  return {
    wallets,
    selected,
    choosing: isSelf && wallets.length > 1 && !picked,
    removedNotice,
    pick: (wallet: OwnWallet) => {
      applyRef.current(wallet);
      setPicked(true);
      setRemovedNotice(false);
    },
  };
}

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
  /** The previously chosen wallet was unlinked — say why the selection changed. */
  removedNotice?: boolean;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const line = variant === "line";

  return (
    <>
      {removedNotice && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-warning/10 px-3.5 py-2.5 text-[13px] text-foreground">
          <AlertCircle size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          That {line ? "number" : "wallet"} is no longer linked, so we&apos;ve switched to your registered one. Choose again below.
        </p>
      )}
      <div
        role="radiogroup"
        aria-label={line ? "Your numbers" : "Your wallets"}
        className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/80 bg-card"
      >
        {wallets.map((w) => {
          const selected = digitsOf(w.phone) === digitsOf(selectedPhone);
          const logo = getTelcoLogo(w.network);
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(w)}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3 text-left transition-colors cursor-pointer",
                selected ? "bg-muted/40" : "hover:bg-muted/20",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {logo && <Image src={logo} alt="" width={40} height={40} className="size-full rounded-full object-cover" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14px] text-foreground">{line ? normalizeNetworkName(w.network) : w.network}</span>
                <span className="truncate text-[12.5px] text-muted-foreground tabular">
                  {formatGhPhone(w.phone)} · {w.tag}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
                aria-hidden="true"
              >
                {selected && <Check size={12} strokeWidth={2.5} />}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className="flex items-center gap-3 px-3.5 py-3 text-left text-[14px] text-foreground transition-colors hover:bg-muted/20 cursor-pointer"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          </span>
          {line ? "Add another of your numbers" : "Link another wallet"}
        </button>
      </div>

      <LinkSourceAccountModal
        mode="link"
        isOpen={linkOpen}
        initialScreen="link_new_momo"
        accounts={accounts}
        onClose={() => setLinkOpen(false)}
        onLinked={(source) => {
          if (source.type === "momo" && source.operator) {
            onSelect({ id: source.id, phone: source.maskedNumber, network: WALLET_NAME[source.operator], tag: "Linked" });
          }
        }}
      />
    </>
  );
}
