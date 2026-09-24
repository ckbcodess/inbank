"use client";

/**
 * Place a request — statements, cheque books and bank letters for one account.
 * Reached from Account Details; `?type=statement|cheque-book|letter` skips the chooser.
 */

import { Suspense, use } from "react";
import PageHeader from "@/components/layout/PageHeader";
import RequestFlow from "@/components/accounts/RequestFlow";
import { findAccount } from "@/lib/mock-data";

export default function AccountRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const account = findAccount(id);

  if (!account) {
    return <PageHeader title="Account not found" backTo={{ href: "/accounts", label: "Accounts" }} />;
  }

  return (
    <Suspense fallback={null}>
      <RequestFlow account={account} />
    </Suspense>
  );
}
