"use client";

import { Suspense } from "react";
import { StandingOrderFlow } from "@/components/payments/StandingOrderFlow";

export default function NewStandingOrderPage() {
  return (
    <div className="py-2">
      {/* The flow reads ?from= (useSearchParams needs a Suspense boundary). */}
      <Suspense>
        <StandingOrderFlow />
      </Suspense>
    </div>
  );
}
