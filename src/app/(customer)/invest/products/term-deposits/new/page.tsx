import { Suspense } from "react";
import { NewDepositFlow } from "@/components/invest/NewDepositFlow";

export default function NewTermDepositPage() {
  return (
    <Suspense fallback={null}>
      <NewDepositFlow />
    </Suspense>
  );
}
