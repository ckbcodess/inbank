import { redirect } from "next/navigation";

/** The new-deposit flow lives under the Term Deposit product page now; this keeps old links working. */
export default async function OldNewTermDepositPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams;
  redirect(`/invest/products/term-deposits/new${days ? `?days=${encodeURIComponent(days)}` : ""}`);
}
