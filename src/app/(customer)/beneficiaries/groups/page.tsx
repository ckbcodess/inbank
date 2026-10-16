import { redirect } from "next/navigation";

export default function BeneficiariesGroupsIndexPage() {
  redirect("/beneficiaries?tab=groups");
}
