"use client";

/**
 * Business Transactions — the company's ledger across all its accounts, with the filters a finance team uses
 * (account, direction, date, status, search). `?account=<id>` opens it on one account, from Account Details.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TransactionList from "@/components/TransactionList";
import { businessAccounts, businessTransactions } from "@/lib/corporate/accounts";
import { businessRepeatHref } from "@/lib/corporate/repeat-payment";

function BusinessTransactionsContent() {
  const accountId = useSearchParams().get("account") ?? undefined;

  return (
    <div className="flex flex-col">
      <TransactionList
        key={accountId ?? "all"}
        transactions={businessTransactions()}
        accounts={businessAccounts()}
        startHref="/business/payments"
        repeatHref={businessRepeatHref}
        initialAccountId={accountId}
      />
    </div>
  );
}

export default function BusinessTransactionsPage() {
  return (
    <Suspense fallback={null}>
      <BusinessTransactionsContent />
    </Suspense>
  );
}
