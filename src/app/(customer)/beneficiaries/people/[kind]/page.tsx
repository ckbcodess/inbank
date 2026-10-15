import { notFound } from "next/navigation";
import { BeneficiaryKindPage } from "@/components/beneficiaries/BeneficiarySection";

const KINDS = ["bank", "wallet", "proxy", "international"];

export default async function BeneficiaryPeopleKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind)) notFound();
  return <BeneficiaryKindPage section="people" kind={kind} />;
}
