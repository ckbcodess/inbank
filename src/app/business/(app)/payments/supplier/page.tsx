import { Suspense } from "react";
import SupplierPaymentFlow from "@/components/corporate/payments/SupplierPaymentFlow";

export default function PaySupplierPage() {
  return (
    <Suspense fallback={null}>
      <SupplierPaymentFlow />
    </Suspense>
  );
}
