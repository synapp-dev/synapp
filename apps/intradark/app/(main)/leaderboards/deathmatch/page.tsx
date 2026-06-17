import { MainSectionShell } from "@/components/organisms/main-section-shell";
import { getDeathmatchLeaderboard } from "@/entities/deathmatch/lib/queries";

import { DeathmatchLeaderboardTable } from "./leaderboard-table";

export const dynamic = "force-dynamic";

export default async function DeathmatchLeaderboardPage() {
  const rows = await getDeathmatchLeaderboard();

  return (
    <MainSectionShell
      title="Deathmatch Leaderboard"
      description="All-time free-for-all stats from Intradark deathmatch servers."
    >
      <DeathmatchLeaderboardTable initialRows={rows} />
    </MainSectionShell>
  );
}
