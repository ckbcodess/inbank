"use client";

import { use } from "react";
import { TransactionReceipt } from "@/components/transactions/TransactionReceipt";
import { personalRepeatHref } from "@/lib/repeat-payment";

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TransactionReceipt
      id={id}
      list={{ href: "/transactions", label: "Transaction History" }}
      success={{ href: "/payments", label: "Payments" }}
      repeatHref={personalRepeatHref}
    />
  );
}
