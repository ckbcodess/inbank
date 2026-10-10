"use client";

import React from "react";
import Link from "next/link";
import { TransactionIcon } from "./TransactionIcon";
import { getTransactionType } from "@/lib/transaction-type";
import { findAccount, type Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface TransactionItemProps {
  transaction: Transaction;
  /** Custom destination href. Defaults to `/transactions/${transaction.id}` */
  href?: string;
  /** Optional click handler if not using Link navigation */
  onClick?: () => void;
  /** Whether amounts are visible (respects privacy toggle). Defaults to true */
  showAmounts?: boolean;
  /** Compact density (e.g. for dashboard widgets vs full list) */
  density?: "comfortable" | "compact";
  className?: string;
}

function formatAccountDisplay(accountId: string): string {
  const acc = findAccount(accountId);
  if (!acc) return "";
  const cleanName = acc.name.replace(/\s+Account$/i, "");
  const cleanNum = acc.number.replace(/\s+/g, "");
  const last4 = cleanNum.slice(-4);
  return `${cleanName} •••${last4}`;
}

function formatTransactionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export function TransactionItem({
  transaction,
  href,
  onClick,
  showAmounts = true,
  density = "comfortable",
  className,
}: TransactionItemProps) {
  const t = transaction;
  const isCredit = t.direction === "credit";
  const isFailed = typeof t.state === "string" && (t.state.startsWith("failed") || t.state === "reversed" || t.state === "disputed");
  const isPending = t.state === "pending" || t.state === "awaiting-approval";

  // Amount formatting
  const prefix = isCredit ? "+ " : "− ";
  const formattedAmount = showAmounts
    ? `${t.currency} ${Math.abs(t.amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "••••••";

  const amountColor = isFailed
    ? "text-destructive-text font-normal"
    : isCredit
      ? "text-success font-medium"
      : "text-foreground font-normal";

  const accountSuffix = t.accountId ? formatAccountDisplay(t.accountId) : "";
  const typeDisplay = getTransactionType(t);
  const dateDisplay = formatTransactionDate(t.date);

  const content = (
    <div
      className={cn(
        "group flex w-full items-center gap-3.5 rounded-xl text-left transition-colors cursor-pointer select-none",
        density === "comfortable" ? "px-3 py-3 sm:py-3.5 sm:px-4 hover:bg-tile-hover" : "px-2 py-2 hover:bg-tile-hover",
        className,
      )}
    >
      {/* Semantic Icon with pastel category tint & optional credit badge */}
      <TransactionIcon
        transaction={t}
        size={density === "comfortable" ? 38 : 34}
        className="group-hover:scale-105 transition-transform"
      />

      {/* Counterparty & Metadata */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-normal text-foreground text-[14px] leading-tight truncate">
          {t.counterparty || t.description}
        </span>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground truncate">
          <span className="truncate">{typeDisplay}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="tabular">{dateDisplay}</span>
        </div>
      </div>

      {/* Amount & Status Indicator */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <span className={cn("tabular text-[14px]", amountColor)}>
          {showAmounts ? prefix : ""}
          {formattedAmount}
        </span>

        {isFailed ? (
          <span className="text-[11.5px] text-destructive-text font-medium">Failed</span>
        ) : isPending ? (
          <span className="text-[11.5px] text-warning-text font-medium">Pending</span>
        ) : accountSuffix ? (
          <span className="text-[11.5px] text-muted-foreground truncate max-w-[120px] sm:max-w-none">
            {accountSuffix}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">{t.category || "Complete"}</span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/transactions/${t.id}`} className="block w-full">
      {content}
    </Link>
  );
}

export default TransactionItem;
