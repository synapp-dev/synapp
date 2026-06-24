/**
 * Thin shell for the live match room. The real lobby UI (teams + phase panel) is
 * rendered by `MatchRoom` at the index route; the mock sandbox playground lives
 * separately under entities/match-lobby for the admin sandbox.
 */
export default function MatchLobbyRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>;
}
