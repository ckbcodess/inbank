import { Suspense } from "react";
import { BuyFlow } from "@/components/invest/BuyFlow";

export default function BuyPage() {
  return (
    <Suspense fallback={null}>
      <BuyFlow />
    </Suspense>
  );
}
