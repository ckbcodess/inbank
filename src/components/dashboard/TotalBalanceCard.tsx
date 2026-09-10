"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Landmark, PiggyBank, ChevronRight } from "lucide-react";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import type { Account } from "@/lib/mock-data";

interface TotalBalanceCardProps {
  accounts: Account[];
  selectedAccountId?: string | null;
  onSelectAccount?: (id: string | null) => void;
}

export function TotalBalanceCard({ accounts }: TotalBalanceCardProps) {
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();

  // Compute total balance across active accounts
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const formattedInt = new Intl.NumberFormat("en-GH", {
    maximumFractionDigits: 0,
  }).format(Math.floor(totalBalance));
  const fractionalPart = (totalBalance % 1).toFixed(2).substring(1); // e.g. ".59"

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-colors">
      {/* Top Banner (Yellow Header in light mode, Obsidian Gold in dark mode) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#f6bf36] via-[#f5ba2f] to-[#e8ab1c] text-[#121212] px-6 pt-7 pb-5 dark:from-[#211a0c] dark:via-[#191409] dark:to-[#141008] dark:text-neutral-100 dark:border-b dark:border-amber-500/20">
        {/* Background Eagle Graphic Watermark */}
        <div className="pointer-events-none absolute -top-8 -right-4 h-[200px] w-[280px] select-none opacity-25 mix-blend-color-burn dark:opacity-10 dark:mix-blend-screen dark:invert">
          <Image
            src="/images/dashboard/balance-wave.svg"
            alt=""
            width={795}
            height={637}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-current/90">Total Balance</span>
            <button
              type="button"
              onClick={toggleAmountVisibility}
              className="flex size-7 items-center justify-center rounded-lg text-current/75 transition-colors hover:bg-black/10 dark:hover:bg-white/10 active:scale-[0.96] transition-transform cursor-pointer"
              aria-label={showAmounts ? "Hide balances" : "Show balances"}
            >
              {showAmounts ? <Eye size={16} strokeWidth={1.8} /> : <EyeOff size={16} strokeWidth={1.8} />}
            </button>
          </div>

          {/* Large Balance Display */}
          <div className="flex items-baseline text-current">
            {showAmounts ? (
              <>
                <span className="text-[32px] sm:text-[34px] font-normal tracking-tight tabular">
                  GHS {formattedInt}
                </span>
                <span className="text-[19px] font-normal ml-0.5 tabular opacity-85">
                  {fractionalPart}
                </span>
              </>
            ) : (
              <span className="text-[32px] sm:text-[34px] font-normal tracking-tight tabular">
                GHS ••••••
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Accounts Preview List */}
      <div className="flex flex-col bg-card px-6 py-2.5 divide-y divide-border/50">
        {accounts.slice(0, 3).map((acc) => (
          <Link
            key={acc.id}
            href={`/accounts/${acc.id}`}
            className="group flex items-center justify-between py-2.5 px-2.5 -mx-2.5 rounded-xl transition-colors hover:bg-muted/50 active:scale-[0.98] transition-transform first:pt-1.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground border border-border/50 transition-colors group-hover:border-border">
                {acc.type === "Savings" ? (
                  <PiggyBank size={15} strokeWidth={1.8} />
                ) : (
                  <Landmark size={15} strokeWidth={1.8} />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13.5px] font-medium text-foreground">{acc.name}</span>
                  {acc.isJoint && (
                    <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      Joint
                    </span>
                  )}
                </div>
                <span className="text-[11.5px] text-muted-foreground tabular">{acc.number}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right text-[13.5px] font-medium text-foreground tabular">
                <RevealingAmount amount={acc.balance} currency={acc.currency} />
              </div>
              <ChevronRight size={15} strokeWidth={1.8} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </Link>
        ))}

        {/* View all accounts link */}
        <div className="pt-2.5 pb-0.5 text-center">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors active:scale-[0.96] transition-transform"
          >
            <span>View all accounts</span>
            <ChevronRight size={13} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </div>
  );
}
