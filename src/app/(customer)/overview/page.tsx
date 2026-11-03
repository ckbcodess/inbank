"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OverviewContent } from "@/components/dashboard/v2/OverviewContent";

/** The switched-to account lives in the URL so a refresh keeps it; leaving the dashboard and coming back lands on the default again. */
function OverviewWithParams() {
  return <OverviewContent accountId={useSearchParams().get("account")} />;
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewWithParams />
    </Suspense>
  );
}
