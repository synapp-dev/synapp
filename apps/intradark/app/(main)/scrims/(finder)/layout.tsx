import { getScrimBootstrap } from "@/entities/scrims/lib/queries";
import { ScrimsShell } from "@/entities/scrims/components/scrims-shell";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";

export const dynamic = "force-dynamic";

export default async function ScrimFinderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getCurrentUserProfiles();
  const steamid64 = viewer?.userProfile.steam_profile_id ?? null;
  const bootstrap = await getScrimBootstrap(steamid64);

  return <ScrimsShell bootstrap={bootstrap}>{children}</ScrimsShell>;
}
