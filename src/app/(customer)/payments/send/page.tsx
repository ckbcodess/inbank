import { Suspense } from "react";
import { PaymentFlow } from "@/components/payments/PaymentFlow";

export default function SendMoneyPage() {
  return (
    <Suspense fallback={null}>
      <PaymentFlow group="send" />
    </Suspense>
  );
}
