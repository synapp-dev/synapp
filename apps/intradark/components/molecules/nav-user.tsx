"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

import { LogOut, Settings, User } from "lucide-react";
import { SteamLoginButton } from "@/components/atoms/steam-login-button";

export function NavUser() {
  const router = useRouter();
  const [steamId, setSteamId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|; )steamId=([^;]+)/);
      const id = match ? decodeURIComponent(match[1] || "") : "";
      setSteamId(id || null);
    } catch {
      setSteamId(null);
    }
  }, []);

  if (!steamId) {
    return <SteamLoginButton className="w-full" />;
  }

  const handleSignOut = () => {
    try {
      document.cookie = "steamId=; path=/; max-age=0";
      try { localStorage.removeItem("steamId"); } catch {}
      setSteamId(null);
      router.push("/news");
    } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 rounded-full px-3">
          <span className="truncate max-w-[160px]">{steamId}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{steamId}</p>
            <p className="text-xs leading-none text-muted-foreground">
              SteamID
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
