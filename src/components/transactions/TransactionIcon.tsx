"use client";

import React from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Briefcase,
  CreditCard,
  Droplets,
  GraduationCap,
  Landmark,
  PhoneCall,
  Receipt,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Tv,
  Wifi,
  Zap,
} from "@/components/ui/icons";
import { OperatorLogo } from "@/components/ui/operator-logo";
import { operatorFromName } from "@/lib/operators";
import type { Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface TransactionIconProps {
  transaction?: Transaction;
  category?: string;
  paymentMethod?: string;
  counterparty?: string;
  description?: string;
  direction?: "debit" | "credit" | string;
  size?: number;
  className?: string;
  /** Whether to show the mini incoming arrow indicator for credits on category avatars */
  showDirectionBadge?: boolean;
}

interface ResolvedIconConfig {
  type: "operator" | "lucide";
  operatorName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>;
  bgClass: string;
  iconClass: string;
}

export function resolveTransactionVisuals(input: {
  category?: string;
  paymentMethod?: string;
  counterparty?: string;
  description?: string;
  direction?: "debit" | "credit" | string;
}): ResolvedIconConfig {
  const { category = "", paymentMethod = "", counterparty = "", description = "", direction = "debit" } = input;
  const isCredit = direction === "credit";
  const text = `${counterparty} ${description} ${category} ${paymentMethod}`.toLowerCase();

  // 1. Mobile Money operators (MTN, Telecel, AT, GhanaPay, G-Money)
  const matchedOp = operatorFromName(counterparty) || operatorFromName(paymentMethod) || operatorFromName(description);
  if (matchedOp) {
    return {
      type: "operator",
      operatorName: matchedOp,
      bgClass: "bg-muted/60",
      iconClass: "text-foreground",
    };
  }

  // 2. Specific billers and utility categories
  if (/electricity|ecg|power|prepaid/i.test(text)) {
    return {
      type: "lucide",
      icon: Zap,
      bgClass: "bg-amber-500/10",
      iconClass: "text-amber-600 dark:text-amber-400",
    };
  }
  if (/water|gwcl/i.test(text)) {
    return {
      type: "lucide",
      icon: Droplets,
      bgClass: "bg-cyan-500/10",
      iconClass: "text-cyan-600 dark:text-cyan-400",
    };
  }
  if (/dstv|gotv|netflix|cable|tv|entertainment/i.test(text)) {
    return {
      type: "lucide",
      icon: Tv,
      bgClass: "bg-purple-500/10",
      iconClass: "text-purple-600 dark:text-purple-400",
    };
  }
  if (/school|tuition|university|education|college/i.test(text)) {
    return {
      type: "lucide",
      icon: GraduationCap,
      bgClass: "bg-blue-500/10",
      iconClass: "text-blue-600 dark:text-blue-400",
    };
  }
  if (/bill|gcb pay|invoice|tax|gra/i.test(text) || paymentMethod === "bill") {
    return {
      type: "lucide",
      icon: Receipt,
      bgClass: "bg-indigo-500/10",
      iconClass: "text-indigo-600 dark:text-indigo-400",
    };
  }

  // 3. Internet & Data vs Airtime
  if (/data|internet|wifi|broadband|fiber|fibre|mifi|turbonet/i.test(text) || paymentMethod === "data") {
    return {
      type: "lucide",
      icon: Wifi,
      bgClass: "bg-sky-500/10",
      iconClass: "text-sky-600 dark:text-sky-400",
    };
  }
  if (/airtime|air time|call|voice/i.test(text) || paymentMethod === "airtime") {
    return {
      type: "lucide",
      icon: PhoneCall,
      bgClass: "bg-orange-500/10",
      iconClass: "text-orange-600 dark:text-orange-400",
    };
  }

  // 4. Salary & Payroll / Income
  if (/salary|payroll|allowance|stipend|wages|employer/i.test(text) || category.toLowerCase() === "income") {
    return {
      type: "lucide",
      icon: Briefcase,
      bgClass: "bg-emerald-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    };
  }

  // 5. Internal transfers between own accounts
  if (paymentMethod === "own-account" || /between my accounts|transfer to savings|own account/i.test(text)) {
    return {
      type: "lucide",
      icon: ArrowLeftRight,
      bgClass: "bg-muted text-muted-foreground",
      iconClass: "text-foreground",
    };
  }

  // 6. Investments & Term Deposits
  if (paymentMethod === "term-deposit" || /investment|deposit|savings|treasury/i.test(text)) {
    return {
      type: "lucide",
      icon: TrendingUp,
      bgClass: "bg-emerald-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    };
  }

  // 7. Shopping, Supermarkets, POS & Card transactions
  if (paymentMethod === "card" || /pos|card payment|debit card/i.test(text)) {
    return {
      type: "lucide",
      icon: CreditCard,
      bgClass: "bg-teal-500/10",
      iconClass: "text-teal-600 dark:text-teal-400",
    };
  }
  if (/shopping|groceries|market|supermarket|amazon|melcom|shoprite/i.test(text)) {
    return {
      type: "lucide",
      icon: ShoppingBag,
      bgClass: "bg-rose-500/10",
      iconClass: "text-rose-600 dark:text-rose-400",
    };
  }

  // 8. Bank transfers (GIP, ACH, RTGS, PAPSS, Interbank)
  if (
    /bank|gip|ach|rtgs|papss|transfer/i.test(text) ||
    ["gip", "ach", "rtgs", "papss", "wallet-to-bank"].includes(paymentMethod)
  ) {
    return {
      type: "lucide",
      icon: Landmark,
      bgClass: "bg-blue-500/10",
      iconClass: "text-blue-600 dark:text-blue-400",
    };
  }

  // 9. Fees, Charges, Levies
  if (/fee|charge|levy|commission/i.test(text)) {
    return {
      type: "lucide",
      icon: ReceiptText,
      bgClass: "bg-muted",
      iconClass: "text-muted-foreground",
    };
  }

  // 10. Default fallback by direction
  if (isCredit) {
    return {
      type: "lucide",
      icon: ArrowDownLeft,
      bgClass: "bg-pill-success",
      iconClass: "text-success",
    };
  }
  return {
    type: "lucide",
    icon: ArrowUpRight,
    bgClass: "bg-tile",
    iconClass: "text-muted-foreground",
  };
}

export function TransactionIcon({
  transaction,
  category,
  paymentMethod,
  counterparty,
  description,
  direction,
  size = 36,
  className,
  showDirectionBadge = true,
}: TransactionIconProps) {
  const effCategory = category ?? transaction?.category;
  const effMethod = paymentMethod ?? transaction?.paymentMethod;
  const effCounterparty = counterparty ?? transaction?.counterparty;
  const effDescription = description ?? transaction?.description;
  const effDirection = direction ?? transaction?.direction ?? (transaction && transaction.amount < 0 ? "debit" : "credit");

  const config = resolveTransactionVisuals({
    category: effCategory,
    paymentMethod: effMethod,
    counterparty: effCounterparty,
    description: effDescription,
    direction: effDirection,
  });

  const isCredit = effDirection === "credit";
  const showCreditBadge = showDirectionBadge && isCredit && config.icon !== ArrowDownLeft;
  const iconSize = Math.round(size * 0.48);

  return (
    <div className="relative inline-flex shrink-0">
      {config.type === "operator" ? (
        <OperatorLogo name={config.operatorName} size={size} className={className} />
      ) : (
        <div
          style={{ width: size, height: size }}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full transition-transform",
            config.bgClass,
            config.iconClass,
            className,
          )}
        >
          {config.icon && <config.icon size={iconSize} strokeWidth={1.8} />}
        </div>
      )}

      {/* Credit direction pip */}
      {showCreditBadge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-card border border-border/80 shadow-2xs"
          title="Incoming credit"
        >
          <ArrowDownLeft size={9} className="text-success" />
        </span>
      )}
    </div>
  );
}

export default TransactionIcon;
