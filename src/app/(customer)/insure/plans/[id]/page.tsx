import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/insure/PlanDetail";
import { findPlan } from "@/lib/insurance-plans";

export default async function InsurePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = findPlan(id);
  if (!plan || !plan.available) notFound();
  return <PlanDetail planId={plan.id} />;
}
