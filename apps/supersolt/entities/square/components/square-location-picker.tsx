"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { squareApi } from "@/entities/square/api/endpoints";
import { squareKeys } from "@/entities/square/model/keys";
import { useSquareLocationsQuery } from "@/entities/square/model/use-square-locations-query";
import { useVenueSquareConnectionQuery } from "@/entities/square/model/use-venue-square-connection";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

type SquareLocationPickerProps = {
  organisationSlug: string;
  venueSlug: string;
  canManage: boolean;
  /** When true, wraps content in a settings card (Integrations). */
  variant?: "card" | "inline";
};

export function SquareLocationPicker({
  organisationSlug,
  venueSlug,
  canManage,
  variant = "card",
}: SquareLocationPickerProps) {
  const queryClient = useQueryClient();
  const connectionQuery = useVenueSquareConnectionQuery(
    organisationSlug,
    venueSlug,
    canManage,
  );
  const locationsQuery = useSquareLocationsQuery(
    organisationSlug,
    venueSlug,
    canManage && Boolean(connectionQuery.data?.connected),
  );

  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);

  const currentLocationId =
    locationsQuery.data?.currentLocationId ??
    connectionQuery.data?.squareLocationId ??
    null;

  const locationOptions = locationsQuery.data?.locations ?? [];

  useEffect(() => {
    if (currentLocationId) {
      setSelectedId(currentLocationId);
      return;
    }
    if (locationOptions.length === 1) {
      setSelectedId(locationOptions[0]!.id);
    }
  }, [currentLocationId, locationOptions]);

  const selectedLocation = useMemo(
    () => locationOptions.find((location) => location.id === selectedId),
    [locationOptions, selectedId],
  );

  const hasUnsavedChange =
    Boolean(selectedId) && selectedId !== (currentLocationId ?? "");

  async function handleSave() {
    if (!selectedId || !hasUnsavedChange) {
      return;
    }
    setSaving(true);
    try {
      const { error } = await squareApi.setLocation({
        organisationSlug,
        venueSlug,
        locationId: selectedId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Square location saved");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: squareKeys.venueConnection(organisationSlug, venueSlug),
        }),
        queryClient.invalidateQueries({
          queryKey: squareKeys.locations(organisationSlug, venueSlug),
        }),
      ]);
    } catch {
      toast.error("Could not save Square location");
    } finally {
      setSaving(false);
    }
  }

  if (!connectionQuery.data?.connected) {
    return null;
  }

  if (!canManage) {
    if (variant === "inline" && !connectionQuery.data.locationConfigured) {
      return (
        <p className="text-muted-foreground text-sm">
          Square is connected but no location is saved yet. Ask an organisation admin to choose
          your Square location in Settings → Integrations.
        </p>
      );
    }
    return null;
  }

  const body = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[220px] flex-1 space-y-2">
        <Label htmlFor={`square-location-${variant}`}>Square location</Label>
        {locationsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm" aria-busy="true">
            Loading locations…
          </p>
        ) : locationsQuery.isError ? (
          <p className="text-destructive text-sm">
            {locationsQuery.error instanceof Error
              ? locationsQuery.error.message
              : "Could not load Square locations"}
          </p>
        ) : locationOptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No Square locations found for this account.
          </p>
        ) : (
          <Select
            value={selectedId || undefined}
            onValueChange={setSelectedId}
            disabled={saving}
          >
            <SelectTrigger id={`square-location-${variant}`} className="w-full max-w-md">
              <SelectValue placeholder="Select a Square location" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                  {location.status && location.status !== "ACTIVE"
                    ? ` (${location.status.toLowerCase()})`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={
          saving ||
          !hasUnsavedChange ||
          locationsQuery.isLoading ||
          locationOptions.length === 0
        }
      >
        {saving ? "Saving…" : "Save location"}
      </Button>
    </div>
  );

  const description = currentLocationId
    ? selectedLocation
      ? `Using ${selectedLocation.name} for POS catalog, sales sync, and invoices.`
      : "This venue is linked to a Square location for catalog import and sales sync."
    : locationOptions.length > 1
      ? "Your Square account has multiple locations. Choose which store this venue represents."
      : "Choose the Square store that matches this venue before importing POS items.";

  if (variant === "inline") {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Square location required</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Square location</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
