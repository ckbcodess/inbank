"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import type { Transaction } from "@/lib/mock-data";

interface RecentActivityWidgetProps {
  transactions?: Transaction[];
}

export function RecentActivityWidget({ transactions }: RecentActivityWidgetProps) {
  const selectedFilter = "Current •••82139";

  // Fallback transaction list matching Figma design exactly if transactions not passed or empty
  const defaultItems = [
    {
      id: "act-1",
      title: "Supermarket Purchase — Melcom",
      subtitle: "11 Aug 2026 · Melcom Stores",
      amount: 450.0,
      direction: "debit",
      status: "Completed",
    },
    {
      id: "act-2",
      title: "Supermarket Purchase — Melcom",
      subtitle: "11 Aug 2026 · Melcom Stores",
      amount: 450.0,
      direction: "debit",
      status: "Completed",
    },
    {
      id: "act-3",
      title: "Supermarket Purchase — Melcom",
      subtitle: "11 Aug 2026 · Melcom Stores",
      amount: 450.0,
      direction: "debit",
      status: "Completed",
    },
    {
      id: "act-4",
      title: "Monthly Salary Credit",
      subtitle: "10 Aug 2026 · Employer Ltd",
      amount: 8500.0,
      direction: "credit",
      status: "Completed",
    },
    {
      id: "act-5",
      title: "Transfer to Savings",
      subtitle: "08 Aug 2026 · Personal Savings Account",
      amount: 2000.0,
      direction: "credit",
      status: "Completed",
    },
  ];

  const items = (transactions && transactions.length > 0)
    ? transactions.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.description,
        subtitle: `${t.date} · ${t.counterparty || "Direct"}`,
        amount: t.amount,
        direction: t.direction,
        status: "Completed",
      }))
    : defaultItems;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-medium text-foreground">Recent activity</h2>
          {/* Account Filter Pill */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-[12px] font-normal text-foreground transition-colors hover:bg-muted cursor-pointer"
          >
            <span>{selectedFilter}</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>
        </div>

        <Link
          href="/accounts"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>

      {/* Transactions List */}
      <div className="mt-4 flex flex-col divide-y divide-border/60">
        {items.map((item) => {
          const isDebit = item.direction === "debit";
          return (
            <div
              key={item.id}
              className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1"
            >
              {/* Left Details */}
              <div className="flex flex-col min-w-0 pr-3">
                <span className="truncate text-[13px] font-normal text-foreground">
                  {item.title}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {item.subtitle}
                </span>
              </div>

              {/* Right: Amount & Status Badge */}
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`text-[13px] font-medium tabular ${
                    isDebit ? "text-foreground" : "text-[#16a34a] dark:text-[#49ff8d]"
                  }`}
                >
                  {isDebit ? "-" : "+"}
                  <RevealingAmount amount={item.amount} currency="GHS" />
                </span>

                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-[#49ff8d]">
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
