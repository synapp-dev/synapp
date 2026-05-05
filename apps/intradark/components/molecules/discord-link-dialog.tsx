"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

type DiscordLinkDialogProps = {
  needsDiscordLink: boolean;
};

export function DiscordLinkDialog({ needsDiscordLink }: DiscordLinkDialogProps) {
  const [open, setOpen] = useState(needsDiscordLink);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link your Discord account</DialogTitle>
          <DialogDescription>
            Queue and matchmaking will require a linked Discord account. Link
            yours now so you are ready when those features go live.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <Button asChild>
            <a href="/api/auth/discord">Link Discord</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
