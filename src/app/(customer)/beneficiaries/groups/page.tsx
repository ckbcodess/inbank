"use client";

import { GroupListView } from "@/components/beneficiaries/BeneficiaryList";

export default function BeneficiariesGroupsPage() {
  return <GroupListView backTo={{ href: "/beneficiaries", label: "Beneficiaries" }} />;
}
