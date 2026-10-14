"use client";

import { useSearchParams } from "next/navigation";
import { FormPageSkeleton, StepListSkeleton } from "@/components/states/PageSkeletons";

export default function Loading() {
  const params = useSearchParams();
  // The bank rung opens on "Which bank do you want to send to?"; once a recipient is chosen it's a form.
  const isBankChoice = params.get("rail") === "bank" && !params.get("recipient") && !params.get("category");
  return isBankChoice ? <StepListSkeleton /> : <FormPageSkeleton />;
}
