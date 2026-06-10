"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Music2, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { parseAnthem, anthemProvider } from "@/entities/players/lib/anthem";
import { trackIdFromCanonical } from "@/entities/players/lib/spotify";
import { AnthemCardPlayer } from "@/entities/players/components/anthem-card-player";
import { useAnthemPlayer } from "@/entities/players/components/anthem-player-provider";

interface AnthemPanelProps {
  /** Canonical anthem URL (Spotify or SoundCloud) from the server, or null. */
  anthemUrl: string | null;
  /** Whether the current viewer owns this profile (server-computed). */
  isOwner: boolean;
  /** "panel" = full-width card row; "social" = icon in the header social column. */
  variant?: "panel" | "social";
}

function SpotifyEmbed({ trackId }: { trackId: string }) {
  return (
    <iframe
      title="Spotify player"
      src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
      width="100%"
      height={152}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="rounded-xl border-0"
    />
  );
}

/**
 * Member "anthem": embeds a Spotify or SoundCloud track on the profile. Owners
 * get a dialog editor to set/replace/remove it; visitors see the player
 * read-only and nothing at all when no anthem is set. The SoundCloud player
 * (`AnthemCardPlayer`) registers with the shared `AnthemPlayerProvider`, so the
 * app-header control can pause/resume it once the card scrolls out of view.
 */
export function AnthemPanel({
  anthemUrl,
  isOwner,
  variant = "panel",
}: AnthemPanelProps) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(anthemUrl);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const provider = anthemProvider(url);
  const spotifyId = provider === "spotify" ? trackIdFromCanonical(url) : null;
  const { hasAnthem } = useAnthemPlayer();

  // Visitors never see an empty panel.
  if (!provider && !isOwner) return null;

  function openDialog() {
    setValue(url ?? "");
    setError(null);
    setDialogOpen(true);
  }

  async function save(next: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/anthem", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: next }),
      });
      if (res.status === 401) {
        toast.error("Please sign in again to update your anthem");
        return;
      }
      if (res.status === 422) {
        setError("Paste a Spotify or SoundCloud track link");
        return;
      }
      if (!res.ok) throw new Error("Could not save anthem");

      const data = (await res.json()) as { anthemUrl: string | null };
      setUrl(data.anthemUrl);
      setDialogOpen(false);
      setValue("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save anthem");
    } finally {
      setSaving(false);
    }
  }

  function onSubmit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Paste a Spotify or SoundCloud track link");
      return;
    }
    if (!parseAnthem(trimmed)) {
      setError("That doesn't look like a Spotify or SoundCloud track link");
      return;
    }
    void save(trimmed);
  }

  const editorDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{provider ? "Edit anthem" : "Add anthem"}</DialogTitle>
          <DialogDescription>
            Paste a Spotify or SoundCloud track link. SoundCloud plays at 25%
            volume and honors a #t= start time from the share link; Spotify is
            click-to-play.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            placeholder="Spotify or SoundCloud track link…"
            aria-invalid={!!error}
            disabled={saving}
            autoFocus
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="sm:justify-between">
          {provider ? (
            <Button
              variant="destructive"
              onClick={() => void save(null)}
              disabled={saving}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === "social") {
    if (!provider && !isOwner) return null;

    const socialIconClass =
      "flex size-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-emerald-200 sm:size-9";

    return (
      <>
        {provider === "spotify" && spotifyId ? (
          <a
            href={`https://open.spotify.com/track/${spotifyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={socialIconClass}
            title="Open anthem on Spotify"
          >
            <span className="sr-only">Spotify anthem</span>
            <Music2
              className="size-4 text-[#1db954] sm:size-[1.125rem]"
              aria-hidden
            />
          </a>
        ) : provider === "soundcloud" ? (
          hasAnthem ? (
            <div
              className={isOwner ? "cursor-default" : undefined}
              onDoubleClick={isOwner ? openDialog : undefined}
              title={isOwner ? "Double-click to edit anthem" : undefined}
            >
              <AnthemCardPlayer anthemUrl={url} variant="social" />
            </div>
          ) : (
            <span className={socialIconClass} aria-busy>
              <Loader2
                className="size-4 animate-spin sm:size-[1.125rem]"
                aria-hidden
              />
              <span className="sr-only">Loading anthem…</span>
            </span>
          )
        ) : isOwner ? (
          <button
            type="button"
            onClick={openDialog}
            className={socialIconClass}
            aria-label="Add anthem"
            title="Add anthem"
          >
            <Music2 className="size-4 sm:size-[1.125rem]" aria-hidden />
          </button>
        ) : null}
        {editorDialog}
      </>
    );
  }

  return (
    <Card className="group h-full justify-center border-none py-2">
      <CardContent className="relative">
        {provider ? (
          <div className="relative min-w-0">
            {provider === "spotify" && spotifyId ? (
              <SpotifyEmbed trackId={spotifyId} />
            ) : provider === "soundcloud" ? (
              <AnthemCardPlayer anthemUrl={url} />
            ) : null}
            {isOwner ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Edit anthem"
                onClick={openDialog}
                className={cn(
                  "absolute right-1 top-1 z-10 size-8 shadow-sm",
                  "border border-border/70 bg-background/95 backdrop-blur-sm",
                  "translate-x-3 opacity-0",
                  "transition-[transform,opacity] duration-200 ease-out",
                  "group-hover:translate-x-0 group-hover:opacity-100",
                  "focus-visible:translate-x-0 focus-visible:opacity-100",
                )}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        ) : isOwner ? (
          <button
            type="button"
            onClick={openDialog}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <Music2 className="size-4" aria-hidden />
            Add your anthem
          </button>
        ) : null}
      </CardContent>

      {editorDialog}
    </Card>
  );
}
