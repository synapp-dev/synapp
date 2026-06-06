import { MatchLobbyLayout } from "@/entities/match-lobby";

export default async function MatchLobbyRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MatchLobbyLayout matchId={id}>{children}</MatchLobbyLayout>;
}
