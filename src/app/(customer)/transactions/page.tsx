"use client";

/**
 * Transaction List — the reusable list surface (section 2) in its global,
 * all-accounts context. State model 13.1, supplied by the shared component.
 * `?account=<id>` opens it filtered to one account (Account Details → "View
 * All Transactions"); the filter chip clears it like any other.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TransactionList from "@/components/TransactionList";
import { transactionsForProfile } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

function TransactionsContent() {
  const activeProfile = useSession((s) => s.activeProfile);
  const transactions = transactionsForProfile(activeProfile?.kind);
  const accountId = useSearchParams().get("account") ?? undefined;

  return (
    <div className="flex flex-col">
      <TransactionList key={accountId ?? "all"} transactions={transactions} initialAccountId={accountId} />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsContent />
    </Suspense>
  );
}
