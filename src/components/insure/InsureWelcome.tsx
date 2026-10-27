"use client";

/**
 * "Welcome to Insure", shown once to a customer who holds no policy yet. "Get Started" only closes it: nothing opens,
 * no profile is created.
 */

import { FileText, ShieldCheck, Wallet } from "@/components/ui/icons";
import { ProductWelcome } from "@/components/ui/product-welcome";
import { PROVIDER } from "@/lib/insurance-plans";
import { useInsurance, useInsuranceHydrated, useMyInsurance } from "@/lib/insurance";

const BENEFITS = [
  { icon: ShieldCheck, title: "Plans you can compare", detail: `Choose from plans provided by ${PROVIDER}, and see the cost before you confirm.` },
  { icon: Wallet, title: "Pay from your account", detail: "Your premium is deducted from the account and days you choose. You can cancel at any time." },
  { icon: FileText, title: "One profile, once", detail: "You set up your insurance profile once, and every plan uses it." },
] as const;

export function InsureWelcome() {
  const hydrated = useInsuranceHydrated();
  const { ownerId, welcomed, policies } = useMyInsurance();
  const markWelcomed = useInsurance((s) => s.markWelcomed);

  return (
    <ProductWelcome
      title="Welcome to Insure"
      benefits={BENEFITS}
      open={hydrated && ownerId !== "guest" && !welcomed && policies.length === 0}
      onClose={() => markWelcomed(ownerId)}
    />
  );
}
