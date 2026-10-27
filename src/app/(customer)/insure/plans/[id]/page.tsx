import { notFound } from "next/navigation";
import { PlanPage } from "@/components/insure/PlanPage";
import { findPlan } from "@/lib/insurance-plans";

/** A plan's own page: the customer's policies under it, what it is, and one button to start. */
export default async function InsurePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = findPlan(id);
  if (!plan || !plan.available) notFound();
  return <PlanPage planId={plan.id} />;
}
