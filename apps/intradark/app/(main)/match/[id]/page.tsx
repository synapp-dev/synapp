import { MatchRoom } from "@/entities/match-lobby";

export default async function MatchIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MatchRoom matchId={id} />;
}
