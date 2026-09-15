import { Suspense } from "react";
import { RequestCardFlow } from "@/components/cards/RequestCardFlow";

export default function RequestCardPage() {
  return (
    <Suspense fallback={null}>
      <RequestCardFlow />
    </Suspense>
  );
}
