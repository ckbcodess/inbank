import { RepayAdvanceFlow } from "@/components/loans/RepayAdvanceFlow";

export default async function RepayAdvancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RepayAdvanceFlow advanceId={id} />;
}
