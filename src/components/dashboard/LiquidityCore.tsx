"use client";

/**
 * FR-04 — the Liquidity Core.
 *
 * One consolidated "Total available cash" across every current and savings
 * account, because the question a customer opens the app with is "what can I
 * actually spend", not "what are my six balances".
 *
 * Available and total are shown as separate figures rather than one. They
 * differ whenever funds are uncleared or held, and a customer who sees only the
 * total will plan against money they cannot touch. Naming both, next to each
 * other, is what makes the difference legible.
 *
 * Balances in a foreign currency are converted to GHS and shown alongside the
 * foreign figure, so nothing on this dashboard asks the reader to do mental
 * arithmetic. Foreign accounts are currently filtered out of the account lists,
 * but the conversion is wired so re-introducing them cannot reintroduce that.
 */

import { CheckCircle2, Clock, Wallet } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { formatMoney, toLocalEquivalent, type Account } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export function LiquidityCore({
  accounts,
  pendingCount,
  approvalCount,
}: {
  accounts: Account[];
  pendingCount: number;
  /** Null for a relationship with no approval queue (personal, or non-approver). */
  approvalCount: number | null;
}) {
  const { showAmounts } = useAmountVisibility();

  // Foreign balances are converted at the published mid rate so the headline is
  // a single spendable number rather than a mix of currencies.
  const inGhs = (amount: number, currency: string) =>
    toLocalEquivalent(amount, currency) ?? amount;

  const totalAvailable = accounts.reduce((sum, a) => sum + inGhs(a.available, a.currency), 0);
  const totalBalance = accounts.reduce((sum, a) => sum + inGhs(a.balance, a.currency), 0);
  const held = totalBalance - totalAvailable;

  const kinds = new Set(accounts.map((a) => a.type.toLowerCase()));
  const kindLabel = [...kinds].join(" & ") || "banking";

  return (
    <section
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
        approvalCount !== null ? "lg:grid-cols-4" : "lg:grid-cols-3"
      }`}
    >
      <SummaryCard
        label="Total available cash"
        value={formatMoney(totalAvailable, "GHS", showAmounts)}
        hint={`Across ${accounts.length} ${kindLabel} account${accounts.length === 1 ? "" : "s"}`}
        icon={<Wallet size={15} strokeWidth={1.8} />}
      />
      <SummaryCard
        label="Total balance"
        value={formatMoney(totalBalance, "GHS", showAmounts)}
        hint={
          held > 0.01
            ? `${formatMoney(held, "GHS", showAmounts)} not yet available`
            : "All funds cleared and available"
        }
        icon={<Wallet size={15} strokeWidth={1.8} />}
      />
      <SummaryCard
        label="In progress"
        value={String(pendingCount)}
        hint="Payments not yet settled"
        icon={<Clock size={15} strokeWidth={1.8} />}
        tone="warning"
      />
      {approvalCount !== null && (
        <SummaryCard
          label="Awaiting your approval"
          value={String(approvalCount)}
          hint="Across payments and trade"
          icon={<CheckCircle2 size={15} strokeWidth={1.8} />}
          tone="warning"
        />
      )}
    </section>
  );
}
