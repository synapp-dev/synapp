"use client";

import { Button } from "@workspace/ui/components/button";
import { useState } from "react";

interface SteamLoginButtonProps {
  returnUrl?: string;
  className?: string;
}

export function SteamLoginButton({
  returnUrl = "/home",
  className,
}: SteamLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSteamLogin = async () => {
    setIsLoading(true);
    try {
      // Redirect to Steam authentication
      const authUrl = `/api/auth/steam?returnUrl=${encodeURIComponent(returnUrl)}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error("Steam login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSteamLogin}
      disabled={isLoading}
      className={`w-full gap-2 ${className || ""}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.63 3.87 10.35 9.08 11.82l.92-3.5c-2.5-.75-4.5-3-4.5-5.82 0-3.31 2.69-6 6-6s6 2.69 6 6c0 2.82-2 5.07-4.5 5.82l.92 3.5C20.13 22.35 24 17.63 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      )}
      {isLoading ? "Connecting to Steam..." : "Sign in with Steam"}
    </Button>
  );
}
