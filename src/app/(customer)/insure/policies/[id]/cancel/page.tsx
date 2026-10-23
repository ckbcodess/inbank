import { CancelPolicyFlow } from "@/components/insure/CancelPolicyFlow";

export default async function CancelPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CancelPolicyFlow policyId={id} />;
}
