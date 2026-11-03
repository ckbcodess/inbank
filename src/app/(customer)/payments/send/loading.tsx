"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FormPageSkeleton, StepListSkeleton } from "@/components/states/PageSkeletons";

// useSearchParams suspends. Without its own boundary, that suspension bubbles up to the /payments loading
// boundary and shows the hub skeleton instead of this route's skeleton.
function SendSkeleton() {
  const params = useSearchParams();
  // The bank rung opens on "Which bank do you want to send to?"; once a recipient is chosen it's a form.
  const isBankChoice = params.get("rail") === "bank" && !params.get("recipient") && !params.get("category");
  return isBankChoice ? <StepListSkeleton /> : <FormPageSkeleton />;
}

export default function Loading() {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <SendSkeleton />
    </Suspense>
  );
}
