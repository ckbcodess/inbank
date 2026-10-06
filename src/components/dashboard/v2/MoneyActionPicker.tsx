"use client";

/**
 * The drill-down behind Send Money / Pay Bill / Top-Up on the dashboard.
 *
 * One tap on the dashboard answers "what kind?", and the flow then opens with
 * that choice made — it never asks again. A bottom sheet on a phone (the
 * shared Modal does that below `sm`), a small dialog on desktop. The option
 * lists live in `@/lib/payment-options`, shared with the payment flow.
 */

import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { ActionTile } from "@/components/ui/action-tile";
import { Modal } from "@/components/ui/dialog";
import {
  OPEN_FUND_EVENT,
  billOptions,
  sendOptions,
  topUpOptions,
  withFrom,
  type PaymentOptionGroup,
} from "@/lib/payment-options";

export type MoneyActionKind = "send" | "bill" | "topup";

const TITLE: Record<MoneyActionKind, string> = {
  send: "Send money to…",
  bill: "GCB Pay",
  topup: "Top up",
};

/** Everything the short list leaves out, one tap away. */
const MORE: Record<MoneyActionKind, { label: string; href: string }> = {
  send: { label: "More ways to send", href: "/payments" },
  bill: { label: "All categories", href: "/payments/bills" },
  topup: { label: "More options", href: "/payments" },
};

function groupsFor(kind: MoneyActionKind, hasOtherAccounts: boolean): PaymentOptionGroup[] {
  if (kind === "send") return sendOptions({ hasOtherAccounts });
  if (kind === "bill") return billOptions();
  return topUpOptions();
}

export function MoneyActionPicker({
  kind,
  open,
  onOpenChange,
  accountId,
  hasOtherAccounts,
}: {
  /** Kept after close so the sheet doesn't change title while it animates out. */
  kind: MoneyActionKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string | null;
  hasOtherAccounts: boolean;
}) {
  const groups = groupsFor(kind, hasOtherAccounts);

  const fundAccount = () => {
    onOpenChange(false);
    window.dispatchEvent(new Event(OPEN_FUND_EVENT));
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={TITLE[kind]} size="sm" bodyClassName="gap-4 pb-5">
      {/* Topping up your own account comes first: it's what "top up" means before anything else. */}
      {kind === "topup" && (
        <ActionTile icon={Wallet} title="My Account" description="Mobile money or any bank card" onClick={fundAccount} />
      )}

      {groups.map((group, i) => (
        <section key={group.label ?? i} className="flex flex-col gap-4">
          {group.label && <h3 className="text-[12px] text-muted-foreground">{group.label}</h3>}
          <ul className="flex flex-col gap-4">
            {group.options.map((o) => (
              <li key={o.id}>
                <ActionTile
                  href={withFrom(o.href, accountId)}
                  onClick={() => onOpenChange(false)}
                  icon={o.icon}
                  title={o.title}
                  description={o.hint}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Link
        href={withFrom(MORE[kind].href, accountId)}
        onClick={() => onOpenChange(false)}
        className="group -mb-1 flex items-center justify-center gap-1 rounded-xl py-2.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        {MORE[kind].label}
        <ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Modal>
  );
}
