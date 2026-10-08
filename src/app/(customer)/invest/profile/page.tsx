import { CreateProfileFlow } from "@/components/invest/CreateProfileFlow";

export default async function InvestmentProfilePage({ searchParams }: { searchParams: Promise<{ next?: string; label?: string }> }) {
  const { next, label } = await searchParams;
  // Only our own investment screens can be the next step.
  const intent = next && next.startsWith("/invest/") && !next.startsWith("//") ? { href: next, label: label?.slice(0, 60) || "your investment" } : undefined;
  return <CreateProfileFlow intent={intent} />;
}
