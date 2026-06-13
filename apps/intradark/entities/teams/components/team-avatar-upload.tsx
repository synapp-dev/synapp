"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { setTeamAvatarAction } from "@/entities/teams/actions";
import { resolveTeamAvatarUrl } from "@/entities/teams/lib/avatar-url";
import { uploadTeamAvatarFile } from "@/entities/teams/lib/upload-team-avatar-client";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

type TeamAvatarUploadProps = {
  teamId: string;
  /** Stored object path or legacy URL from `teams.avatar`. */
  initialAvatar: string | null;
  onUploaded?: (objectPath: string) => void;
};

export function TeamAvatarUpload({
  teamId,
  initialAvatar,
  onUploaded,
}: TeamAvatarUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(() =>
    resolveTeamAvatarUrl(initialAvatar),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    setPreviewUrl(resolveTeamAvatarUrl(initialAvatar));
  }, [initialAvatar]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadTeamAvatarFile(teamId, file);
      if (!uploaded.ok) {
        setError(uploaded.message);
        return;
      }

      const saved = await setTeamAvatarAction({
        teamId,
        objectPath: uploaded.objectPath,
      });
      if (!saved.ok) {
        setError(saved.message);
        return;
      }

      setPreviewUrl(uploaded.publicUrl);
      onUploaded?.(uploaded.objectPath);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function clearAvatar() {
    setError(null);
    setUploading(true);
    try {
      const saved = await setTeamAvatarAction({ teamId, objectPath: null });
      if (!saved.ok) {
        setError(saved.message);
        return;
      }
      setPreviewUrl(null);
      onUploaded?.("");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>Team logo</Label>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted",
          )}
        >
          {previewUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- Supabase public media URL */
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="text-muted-foreground size-8" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload image"
            )}
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => void clearAvatar()}
            >
              <X className="mr-1 size-4" />
              Remove
            </Button>
          ) : null}
          <p className="text-muted-foreground text-xs">
            PNG, JPEG, WebP, or GIF. Stored in your team folder on Intradark
            media.
          </p>
        </div>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
