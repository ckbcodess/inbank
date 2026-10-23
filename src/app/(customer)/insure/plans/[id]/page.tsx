import { notFound } from "next/navigation";
import { InsureHome } from "@/components/insure/InsureHome";
import { findPlan } from "@/lib/insurance-plans";

/** A plan's own address is Insure with that plan's dialog open, so links, refreshes and Back from the buy flow land on it. */
export default async function InsurePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = findPlan(id);
  if (!plan || !plan.available) notFound();
  return <InsureHome openPlanId={plan.id} />;
}
