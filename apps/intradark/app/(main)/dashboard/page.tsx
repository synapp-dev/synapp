"use client";

import { useEffect } from "react";

export default function DashboardPage() {
  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|; )steamId=([^;]+)/);
      const steamIdFromCookie = match ? decodeURIComponent(match[1] || "") : "";
      const existing = typeof window !== "undefined" ? localStorage.getItem("steamId") : null;
      const steamId = steamIdFromCookie || existing;
      if (steamId) {
        console.log("SteamID:", steamId);
        try {
          localStorage.setItem("steamId", steamId);
        } catch {}
      }
    } catch {}
  }, []);

  return <div>Dashboard</div>;
}
