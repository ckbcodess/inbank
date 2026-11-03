"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AccountsContent } from "@/components/accounts/AccountsContent";

function AccountsWithParams() {
  return <AccountsContent linkSource={useSearchParams().get("link_source") === "true"} />;
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsContent loading />}>
      <AccountsWithParams />
    </Suspense>
  );
}
