import { AdvanceDetail } from "@/components/loans/AdvanceDetail";

export default async function AdvancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdvanceDetail advanceId={id} />;
}
