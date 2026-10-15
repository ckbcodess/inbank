import { notFound } from "next/navigation";
import { BeneficiaryKindPage } from "@/components/beneficiaries/BeneficiarySection";

const KINDS = ["bill"];

export default async function BeneficiaryBillersKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind)) notFound();
  return <BeneficiaryKindPage section="billers" kind={kind} />;
}
