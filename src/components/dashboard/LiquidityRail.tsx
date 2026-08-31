"use client";

/**
 * FR-04 / FR-05 — the Liquidity Rail.
 *
 * One number that answers "what can I spend", an account-by-account rail that
 * narrows that number to a single balance, and the three actions a customer
 * reaches for most (per the frequency ordering QuickActionBar already
 * documents: send, top up, quick pay) as large primary targets beside it —
 * Fitts's Law again, just folded into the balance panel instead of a
 * separate row.
 *
 * Selecting an account narrows the headline figure and, via the page, the
 * activity feed below it. It does not change which three actions are
 * offered: every current NIBS account type (Current, Savings) is spendable,
 * so there is no loan-account exception to design for yet.
 */

import Link from "next/link";
import { CalendarClock, CreditCard, FileSpreadsheet, Landmark, Send, Wallet } from "lucide-react";
import {
  formatMoney,
  toLocalEquivalent,
  type Account,
  type PaymentCard,
} from "@/lib/mock-data";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

function AccountIcon({ type }: { type: Account["type"] }) {
  return type === "Savings" ? (
    <Wallet size={14} strokeWidth={1.8} aria-hidden="true" />
  ) : (
    <Landmark size={14} strokeWidth={1.8} aria-hidden="true" />
  );
}

function SquareAction({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const tileClass = `flex size-14 shrink-0 items-center justify-center rounded-xl transition-colors ${
    disabled
      ? "cursor-not-allowed bg-muted text-muted-foreground/50"
      : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition-transform"
  }`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {href && !disabled ? (
        <Link href={href} className={tileClass} aria-label={label}>
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={tileClass}
          aria-label={label}
        >
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </button>
      )}
      <span className="text-[12px] text-foreground">{label}</span>
    </div>
  );
}

export function LiquidityRail({
  accounts,
  isCorporate,
  fundableCards,
  selectedAccountId,
  onSelectAccount,
  onRequestTopUp,
}: {
  accounts: Account[];
  isCorporate: boolean;
  fundableCards: PaymentCard[];
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  onRequestTopUp: (cardId: string) => void;
}) {
  const { showAmounts } = useAmountVisibility();

  const inGhs = (amount: number, currency: string) => toLocalEquivalent(amount, currency) ?? amount;
  const totalAvailable = accounts.reduce((sum, a) => sum + inGhs(a.available, a.currency), 0);
  const totalBalance = accounts.reduce((sum, a) => sum + inGhs(a.balance, a.currency), 0);
  const held = totalBalance - totalAvailable;

  const selected = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) ?? null : null;
  const selectedHeld = selected ? selected.balance - selected.available : 0;

  const headlineAmount = selected ? selected.available : totalAvailable;
  const headlineCurrency = selected ? selected.currency : "GHS";
  const headlineHeld = selected ? selectedHeld : held;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-6 rounded-2xl border border-border bg-muted/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="text-[12px] text-muted-foreground">
            {selected ? selected.name : "Total spendable cash"}
          </span>
          <div className="mt-1.5 text-[40px] leading-none tracking-[-0.02em] text-foreground tabular">
            <RevealingAmount value={formatMoney(headlineAmount, headlineCurrency, showAmounts)} />
          </div>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {selected
              ? `${selected.type} · ${selected.number}`
              : `Across ${accounts.length} account${accounts.length === 1 ? "" : "s"} · cleared and ready`}
            {headlineHeld > 0.01 && (
              <span className="text-warning">
                {" "}
                · {formatMoney(headlineHeld, headlineCurrency, showAmounts)} not yet available
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <SquareAction icon={Send} label="Send money" href="/payments/send" />
          <SquareAction
            icon={CreditCard}
            label="Top up"
            disabled={fundableCards.length === 0}
            onClick={() => onRequestTopUp(fundableCards[0]?.id ?? "")}
          />
          <SquareAction icon={CalendarClock} label="Quick pay" href="/payments?mode=standing" />
          {isCorporate && (
            <SquareAction icon={FileSpreadsheet} label="Bulk pay" href="/payments/bulk" />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectAccount(null)}
          className={`rounded-full border px-4 py-2 text-[13px] transition-colors ${
            !selected
              ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All accounts
        </button>
        {accounts.map((acc) => (
          <button
            key={acc.id}
            type="button"
            onClick={() => onSelectAccount(acc.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors ${
              selectedAccountId === acc.id
                ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <AccountIcon type={acc.type} />
            {acc.type}
            <span className="tabular text-muted-foreground">
              {formatMoney(acc.available, acc.currency, showAmounts)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
