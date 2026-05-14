"use client";

import type { InferSelectModel } from "drizzle-orm";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useState, useTransition } from "react";

import {
  createUtilityMapSpotAction,
  deleteUtilityMapSpotAction,
  updateUtilityMapSpotAction,
} from "@/entities/utility-lineups/actions/admin-map-spots-actions";
import { utilityMapSpots } from "@/server/db/schema";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export type UtilityMapSpotRow = InferSelectModel<typeof utilityMapSpots>;

function parseCoord(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function MapSpotsAdminSection({
  mapId,
  spots,
}: {
  mapId: string;
  spots: UtilityMapSpotRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    variant: "default" | "destructive";
    title: string;
    body: string;
  } | null>(null);

  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newX, setNewX] = useState("");
  const [newY, setNewY] = useState("");

  function refresh() {
    router.refresh();
  }

  function addSpot() {
    setMessage(null);
    const radarX = parseCoord(newX);
    const radarY = parseCoord(newY);
    if (radarX === null || radarY === null) {
      setMessage({
        variant: "destructive",
        title: "Invalid coordinates",
        body: "Enter numbers between 0 and 1 for X and Y (radar space).",
      });
      return;
    }
    if (radarX < 0 || radarX > 1 || radarY < 0 || radarY > 1) {
      setMessage({
        variant: "destructive",
        title: "Out of range",
        body: "X and Y must be between 0 and 1.",
      });
      return;
    }
    startTransition(async () => {
      const res = await createUtilityMapSpotAction({
        mapId,
        slug: newSlug.trim(),
        label: newLabel.trim(),
        radarX,
        radarY,
      });
      if (!res.ok) {
        setMessage({
          variant: "destructive",
          title: "Could not add spot",
          body: res.message,
        });
        return;
      }
      setNewSlug("");
      setNewLabel("");
      setNewX("");
      setNewY("");
      setMessage({ variant: "default", title: "Spot created", body: "" });
      refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Map spots</CardTitle>
        <CardDescription>
          Callout positions on the radar. Coordinates are{" "}
          <span className="font-medium text-foreground">normalized 0–1</span> (left/top →
          right/bottom), matching <code className="text-xs">utility_map_spots</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message ? (
          <Alert variant={message.variant === "destructive" ? "destructive" : "default"}>
            <AlertTitle>{message.title}</AlertTitle>
            {message.body ? <AlertDescription>{message.body}</AlertDescription> : null}
          </Alert>
        ) : null}

        <div className="space-y-3">
          <p className="text-sm font-medium">Add spot</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="grid gap-2">
              <Label htmlFor={`new-label-${mapId}`}>Label</Label>
              <Input
                id={`new-label-${mapId}`}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. T Spawn"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`new-slug-${mapId}`}>Slug</Label>
              <Input
                id={`new-slug-${mapId}`}
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="t-spawn"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`new-x-${mapId}`}>Radar X</Label>
              <Input
                id={`new-x-${mapId}`}
                value={newX}
                onChange={(e) => setNewX(e.target.value)}
                placeholder="0 – 1"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`new-y-${mapId}`}>Radar Y</Label>
              <Input
                id={`new-y-${mapId}`}
                value={newY}
                onChange={(e) => setNewY(e.target.value)}
                placeholder="0 – 1"
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              className="lg:mb-0.5"
              disabled={pending || !newSlug.trim() || !newLabel.trim()}
              onClick={() => addSpot()}
            >
              Add spot
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Existing spots{" "}
            <span className="text-muted-foreground font-normal">({spots.length})</span>
          </p>
          {spots.length === 0 ? (
            <p className="text-muted-foreground text-sm">No spots yet for this map.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Label</TableHead>
                  <TableHead className="min-w-[120px]">Slug</TableHead>
                  <TableHead className="w-28">Radar X</TableHead>
                  <TableHead className="w-28">Radar Y</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spots.map((spot) => (
                  <SpotEditRow
                    key={spot.id}
                    spot={spot}
                    setMessage={setMessage}
                    onDone={refresh}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SpotEditRow({
  spot,
  setMessage,
  onDone,
}: {
  spot: UtilityMapSpotRow;
  setMessage: Dispatch<
    SetStateAction<{
      variant: "default" | "destructive";
      title: string;
      body: string;
    } | null>
  >;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(spot.label);
  const [slug, setSlug] = useState(spot.slug);
  const [rx, setRx] = useState(String(spot.radarX));
  const [ry, setRy] = useState(String(spot.radarY));
  const [rowPending, startRowTransition] = useTransition();

  function save() {
    setMessage(null);
    const radarX = parseCoord(rx);
    const radarY = parseCoord(ry);
    if (radarX === null || radarY === null) {
      setMessage({
        variant: "destructive",
        title: "Invalid coordinates",
        body: "Enter numbers between 0 and 1 for X and Y.",
      });
      return;
    }
    if (radarX < 0 || radarX > 1 || radarY < 0 || radarY > 1) {
      setMessage({
        variant: "destructive",
        title: "Out of range",
        body: "X and Y must be between 0 and 1.",
      });
      return;
    }
    startRowTransition(async () => {
      const res = await updateUtilityMapSpotAction({
        id: spot.id,
        slug: slug.trim(),
        label: label.trim(),
        radarX,
        radarY,
      });
      if (!res.ok) {
        setMessage({
          variant: "destructive",
          title: "Save failed",
          body: res.message,
        });
        return;
      }
      setMessage({ variant: "default", title: "Spot saved", body: "" });
      onDone();
    });
  }

  function remove() {
    if (!window.confirm(`Delete spot “${spot.label}”?`)) return;
    setMessage(null);
    startRowTransition(async () => {
      const res = await deleteUtilityMapSpotAction({ id: spot.id });
      if (!res.ok) {
        setMessage({
          variant: "destructive",
          title: "Delete failed",
          body: res.message,
        });
        return;
      }
      setMessage({ variant: "default", title: "Spot deleted", body: "" });
      onDone();
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-w-[120px]"
          aria-label="Label"
        />
      </TableCell>
      <TableCell>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="font-mono text-xs"
          aria-label="Slug"
        />
      </TableCell>
      <TableCell>
        <Input
          value={rx}
          onChange={(e) => setRx(e.target.value)}
          inputMode="decimal"
          className="font-mono text-xs"
          aria-label="Radar X"
        />
      </TableCell>
      <TableCell>
        <Input
          value={ry}
          onChange={(e) => setRy(e.target.value)}
          inputMode="decimal"
          className="font-mono text-xs"
          aria-label="Radar Y"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={rowPending} onClick={() => save()}>
            Save
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={rowPending} onClick={() => remove()}>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
