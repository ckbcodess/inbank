import { PolicyDetail } from "@/components/insure/PolicyDetail";

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PolicyDetail policyId={id} />;
}
