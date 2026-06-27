"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

interface SteamEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steamData: {
    steamId64: string;
    personaname: string;
    avatarfull: string;
    profileurl: string;
  };
  /** When true, skips API + Supabase; validates email locally then calls `onSandboxComplete`. */
  sandbox?: boolean;
  onSandboxComplete?: () => void;
}

export function SteamEmailDialog({
  open,
  onOpenChange,
  steamData,
  sandbox = false,
  onSandboxComplete,
}: SteamEmailDialogProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate email
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      if (sandbox) {
        onSandboxComplete?.();
        setIsLoading(false);
        onOpenChange(false);
        return;
      }

      const controller = new AbortController();
      const requestTimeoutMs = 60_000;
      const requestTimeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);

      let response: Response;
      try {
        response = await fetch("/api/auth/steam/create-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim() || undefined,
            email,
            steamId64: steamData.steamId64,
          }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        window.clearTimeout(requestTimeout);
        const aborted =
          fetchErr instanceof DOMException && fetchErr.name === "AbortError";
        setError(
          aborted
            ? "Request timed out. Check your connection and try again."
            : "Could not reach the server. Try again in a moment.",
        );
        setIsLoading(false);
        return;
      }
      window.clearTimeout(requestTimeout);

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Clear the pending auth cookie
      document.cookie = "steam_pending_auth=; path=/; max-age=0";

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const dashboardUrl = `${appUrl.replace(/\/$/, "")}/dashboard`;

      // If we have a hashed token, verify OTP to auto sign-in (no magic link click needed)
      if (data.hashedToken) {
        const { createBrowserClient } = await import("@/utils/supabase/client");
        const supabase = createBrowserClient();
        const otpTimeoutMs = 30_000;
        type VerifyResult = Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
        const otpResult = await Promise.race<VerifyResult | { timedOut: true }>([
          supabase.auth.verifyOtp({
            token_hash: data.hashedToken,
            type: "email",
          }),
          new Promise((resolve) =>
            setTimeout(() => resolve({ timedOut: true as const }), otpTimeoutMs),
          ),
        ]);

        if ("timedOut" in otpResult) {
          setError(
            "Sign-in timed out. Use the magic link in your email or try again.",
          );
          setIsLoading(false);
          if (data.magicLink) {
            window.location.href = data.magicLink as string;
          }
          return;
        }

        if (!otpResult.error) {
          window.location.href = dashboardUrl;
          return;
        }
        console.error("Error verifying OTP:", otpResult.error);
        // Fall through to magic link redirect
      }

      // Fallback: redirect to magic link to complete sign-in
      if (data.magicLink) {
        window.location.href = data.magicLink;
        return;
      }

      // No magic link - try OTP sign-in or redirect anyway
      if (data.needsSignIn) {
        const { createBrowserClient } = await import("@/utils/supabase/client");
        const supabase = createBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email: data.email,
        });
        if (signInError) {
          console.error("Error signing in:", signInError);
        }
      }

      window.location.href = dashboardUrl;
    } catch (err) {
      console.error("Error creating account:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Account</DialogTitle>
          <DialogDescription>
            We need your email address to create your account and link it to your
            Steam profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Steam Profile Preview */}
          <div className="flex flex-col items-center gap-2">
            {steamData.avatarfull && (
              <Image
                src={steamData.avatarfull}
                alt={steamData.personaname}
                width={64}
                height={64}
                className="rounded-full"
              />
            )}
            <p className="text-sm font-medium">{steamData.personaname}</p>
            <p className="text-xs text-muted-foreground">
              Steam ID: {steamData.steamId64}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username / Alias</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
