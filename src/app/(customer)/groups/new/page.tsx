import { redirect } from "next/navigation";

export default function LegacyNewGroupPage() {
  redirect("/beneficiaries/groups/new");
}
