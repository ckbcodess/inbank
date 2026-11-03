import { redirect } from "next/navigation";

/** Closing a deposit is Redeem Term Deposit, In Full; this keeps old links working. */
export default async function CloseDepositPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/invest/term-deposits/${id}/redeem`);
}
