import { UpdateBeneficiariesFlow } from "@/components/insure/UpdateBeneficiariesFlow";

export default async function UpdateBeneficiariesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UpdateBeneficiariesFlow policyId={id} />;
}
