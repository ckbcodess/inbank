import { notFound } from "next/navigation";
import { BuyPlanFlow } from "@/components/insure/BuyPlanFlow";
import { findPlan } from "@/lib/insurance-plans";

export default async function BuyPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = findPlan(id);
  if (!plan || !plan.available) notFound();
  return <BuyPlanFlow planId={plan.id} />;
}
