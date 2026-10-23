import { PolicyStatement } from "@/components/insure/PolicyStatement";

export default async function PolicyStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PolicyStatement policyId={id} />;
}
