"use client";

/**
 * Transaction List — the reusable list surface (section 2) in its global,
 * all-accounts context. State model 13.1, supplied by the shared component.
 */

import PageHeader from "@/components/layout/PageHeader";
import TransactionList from "@/components/TransactionList";
import { transactionsForProfile } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

export default function TransactionsPage() {
  const activeProfile = useSession((s) => s.activeProfile);
  const transactions = transactionsForProfile(activeProfile?.kind);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Transactions"
        description="All activity across the accounts in this banking relationship."
      />
      <TransactionList transactions={transactions} />
    </div>
  );
}
