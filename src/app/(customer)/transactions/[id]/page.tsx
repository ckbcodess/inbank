"use client";

/**
 * Personal transaction receipt, as its own page. The body is shared with business (`TransactionReceipt`); this route
 * only says where it goes back to and which repeat applies. Opened from a payment's success screen with `?from=success`.
 */

import { use } from "react";
import { TransactionReceipt } from "@/components/transactions/TransactionReceipt";
import { personalRepeatHref } from "@/lib/repeat-payment";

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TransactionReceipt
      id={id}
      list={{ href: "/transactions", label: "Transactions" }}
      success={{ href: "/overview", label: "Overview" }}
      repeatHref={personalRepeatHref}
    />
  );
}
