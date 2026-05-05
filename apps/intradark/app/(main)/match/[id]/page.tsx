import { redirect } from "next/navigation";

export default async function MatchIdIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/match/${id}/draft`);
}
