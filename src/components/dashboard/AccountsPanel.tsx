"use client";

/**
 * FR-04 — the account list behind the Liquidity Core headline.
 *
 * Each row leads with what is *available*, not the ledger balance, because that
 * is the figure a customer acts on; the total sits underneath when the two
 * differ. Showing only the balance invites planning against held funds.
 *
 * A balance in a foreign currency carries its GHS equivalent directly beneath
 * it, so no row ever asks the reader to convert in their head.
 */

import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, toLocalEquivalent, type Account } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export function AccountsPanel({ accounts }: { accounts: Account[] }) {
  const { showAmounts } = useAmountVisibility();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-[15px] text-foreground">Accounts</h2>
        <Link href="/accounts" className="text-[12px] text-primary underline-offset-4 hover:underline">
          View all accounts
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
          No accounts on this relationship yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {accounts.slice(0, 4).map((acc) => {
            const localEquivalent = toLocalEquivalent(acc.available, acc.currency);
            const held = acc.balance - acc.available;

            return (
              <li key={acc.id}>
                <Link
                  href={`/accounts/${acc.id}`}
                  className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                >
                  <span className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Wallet size={15} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] text-foreground">{acc.name}</span>
                        {acc.status === "Dormant" && <Badge variant="warning">Dormant</Badge>}
                      </span>
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        {acc.type} · {acc.number}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-[13px] text-foreground tabular">
                      {formatMoney(acc.available, acc.currency, showAmounts)}
                    </span>
                    <span className="mt-0.5 text-[11.5px] text-muted-foreground tabular">
                      {localEquivalent !== null
                        ? `≈ ${formatMoney(localEquivalent, "GHS", showAmounts)}`
                        : held > 0.01
                          ? `${formatMoney(acc.balance, acc.currency, showAmounts)} total`
                          : "available"}
                    </span>
                  </span>

                  <ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
