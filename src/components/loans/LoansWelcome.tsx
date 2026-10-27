"use client";

/**
 * "Welcome to Loans", shown once to a customer who has no advance yet. "Get Started" only closes it: nothing opens,
 * nothing is requested.
 */

import { CalendarClock, HandCoins, Wallet } from "@/components/ui/icons";
import { ProductWelcome } from "@/components/ui/product-welcome";
import { useLoans, useLoansHydrated, useMyLoans } from "@/lib/loans";

const BENEFITS = [
  { icon: HandCoins, title: "Up to 80% of your pay", detail: "Take an advance of up to 80% of your salary, national service allowance or pension." },
  { icon: Wallet, title: "See the cost first", detail: "You see the fees, the interest and what you repay before you confirm." },
  { icon: CalendarClock, title: "Repay from your next credit", detail: "It is repaid when your pay arrives, and repaying early costs less." },
] as const;

export function LoansWelcome() {
  const hydrated = useLoansHydrated();
  const { ownerId, welcomed, advances } = useMyLoans();
  const markWelcomed = useLoans((s) => s.markWelcomed);

  return (
    <ProductWelcome
      title="Welcome to Loans"
      benefits={BENEFITS}
      open={hydrated && ownerId !== "guest" && !welcomed && advances.length === 0}
      onClose={() => markWelcomed(ownerId)}
    />
  );
}
