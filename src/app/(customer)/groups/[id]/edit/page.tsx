import { redirect } from "next/navigation";

export default async function LegacyEditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/beneficiaries/groups/${id}/edit`);
}
