"use client";

/**
 * "Welcome to Invest", shown once to someone who has no securities account yet. "Get Started" only closes it: nothing
 * opens, nothing is created, the person simply lands on Invest and looks around.
 */

import { CalendarClock, Landmark, TrendingUp } from "@/components/ui/icons";
import { ProductWelcome } from "@/components/ui/product-welcome";
import { useMyTreasury, useTreasury, useTreasuryHydrated } from "@/lib/treasury";

const BENEFITS = [
  { icon: TrendingUp, title: "See what you’ll earn first", detail: "You see what you pay and what you get back before you confirm." },
  { icon: CalendarClock, title: "Choose how long", detail: "From 91 days to a year, or longer with bonds." },
  { icon: Landmark, title: "Grow your money with confidence", detail: "Choose between GCB Term Deposits and Government of Ghana Treasury Bills & Bonds." },
] as const;

export function InvestWelcome() {
  const hydrated = useTreasuryHydrated();
  const { ownerId, welcomed } = useMyTreasury();
  const markWelcomed = useTreasury((s) => s.markWelcomed);

  return (
    <ProductWelcome
      title="Welcome to Invest"
      benefits={BENEFITS}
      open={hydrated && ownerId !== "guest" && !welcomed}
      onClose={() => markWelcomed(ownerId)}
    />
  );
}
