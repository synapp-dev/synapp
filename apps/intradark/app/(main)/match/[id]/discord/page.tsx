import { redirect } from "next/navigation";

export default async function MatchDiscordRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/match/${id}`);
}
