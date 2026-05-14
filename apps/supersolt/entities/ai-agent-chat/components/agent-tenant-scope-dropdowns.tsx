"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import type { AccessibleOrganisation } from "@/entities/organisations/api/endpoints";
import type { TenantScopeSelection } from "@/entities/ai-agent-chat/components/agent-tenant-scope-bar";

type AgentTenantScopeDropdownsProps = {
  organisations: AccessibleOrganisation[];
  value: TenantScopeSelection | null;
  onChange: (next: TenantScopeSelection) => void;
  disabled?: boolean;
  className?: string;
  /** Popover opens toward top (e.g. sticky footer) or bottom (e.g. hero area). */
  comboboxSide?: "top" | "bottom";
};

function pickFirstVenueForOrg(
  org: AccessibleOrganisation,
): TenantScopeSelection | null {
  const venue = org.venues[0];
  if (!venue) return null;
  return { organisationSlug: org.slug, venueSlug: venue.slug };
}

/**
 * When the venue name repeats the org name, show only the distinctive part
 * (case-insensitive). Short org strings only strip a prefix to avoid breaking
 * unrelated words (e.g. "Co" inside "Coffee").
 */
function venueLabelWithoutEmbeddedOrg(
  venueName: string,
  orgName: string,
): string {
  const v = venueName.trim();
  const o = orgName.trim();
  if (!v || !o) return v;

  const vLower = v.toLowerCase();
  const oLower = o.toLowerCase();

  if (o.length < 3) {
    if (vLower.startsWith(oLower)) {
      const rest = v
        .slice(o.length)
        .replace(/^[-–—·•|:,\s]+/, "")
        .trim();
      return rest.length > 0 ? rest : v;
    }
    return v;
  }

  const escaped = o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "gi");
  let next = v.replace(re, " ");
  next = next
    .replace(/\s+/g, " ")
    .replace(/^[-–—·•|:,\s]+/, "")
    .replace(/[-–—·•|:,\s]+$/, "")
    .trim();
  return next.length > 0 ? next : v;
}

const triggerButtonClass =
  "text-foreground inline-flex max-w-full shrink-0 items-center gap-0.5 rounded-sm py-0.5 text-left text-sm font-normal outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

export function AgentTenantScopeDropdowns({
  organisations,
  value,
  onChange,
  disabled,
  className,
  comboboxSide = "bottom",
}: AgentTenantScopeDropdownsProps) {
  const [orgOpen, setOrgOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");

  const selectedOrg = useMemo(
    () =>
      organisations.find((o) => o.slug === value?.organisationSlug) ??
      organisations[0],
    [organisations, value?.organisationSlug],
  );

  const venueOptions = selectedOrg?.venues ?? [];

  const venueSlugValue =
    value &&
    selectedOrg &&
    value.organisationSlug === selectedOrg.slug &&
    venueOptions.some((v) => v.slug === value.venueSlug)
      ? value.venueSlug
      : (venueOptions[0]?.slug ?? "");

  const selectedVenue = useMemo(
    () => venueOptions.find((v) => v.slug === venueSlugValue),
    [venueOptions, venueSlugValue],
  );

  const orgNameForVenueLabel = selectedOrg?.name ?? "";
  const selectedVenueDisplay = selectedVenue
    ? venueLabelWithoutEmbeddedOrg(selectedVenue.name, orgNameForVenueLabel)
    : "—";

  if (organisations.length === 0) {
    return null;
  }

  const multiOrg = organisations.length > 1;
  const multiVenue = venueOptions.length > 1;

  return (
    <div
      className={cn(
        "ml-6 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm",
        className,
      )}
    >
      {multiOrg ? (
        <Popover
          open={orgOpen}
          onOpenChange={(open) => {
            setOrgOpen(open);
            if (!open) setOrgSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-expanded={orgOpen}
              aria-haspopup="listbox"
              aria-label="Organisation"
              className={cn(
                triggerButtonClass,
                !disabled && "hover:opacity-85",
              )}
            >
              <span className="truncate">{selectedOrg?.name ?? "—"}</span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-3.5 shrink-0 opacity-80 transition-transform duration-200",
                  orgOpen && "-rotate-180",
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            align="start"
            side={comboboxSide}
            sideOffset={6}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter>
              <CommandInput
                placeholder="Search organisations…"
                value={orgSearch}
                onValueChange={setOrgSearch}
              />
              <CommandList>
                <CommandEmpty>No organisations found.</CommandEmpty>
                <CommandGroup>
                  {organisations.map((org) => (
                    <CommandItem
                      key={org.slug}
                      value={`${org.name} ${org.slug}`}
                      onSelect={() => {
                        const next = pickFirstVenueForOrg(org);
                        if (next) onChange(next);
                        setOrgOpen(false);
                        setOrgSearch("");
                      }}
                    >
                      <span className="truncate">{org.name}</span>
                      <Check
                        className={cn(
                          "ml-auto size-4 shrink-0",
                          selectedOrg?.slug === org.slug
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <span className="text-foreground max-w-full shrink-0 truncate text-sm">
          {selectedOrg?.name ?? "—"}
        </span>
      )}

      <span
        className="text-muted-foreground shrink-0 select-none px-0.5 text-sm leading-none"
        aria-hidden
      >
        ·
      </span>

      {multiVenue ? (
        <Popover
          open={venueOpen}
          onOpenChange={(open) => {
            setVenueOpen(open);
            if (!open) setVenueSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-expanded={venueOpen}
              aria-haspopup="listbox"
              aria-label={`Venue: ${selectedVenue?.name ?? ""}`}
              className={cn(
                triggerButtonClass,
                !disabled && "hover:opacity-85",
              )}
            >
              <span className="truncate">{selectedVenueDisplay}</span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-3.5 shrink-0 opacity-80 transition-transform duration-200",
                  venueOpen && "-rotate-180",
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            align="start"
            side={comboboxSide}
            sideOffset={6}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter>
              <CommandInput
                placeholder="Search venues…"
                value={venueSearch}
                onValueChange={setVenueSearch}
              />
              <CommandList>
                <CommandEmpty>No venues found.</CommandEmpty>
                <CommandGroup>
                  {venueOptions.map((venue) => {
                    const rowLabel = venueLabelWithoutEmbeddedOrg(
                      venue.name,
                      orgNameForVenueLabel,
                    );
                    return (
                    <CommandItem
                      key={venue.id}
                      value={[
                        venue.name,
                        rowLabel,
                        venue.suburb ?? "",
                        venue.state ?? "",
                        venue.venueType,
                      ]
                        .join(" ")
                        .trim()}
                      onSelect={() => {
                        if (!selectedOrg) return;
                        onChange({
                          organisationSlug: selectedOrg.slug,
                          venueSlug: venue.slug,
                        });
                        setVenueOpen(false);
                        setVenueSearch("");
                      }}
                    >
                      <span className="truncate">{rowLabel}</span>
                      <Check
                        className={cn(
                          "ml-auto size-4 shrink-0",
                          venueSlugValue === venue.slug
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        <span className="text-foreground max-w-full shrink-0 truncate text-sm">
          {selectedVenue
            ? venueLabelWithoutEmbeddedOrg(
                selectedVenue.name,
                orgNameForVenueLabel,
              )
            : "—"}
        </span>
      )}
    </div>
  );
}
