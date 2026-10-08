import { Suspense } from "react";
import { InvestHome } from "@/components/invest/InvestHome";

export default function InvestPage() {
  return (
    <Suspense fallback={null}>
      <InvestHome />
    </Suspense>
  );
}
