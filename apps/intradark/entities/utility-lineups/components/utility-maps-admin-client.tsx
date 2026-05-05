"use client";

import type { InferSelectModel } from "drizzle-orm";
import { useMemo, useState, useTransition } from "react";

import { updateAdminMapAction } from "@/entities/utility-lineups/actions/admin-maps-actions";
import { isAllowedUploadMime } from "@/lib/media/upload-validation";
import { mapPools, maps } from "@/server/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";

type MapRow = InferSelectModel<typeof maps>;
type PoolRow = InferSelectModel<typeof mapPools>;

export type UtilityMapsAdminRow = {
  map: MapRow;
  poolSlug: string;
};

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return "";
}

function MapEditorCard({
  map: initial,
  pools,
}: {
  map: MapRow;
  pools: PoolRow[];
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [poolId, setPoolId] = useState(initial.poolId);
  const [radarImageUrl, setRadarImageUrl] = useState(initial.radarImageUrl);
  const [badgeImageUrl, setBadgeImageUrl] = useState(initial.badgeImageUrl);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [message, setMessage] = useState<{
    variant: "default" | "destructive";
    title: string;
    body: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const poolItems = useMemo(
    () => pools.map((p) => ({ id: p.id, label: p.displayName })),
    [pools],
  );

  function save() {
    setMessage(null);
    const so = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(so)) {
      setMessage({
        variant: "destructive",
        title: "Invalid sort order",
        body: "Use an integer.",
      });
      return;
    }
    startTransition(async () => {
      const res = await updateAdminMapAction({
        id: initial.id,
        slug,
        displayName,
        poolId,
        radarImageUrl,
        badgeImageUrl,
        isActive,
        sortOrder: so,
      });
      if (!res.ok) {
        setMessage({
          variant: "destructive",
          title: "Save failed",
          body: res.message,
        });
        return;
      }
      setMessage({
        variant: "default",
        title: "Saved",
        body: "Map updated.",
      });
    });
  }

  async function uploadMapImage(
    asset: "radar" | "badge",
    file: File | null,
    setUrl: (url: string) => void,
    successBody: string,
  ) {
    if (!file) return;
    setMessage(null);
    if (!isAllowedUploadMime(file.type)) {
      setMessage({
        variant: "destructive",
        title: "Unsupported file",
        body: "Use PNG, JPEG, WebP, or GIF.",
      });
      return;
    }
    const ext = extForMime(file.type);
    if (!ext) {
      setMessage({
        variant: "destructive",
        title: "Unsupported file",
        body: "Could not infer file extension.",
      });
      return;
    }
    const objectPath = `maps/${slug}/${asset}${ext}`;
    try {
      const r = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath, contentType: file.type }),
      });
      const j = (await r.json()) as {
        signedUrl?: string;
        publicUrl?: string;
        error?: string;
      };
      if (!r.ok || !j.signedUrl) {
        setMessage({
          variant: "destructive",
          title: "Upload URL failed",
          body: j.error ?? `HTTP ${r.status}`,
        });
        return;
      }
      const put = await fetch(j.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        setMessage({
          variant: "destructive",
          title: "Upload failed",
          body: `Storage returned ${put.status}`,
        });
        return;
      }
      if (j.publicUrl) {
        setUrl(j.publicUrl);
      }
      setMessage({
        variant: "default",
        title: "Uploaded",
        body: successBody,
      });
    } catch (e) {
      setMessage({
        variant: "destructive",
        title: "Upload error",
        body: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-base">{initial.slug}</CardTitle>
        <CardDescription>Map id: {initial.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <Alert variant={message.variant === "destructive" ? "destructive" : "default"}>
            <AlertTitle>{message.title}</AlertTitle>
            <AlertDescription>{message.body}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor={`slug-${initial.id}`}>Slug</Label>
          <Input
            id={`slug-${initial.id}`}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`name-${initial.id}`}>Display name</Label>
          <Input
            id={`name-${initial.id}`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Pool</Label>
          <Select value={poolId} onValueChange={setPoolId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Pool" />
            </SelectTrigger>
            <SelectContent>
              {poolItems.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`radar-${initial.id}`}>Radar image URL</Label>
          <Input
            id={`radar-${initial.id}`}
            value={radarImageUrl}
            onChange={(e) => setRadarImageUrl(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="max-w-xs"
              onChange={(e) =>
                void uploadMapImage(
                  "radar",
                  e.target.files?.[0] ?? null,
                  setRadarImageUrl,
                  "Radar URL was set to the public object URL.",
                )
              }
            />
            <span className="text-muted-foreground text-xs">
              Uploads to maps/&lt;slug&gt;/radar.* and fills the URL above.
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`badge-${initial.id}`}>Badge image URL</Label>
          <Input
            id={`badge-${initial.id}`}
            value={badgeImageUrl}
            onChange={(e) => setBadgeImageUrl(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="max-w-xs"
              onChange={(e) =>
                void uploadMapImage(
                  "badge",
                  e.target.files?.[0] ?? null,
                  setBadgeImageUrl,
                  "Badge URL was set to the public object URL.",
                )
              }
            />
            <span className="text-muted-foreground text-xs">
              Uploads to maps/&lt;slug&gt;/badge.* and fills the URL above.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id={`active-${initial.id}`}
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor={`active-${initial.id}`}>Active</Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`sort-${initial.id}`}>Sort order</Label>
            <Input
              id={`sort-${initial.id}`}
              className="w-24"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>

        <Button type="button" disabled={pending} onClick={() => save()}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function UtilityMapsAdminClient({
  rows,
  pools,
}: {
  rows: UtilityMapsAdminRow[];
  pools: PoolRow[];
}) {
  return (
    <div className="space-y-6">
      {rows.map(({ map }) => (
        <MapEditorCard key={map.id} map={map} pools={pools} />
      ))}
    </div>
  );
}
