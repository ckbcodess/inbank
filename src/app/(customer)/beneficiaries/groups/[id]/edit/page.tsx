import { redirect } from "next/navigation";

export default async function EditGroupRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/beneficiaries/groups?edit=${id}`);
}
