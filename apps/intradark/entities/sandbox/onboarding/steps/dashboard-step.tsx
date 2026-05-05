"use client";

import * as React from "react";
import Image from "next/image";
import { Gamepad2, User } from "lucide-react";

import { DiscordLinkDialog } from "@/components/molecules/discord-link-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { useOnboardingSandbox } from "../onboarding-sandbox-context";

export function DashboardStep() {
  const { profiles, flags, eligibility } = useOnboardingSandbox();
  const [cooldown, setCooldown] = React.useState(
    flags.cooldownSecondsRemaining ?? 0,
  );

  React.useEffect(() => {
    if (flags.cooldownSecondsRemaining == null) return;
    setCooldown(flags.cooldownSecondsRemaining);
  }, [flags.cooldownSecondsRemaining]);

  React.useEffect(() => {
    if (!flags.cooldownSecondsRemaining) return;
    const t = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [flags.cooldownSecondsRemaining]);

  if (!profiles) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Eligibility: <span className="font-mono">{eligibility}</span> (mock)
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-center text-muted-foreground">
              You are not signed in. Sign in with Steam to continue.
            </p>
            <Button type="button" variant="secondary" disabled>
              Sign in with Steam (use dock / steps in sandbox)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userProfile, steamProfile } = profiles;
  const displayName =
    userProfile.display_name ??
    userProfile.username ??
    userProfile.email ??
    "User";
  const needsDiscordLink = userProfile.discord_user_id == null;

  const mm = Math.floor(cooldown / 60);
  const ss = cooldown % 60;
  const cooldownLabel = `${mm}:${ss.toString().padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <DiscordLinkDialog needsDiscordLink={needsDiscordLink} />

      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sandbox profile preview · eligibility{" "}
          <span className="font-mono">{eligibility}</span>
        </p>
      </div>

      {flags.banned ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p className="font-semibold">Account banned</p>
          <p className="mt-1 text-xs text-red-200/80">
            Reason placeholder — connect moderation policy in production.
          </p>
        </div>
      ) : null}

      {flags.cooldownSecondsRemaining != null && cooldown > 0 ? (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold">Queue cooldown</p>
          <p className="mt-1 text-xs text-amber-100/85">
            Eligible again in{" "}
            <span className="font-mono tabular-nums">{cooldownLabel}</span>{" "}
            (mock countdown)
          </p>
        </div>
      ) : null}

      {eligibility === "discord-only" ? (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <p className="font-medium">Discord linked, Steam missing</p>
          <p className="mt-1 text-xs text-sky-100/80">
            Production UI TBD — link Steam to play (see product spec).
          </p>
        </div>
      ) : null}

      {eligibility === "both-linked-not-banned" &&
      !flags.banned &&
      !(flags.cooldownSecondsRemaining && cooldown > 0) ? (
        <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p className="font-semibold">Ready to queue</p>
          <p className="text-xs text-emerald-100/85">
            Steam + Discord linked (mock eligibility).
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Avatar className="h-12 w-12">
              {userProfile.avatar_url ? (
                <AvatarImage src={userProfile.avatar_url} alt={displayName} />
              ) : null}
              <AvatarFallback>
                <User className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>Account (mock)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Display name</p>
              <p>{displayName}</p>
            </div>
            {userProfile.email ? (
              <div>
                <p className="text-muted-foreground">Email</p>
                <p>{userProfile.email}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1">
              {userProfile.is_verified ? (
                <Badge variant="secondary">Verified</Badge>
              ) : null}
              {userProfile.is_premium ? (
                <Badge variant="secondary">Premium</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {steamProfile ? (
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Avatar className="h-12 w-12">
                {(steamProfile.avatarfull ??
                  steamProfile.avatarmedium ??
                  steamProfile.avatar) ? (
                  <AvatarImage
                    src={
                      steamProfile.avatarfull ??
                      steamProfile.avatarmedium ??
                      steamProfile.avatar ??
                      ""
                    }
                    alt={steamProfile.personaname}
                  />
                ) : null}
                <AvatarFallback>
                  <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Steam profile</CardTitle>
                <CardDescription>Linked Steam (mock)</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Persona</p>
                <p>{steamProfile.personaname}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Steam ID</p>
                <p className="font-mono text-muted-foreground">
                  {steamProfile.steamid}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Steam profile</CardTitle>
              <CardDescription>No Steam linked</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 py-6">
              <p className="text-center text-sm text-muted-foreground">
                Link Steam to play (mock empty state).
              </p>
              <Button type="button" variant="secondary" disabled>
                <Image
                  src="/images/logos/steam-logo-white.svg"
                  alt=""
                  width={18}
                  height={18}
                />
                Sign in with Steam
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
