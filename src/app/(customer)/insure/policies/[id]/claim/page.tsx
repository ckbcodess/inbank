import { ClaimFlow } from "@/components/insure/ClaimFlow";

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClaimFlow policyId={id} />;
}
