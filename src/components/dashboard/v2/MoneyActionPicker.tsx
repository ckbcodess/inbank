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
import { ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/dialog";
import { TileChip } from "@/components/ui/action-tile";
import {
  billOptions,
  sendOptions,
  topUpOptions,
  withFrom,
  type PaymentOptionGroup,
} from "@/lib/payment-options";

export type MoneyActionKind = "send" | "bill" | "topup";

const TITLE: Record<MoneyActionKind, string> = {
  send: "Send money to…",
  bill: "Pay a bill",
  topup: "Top up",
};

/** Everything the short list leaves out, one tap away. */
const MORE: Record<MoneyActionKind, { label: string; href: string }> = {
  send: { label: "More ways to send", href: "/payments" },
  bill: { label: "All bill categories", href: "/payments/bills" },
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

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={TITLE[kind]} size="sm" bodyClassName="gap-5 pb-6">
      {groups.map((group, i) => (
        <section key={group.label ?? i} className="flex flex-col gap-1">
          {group.label && <h3 className="pb-1 text-[12px] text-muted-foreground">{group.label}</h3>}
          <ul className="-mx-2 flex flex-col">
            {group.options.map((o) => (
              <li key={o.id}>
                <Link
                  href={withFrom(o.href, accountId)}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60 active:bg-muted"
                >
                  <TileChip tone="onCard">
                    <o.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  </TileChip>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14.5px] font-medium text-foreground">{o.title}</span>
                    {o.hint && <span className="truncate text-[12.5px] text-muted-foreground">{o.hint}</span>}
                  </span>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Link
        href={withFrom(MORE[kind].href, accountId)}
        onClick={() => onOpenChange(false)}
        className="-my-2 self-start py-2 text-[13px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {MORE[kind].label}
      </Link>
    </Modal>
  );
}
