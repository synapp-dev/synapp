import {
  useFaceitProfile,
  useLeetifyProfile,
  usePlayerByVanityUrl,
  usePlayerStore,
} from "@/hooks/players";
import {
  Card,
  CardTitle,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card";
import Image from "next/image";

export function FaceitCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");
  const {
    profile: faceitProfile,
    isLoading: faceitLoading,
    error: faceitError,
  } = useFaceitProfile(
    steamId64 || "",
    leetifyProfile?.meta?.faceitNickname || ""
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image
            src="/images/logos/faceit-logo-colored.svg"
            alt="FACEIT"
            width={20}
            height={20}
          />
          FACEIT
        </CardTitle>
      </CardHeader>
      <CardContent>
        {faceitLoading && <div>Loading...</div>}
        {faceitError && <div>Error: {faceitError}</div>}
        {faceitProfile?.payload?.nickname}
      </CardContent>
    </Card>
  );
}
