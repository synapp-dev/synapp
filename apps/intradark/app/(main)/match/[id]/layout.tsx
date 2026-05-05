import { MatchLobbyLayout } from "@/components/organisms/match-lobby/match-lobby-layout";

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
