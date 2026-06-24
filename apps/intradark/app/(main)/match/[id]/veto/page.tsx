import { redirect } from "next/navigation";

export default async function MatchVetoRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/match/${id}`);
}
