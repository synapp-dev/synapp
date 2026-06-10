"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SteamEmailDialog } from "@/components/molecules/steam-email-dialog";

interface SteamAuthData {
  steamId64: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

export default function SteamUsernameEmailPage() {
  const router = useRouter();
  const [steamData, setSteamData] = useState<SteamAuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSteamData = () => {
      fetch("/api/auth/steam/pending-data")
        .then((res) => res.json())
        .then((data) => {
          if (data.error || !data.steamData) {
            router.push("/dashboard?error=no_pending_auth");
            return;
          }
          setSteamData(data.steamData);
        })
        .catch((error) => {
          console.error("Error fetching Steam data:", error);
          router.push("/dashboard?error=invalid_steam_data");
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    getSteamData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!steamData) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <SteamEmailDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            router.push("/dashboard");
          }
        }}
        steamData={steamData}
      />
    </div>
  );
}
