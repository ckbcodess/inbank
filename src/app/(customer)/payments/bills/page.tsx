import { Suspense } from "react";
import { PaymentFlow } from "@/components/payments/PaymentFlow";

export default function PayBillsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentFlow group="bills" />
    </Suspense>
  );
}
