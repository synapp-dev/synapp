"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type StorageLocationRow = {
  id: string;
  name: string;
  displayOrder: number;
};

type StorageLocationsSectionProps = {
  organisationSlug: string;
  venueSlug: string;
  canEdit: boolean;
  hidePageHeader?: boolean;
};

export function StorageLocationsSection({
  organisationSlug,
  venueSlug,
  canEdit,
  hidePageHeader = false,
}: StorageLocationsSectionProps) {
  const [locations, setLocations] = useState<StorageLocationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const basePath = `/api/organisations/${encodeURIComponent(organisationSlug)}/venues/${encodeURIComponent(venueSlug)}/storage-locations`;

  const loadLocations = useCallback(async () => {
    if (!organisationSlug || !venueSlug) return;
    setLoading(true);
    try {
      const res = await fetch(basePath);
      const json = (await res.json()) as {
        data: StorageLocationRow[] | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not load storage locations");
        setLocations([]);
        return;
      }
      setLocations(json.data ?? []);
    } catch {
      toast.error("Could not load storage locations");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [basePath, organisationSlug, venueSlug]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a location name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayOrder: locations.length }),
      });
      const json = (await res.json()) as {
        data: StorageLocationRow | null;
        error: { message: string } | null;
      };
      if (!res.ok || json.error || !json.data) {
        toast.error(json.error?.message ?? "Could not create location");
        return;
      }
      setNewName("");
      toast.success("Location added");
      await loadLocations();
    } catch {
      toast.error("Could not create location");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(locationId: string) {
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/${encodeURIComponent(locationId)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error: { message: string } | null };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? "Could not delete location");
        return;
      }
      toast.success("Location removed");
      await loadLocations();
    } catch {
      toast.error("Could not delete location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      {hidePageHeader ? null : (
        <CardHeader>
          <CardTitle>Storage locations</CardTitle>
          <CardDescription>
            Define where ingredients are stored for stock counts and cycle counts.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading locations…</p>
        ) : locations.length === 0 ? (
          <p className="text-muted-foreground text-sm">No storage locations yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {locations.map((loc) => (
              <li
                key={loc.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span>{loc.name}</span>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() => void handleDelete(loc.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="storage-location-name">New location</Label>
              <Input
                id="storage-location-name"
                placeholder="e.g. Walk-in fridge"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              Add location
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
