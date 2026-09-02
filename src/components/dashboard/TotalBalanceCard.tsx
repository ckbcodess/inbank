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
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all">
      {/* Top Banner (Yellow Header with Eagle Graphic) */}
      <div className="relative overflow-hidden bg-[#f6bf36] px-6 pt-9 pb-6 text-[#121212]">
        {/* Background Eagle Graphic Watermark */}
        <div className="pointer-events-none absolute -top-8 -right-4 h-[200px] w-[280px] select-none opacity-25 mix-blend-color-burn">
          <Image
            src="/images/dashboard/balance-wave.svg"
            alt=""
            width={795}
            height={637}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-medium text-[#111]">Total Balance</span>
            <button
              type="button"
              onClick={toggleAmountVisibility}
              className="flex size-7 items-center justify-center rounded-lg text-[#111]/80 transition-colors hover:bg-black/10 hover:text-[#111] cursor-pointer"
              aria-label={showAmounts ? "Hide balances" : "Show balances"}
            >
              {showAmounts ? <Eye size={17} strokeWidth={1.8} /> : <EyeOff size={17} strokeWidth={1.8} />}
            </button>
          </div>

          {/* Large Balance Display */}
          <div className="flex items-baseline text-[#111]">
            {showAmounts ? (
              <>
                <span className="text-[34px] font-normal tracking-tight sm:text-[36px]">
                  GHS {formattedInt}
                </span>
                <span className="text-[20px] font-normal ml-0.5">
                  {fractionalPart}
                </span>
              </>
            ) : (
              <span className="text-[34px] font-normal tracking-tight sm:text-[36px]">
                GHS ••••••
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Accounts Preview List */}
      <div className="flex flex-col bg-card px-6 py-3 divide-y divide-border/60">
        {accounts.slice(0, 3).map((acc) => (
          <Link
            key={acc.id}
            href={`/accounts/${acc.id}`}
            className="group flex items-center justify-between py-2.5 transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2 first:pt-1"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground border border-border/50">
                {acc.type === "Savings" ? (
                  <PiggyBank size={15} strokeWidth={1.8} />
                ) : (
                  <Landmark size={15} strokeWidth={1.8} />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14px] font-medium text-foreground">{acc.name}</span>
                  {acc.isJoint && (
                    <span className="rounded bg-[#FEF3D6] px-1.5 py-0.5 text-[10px] font-semibold text-[#B27B00] dark:bg-amber-500/20 dark:text-amber-300">
                      Joint
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground tabular">{acc.number}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right text-[14px] font-medium text-foreground">
                <RevealingAmount amount={acc.balance} currency={acc.currency} />
              </div>
              <ChevronRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </Link>
        ))}

        {/* View all accounts link */}
        <div className="pt-2.5 pb-1 text-center">
          <Link
            href="/accounts"
            className="text-[13px] font-medium text-foreground hover:underline transition-colors"
          >
            View all accounts →
          </Link>
        </div>
      </div>
    </div>
  );
}
