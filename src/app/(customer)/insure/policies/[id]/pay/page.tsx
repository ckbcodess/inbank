import { PayArrearsFlow } from "@/components/insure/PayArrearsFlow";

export default async function PayArrearsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayArrearsFlow policyId={id} />;
}
