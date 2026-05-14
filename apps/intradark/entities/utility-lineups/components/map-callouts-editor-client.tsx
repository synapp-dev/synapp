"use client";

import type { InferSelectModel } from "drizzle-orm";
import * as React from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  createMapCalloutAction,
  deleteMapCalloutAction,
  updateMapCalloutAction,
} from "@/entities/utility-lineups/actions/admin-map-callouts-actions";
import { mapCallouts } from "@/server/db/schema";

type CalloutRow = InferSelectModel<typeof mapCallouts>;

const ZONE_FILL = [
  "rgba(59, 130, 246, 0.22)",
  "rgba(34, 197, 94, 0.22)",
  "rgba(168, 85, 247, 0.22)",
  "rgba(249, 115, 22, 0.22)",
  "rgba(236, 72, 153, 0.22)",
];

const ZONE_STROKE = [
  "rgb(59, 130, 246)",
  "rgb(34, 197, 94)",
  "rgb(168, 85, 247)",
  "rgb(249, 115, 22)",
  "rgb(236, 72, 153)",
];

function ringToPointsAttr(ring: [number, number][]) {
  return ring.map(([x, y]) => `${x},${y}`).join(" ");
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function MapCalloutsEditorClient({
  map,
  initialCallouts,
}: {
  map: {
    id: string;
    slug: string;
    displayName: string;
    radarImageUrl: string;
  };
  initialCallouts: CalloutRow[];
}) {
  const router = useRouter();
  const [callouts, setCallouts] = React.useState(initialCallouts);
  React.useEffect(() => {
    setCallouts(initialCallouts);
  }, [initialCallouts]);

  const [draftRing, setDraftRing] = React.useState<[number, number][]>([]);
  const [slug, setSlug] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [priority, setPriority] = React.useState(0);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{
    variant: "default" | "destructive";
    title: string;
    body: string;
  } | null>(null);

  function normFromClientXY(clientX: number, clientY: number, rect: DOMRect) {
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    return [x, y] as [number, number];
  }

  function onSvgPointerDown(e: React.PointerEvent<SVGRectElement>) {
    if (e.button !== 0) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const [x, y] = normFromClientXY(e.clientX, e.clientY, rect);
    setDraftRing((prev) => [...prev, [x, y]]);
  }

  function clearDraft() {
    setDraftRing([]);
    setEditingId(null);
    setSlug("");
    setLabel("");
    setPriority(0);
  }

  function loadForEdit(row: CalloutRow) {
    setEditingId(row.id);
    setSlug(row.slug);
    setLabel(row.label);
    setPriority(row.priority);
    setDraftRing([...row.polygonRing] as [number, number][]);
    setMessage(null);
  }

  function saveCallout() {
    setMessage(null);
    const ring = draftRing;
    if (ring.length < 3) {
      setMessage({
        variant: "destructive",
        title: "Incomplete polygon",
        body: "Click the radar at least three times to outline a zone, then save.",
      });
      return;
    }
    if (!slug.trim() || !label.trim()) {
      setMessage({
        variant: "destructive",
        title: "Missing fields",
        body: "Enter a slug and label for this callout.",
      });
      return;
    }

    startTransition(async () => {
      if (editingId) {
        const res = await updateMapCalloutAction({
          id: editingId,
          mapSlug: map.slug,
          slug: slug.trim(),
          label: label.trim(),
          priority,
          polygonRing: ring,
        });
        if (!res.ok) {
          setMessage({
            variant: "destructive",
            title: "Could not update",
            body: res.message,
          });
          return;
        }
      } else {
        const res = await createMapCalloutAction({
          mapId: map.id,
          mapSlug: map.slug,
          slug: slug.trim(),
          label: label.trim(),
          priority,
          polygonRing: ring,
        });
        if (!res.ok) {
          setMessage({
            variant: "destructive",
            title: "Could not save",
            body: res.message,
          });
          return;
        }
      }
      clearDraft();
      router.refresh();
    });
  }

  function removeCallout(id: string) {
    if (!window.confirm("Delete this callout zone?")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteMapCalloutAction({ id, mapSlug: map.slug });
      if (!res.ok) {
        setMessage({
          variant: "destructive",
          title: "Could not delete",
          body: res.message,
        });
        return;
      }
      if (editingId === id) clearDraft();
      router.refresh();
    });
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearDraft();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-6">
      {message ? (
        <Alert variant={message.variant === "destructive" ? "destructive" : "default"}>
          <AlertTitle>{message.title}</AlertTitle>
          <AlertDescription>{message.body}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Click the radar to place polygon vertices in order (normalized 0–1 space). Use{" "}
            <kbd className="bg-muted rounded px-1 text-xs">Esc</kbd> to clear the draft.
          </p>
          <div className="relative mx-auto w-full max-w-[720px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- radar URL from DB */}
            <img
              src={map.radarImageUrl}
              alt={`${map.displayName} radar`}
              className="pointer-events-none block h-auto w-full select-none"
              draggable={false}
            />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 1 1"
              preserveAspectRatio="xMidYMid meet"
            >
              <rect
                width={1}
                height={1}
                fill="transparent"
                className="cursor-crosshair touch-none"
                onPointerDown={onSvgPointerDown}
              />
              {callouts.map((c, i) => {
                const ring = c.polygonRing as [number, number][];
                const selected = c.id === editingId;
                const fill = ZONE_FILL[i % ZONE_FILL.length]!;
                const stroke = ZONE_STROKE[i % ZONE_STROKE.length]!;
                return (
                  <polygon
                    key={c.id}
                    points={ringToPointsAttr(ring)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={selected ? 0.006 : 0.003}
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                );
              })}
              {draftRing.length >= 2 ? (
                <polyline
                  points={ringToPointsAttr(draftRing)}
                  fill="none"
                  stroke="rgb(250 204 21)"
                  strokeWidth={0.004}
                  strokeLinejoin="round"
                  strokeDasharray="0.02 0.012"
                  pointerEvents="none"
                />
              ) : null}
              {draftRing.length >= 3 ? (
                <polygon
                  points={ringToPointsAttr(draftRing)}
                  fill="rgba(250, 204, 21, 0.15)"
                  stroke="rgb(250 204 21)"
                  strokeWidth={0.004}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ) : null}
              {draftRing.map(([x, y], i) => (
                <circle
                  key={`draft-${i}-${x}-${y}`}
                  cx={x}
                  cy={y}
                  r={0.012}
                  fill="rgb(250 204 21)"
                  stroke="rgb(120 53 15)"
                  strokeWidth={0.002}
                  pointerEvents="none"
                />
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="space-y-2">
            <Label htmlFor="callout-slug">Slug</Label>
            <Input
              id="callout-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. ct-spawn"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="callout-label">Label</Label>
            <Input
              id="callout-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. CT Spawn"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="callout-priority">Priority</Label>
            <Input
              id="callout-priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number.parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-muted-foreground text-xs">
              Higher priority wins when zones overlap at the same point.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={saveCallout} disabled={pending}>
              {editingId ? "Update zone" : "Save zone"}
            </Button>
            <Button type="button" variant="outline" onClick={clearDraft} disabled={pending}>
              Clear draft
            </Button>
          </div>
          {editingId ? (
            <p className="text-muted-foreground text-xs">Editing an existing zone — save to apply or clear to create new.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Saved callouts</h2>
        {callouts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No zones yet for this map.</p>
        ) : (
          <ul className="divide-border divide-y rounded-md border">
            {callouts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{c.label}</span>{" "}
                  <code className="text-muted-foreground text-xs">{c.slug}</code>
                  <span className="text-muted-foreground"> · priority {c.priority}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => loadForEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeCallout(c.id)}
                    disabled={pending}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
