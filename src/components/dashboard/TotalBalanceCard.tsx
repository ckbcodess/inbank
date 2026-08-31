"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Landmark, PiggyBank } from "lucide-react";
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
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Background wave decoration */}
      <div className="pointer-events-none absolute -top-16 -right-10 h-[220px] w-[360px] opacity-40 dark:opacity-25">
        <Image
          src="/images/dashboard/balance-wave.svg"
          alt=""
          width={360}
          height={220}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Top section: Title & Balance */}
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-foreground">Total Balance</span>
            <button
              type="button"
              onClick={toggleAmountVisibility}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label={showAmounts ? "Hide balances" : "Show balances"}
            >
              {showAmounts ? <Eye size={16} strokeWidth={1.8} /> : <EyeOff size={16} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {/* Large Currency Display */}
        <div className="flex items-baseline gap-1 text-foreground">
          {showAmounts ? (
            <>
              <span className="text-[32px] font-medium tracking-tight sm:text-[36px]">
                GHS {formattedInt}
              </span>
              <span className="text-[18px] font-normal text-muted-foreground sm:text-[20px]">
                {fractionalPart}
              </span>
            </>
          ) : (
            <span className="text-[32px] font-medium tracking-tight sm:text-[36px]">
              GHS ••••••
            </span>
          )}
        </div>
      </div>

      {/* Embedded Accounts Preview List */}
      <div className="relative z-10 mt-6 flex flex-col gap-1 rounded-xl bg-muted/40 p-3.5 dark:bg-muted/20">
        {/* Savings Account */}
        <Link
          href="/accounts"
          className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/60"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-background/80 text-primary shadow-xs border border-border/50">
              <PiggyBank size={15} strokeWidth={1.8} />
            </div>
            <span className="text-[13px] font-normal text-foreground">Savings Account</span>
          </div>
          <div className="text-right text-[14px] font-medium text-foreground">
            <RevealingAmount amount={accounts.find((a) => a.type === "Savings")?.balance ?? 69033.59} currency="GHS" />
          </div>
        </Link>

        {/* Current Account */}
        <Link
          href="/accounts"
          className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/60"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-xs border border-border/50">
              <Landmark size={15} strokeWidth={1.8} />
            </div>
            <span className="text-[13px] font-normal text-foreground">Current Account</span>
          </div>
          <div className="text-right text-[14px] font-medium text-foreground">
            <RevealingAmount amount={accounts.find((a) => a.type === "Current")?.balance ?? 1459.59} currency="GHS" />
          </div>
        </Link>

        {/* View all accounts link */}
        <Link
          href="/accounts"
          className="flex items-center justify-between rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-[12px] font-medium text-foreground">
              +{Math.max(1, accounts.length - 2)}
            </div>
            <span className="text-[13px] font-normal">View all accounts</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
