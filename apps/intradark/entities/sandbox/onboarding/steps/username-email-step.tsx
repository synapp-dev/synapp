"use client";

import * as React from "react";

import { SteamEmailDialog } from "@/components/molecules/steam-email-dialog";

import { SANDBOX_STEAM_EMAIL_DATA } from "../fixtures";

export function UsernameEmailStep({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center py-4">
      <p className="mb-4 max-w-md text-center text-sm text-muted-foreground">
        Reuses{" "}
        <code className="rounded bg-muted px-1 text-xs">SteamEmailDialog</code>{" "}
        in sandbox mode (no API / Supabase calls).
      </p>
      <SteamEmailDialog
        open={open}
        onOpenChange={setOpen}
        steamData={SANDBOX_STEAM_EMAIL_DATA}
        sandbox
        onSandboxComplete={() => {
          setOpen(false);
          onComplete();
        }}
      />
    </div>
  );
}
