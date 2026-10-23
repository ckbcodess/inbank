import { CreateInsuranceProfileFlow } from "@/components/insure/CreateInsuranceProfileFlow";

export default async function InsuranceProfilePage({ searchParams }: { searchParams: Promise<{ next?: string; label?: string }> }) {
  const { next, label } = await searchParams;
  // Only our own insurance screens can be the next step.
  const intent = next && next.startsWith("/insure/") && !next.startsWith("//") ? { href: next, label: label?.slice(0, 60) || "your plan" } : undefined;
  return <CreateInsuranceProfileFlow intent={intent} />;
}
