"use client";

import { useMemo } from "react";

import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import type { AccessibleOrganisation } from "@/entities/organisations/api/endpoints";

export type TenantScopeSelection = {
  organisationSlug: string;
  venueSlug: string;
};

type VenueOption = TenantScopeSelection & {
  label: string;
};

function flattenVenues(organisations: AccessibleOrganisation[]): VenueOption[] {
  const out: VenueOption[] = [];
  for (const org of organisations) {
    for (const venue of org.venues) {
      const location = [venue.suburb, venue.state].filter(Boolean).join(", ");
      const label = location
        ? `${org.name} — ${venue.name} (${location})`
        : `${org.name} — ${venue.name}`;
      out.push({
        organisationSlug: org.slug,
        venueSlug: venue.slug,
        label,
      });
    }
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

function selectionKey(s: TenantScopeSelection) {
  return `${s.organisationSlug}:${s.venueSlug}`;
}

type AgentTenantScopeBarProps = {
  organisations: AccessibleOrganisation[] | undefined;
  value: TenantScopeSelection | null;
  onChange: (next: TenantScopeSelection) => void;
  className?: string;
};

export function AgentTenantScopeBar({
  organisations,
  value,
  onChange,
  className,
}: AgentTenantScopeBarProps) {
  const options = useMemo(() => flattenVenues(organisations ?? []), [organisations]);
  const totalVenues = options.length;

  if (!organisations || totalVenues === 0) {
    return null;
  }

  if (totalVenues === 1) {
    const [only] = options;
    if (!only) return null;
    return (
      <div
        className={cn(
          "text-muted-foreground border-border/60 bg-muted/25 rounded-lg border px-3 py-2 text-xs",
          className
        )}
      >
        Scope: <span className="text-foreground font-medium">{only.label}</span>
      </div>
    );
  }

  const currentKey = value ? selectionKey(value) : undefined;

  return (
    <div
      className={cn(
        "border-border/60 bg-muted/25 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <Label htmlFor="agent-tenant-scope" className="text-muted-foreground shrink-0 text-xs font-medium">
        Venue scope for this chat
      </Label>
      <Select
        value={currentKey}
        onValueChange={(key) => {
          const opt = options.find((o) => selectionKey(o) === key);
          if (opt) {
            onChange({
              organisationSlug: opt.organisationSlug,
              venueSlug: opt.venueSlug,
            });
          }
        }}
      >
        <SelectTrigger id="agent-tenant-scope" className="h-9 w-full min-w-0 sm:max-w-md">
          <SelectValue placeholder="Choose a venue" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={selectionKey(o)} value={selectionKey(o)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function pickDefaultTenantScope(
  organisations: AccessibleOrganisation[]
): TenantScopeSelection | null {
  const opts = flattenVenues(organisations);
  const first = opts[0];
  if (!first) return null;
  return {
    organisationSlug: first.organisationSlug,
    venueSlug: first.venueSlug,
  };
}
