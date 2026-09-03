"use client";

/**
 * FR-04 — Side-by-side Left/Right Accounts Section.
 *
 * Each card leads with what is *available* in prominent typography.
 * The two primary/secondary accounts sit side-by-side (left/right) on desktop.
 */

import { useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronRight, Copy, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { formatMoney, toLocalEquivalent, type Account } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

function CopyAccountNumberButton({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <SimpleTooltip content={copied ? "Copied!" : "Copy account number"}>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(number);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded"
        aria-label="Copy account number"
      >
        {copied ? (
          <Check size={11} strokeWidth={2.2} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy size={11} strokeWidth={1.8} />
        )}
      </button>
    </SimpleTooltip>
  );
}

export function AccountsPanel({ accounts }: { accounts: Account[] }) {
  const { showAmounts } = useAmountVisibility();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Your Accounts</h2>
        </div>
        <Link href="/accounts" className="text-[12px] text-primary underline-offset-4 hover:underline">
          View all accounts →
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
          No accounts on this relationship yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {accounts.map((acc, idx) => {
            const localEquivalent = toLocalEquivalent(acc.available, acc.currency);
            const held = acc.balance - acc.available;

            return (
              <div
                key={acc.id}
                className="flex flex-col justify-between space-y-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border/80 shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Building2 size={16} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">{acc.name}</p>
                        <p className="flex items-center gap-1.5 text-[11.5px] font-mono text-muted-foreground">
                          <span>{acc.type} · {acc.number}</span>
                          <CopyAccountNumberButton number={acc.number} />
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {acc.status === "Dormant" && <Badge variant="warning">Dormant</Badge>}
                      <Badge variant={idx === 0 ? "default" : "secondary"} className="text-[10px]">
                        {idx === 0 ? "Primary" : "Secondary"}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground block">
                      Available Balance
                    </span>
                    <div className="text-2xl font-medium font-mono tracking-tight text-foreground tabular mt-0.5">
                      {formatMoney(acc.available, acc.currency, showAmounts)}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {localEquivalent !== null
                        ? `≈ ${formatMoney(localEquivalent, "GHS", showAmounts)}`
                        : held > 0.01
                          ? `Total Ledger: ${formatMoney(acc.balance, acc.currency, showAmounts)}`
                          : "Cleared & available for transfer"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-[12px]">
                  <Link
                    href={`/accounts/${acc.id}/statement`}
                    className="flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Statement <ChevronRight size={14} />
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    nativeButton={false}
                    render={<Link href={`/payments/send?source=${acc.id}`} />}
                  >
                    <Send size={12} />
                    Transfer Out
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
