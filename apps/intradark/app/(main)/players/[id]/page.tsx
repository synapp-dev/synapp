import { PlayerProfileMock } from "@/components/organisms/player-profile-mock";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="-mx-6">
      <PlayerProfileMock playerId={id} />
    </div>
  );
}
