"use client";

import { Suspense } from "react";
import CreateGroupFlow from "@/components/payments/CreateGroupFlow";

export default function NewPaymentGroupPage() {
  return (
    <Suspense fallback={null}>
      <div className="py-2">
        <CreateGroupFlow />
      </div>
    </Suspense>
  );
}
