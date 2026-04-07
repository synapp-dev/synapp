"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Store,
  type LucideIcon,
} from "lucide-react";

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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import type { AccessibleOrganisation } from "@/entities/organisations/api/endpoints";

export type Venue = {
  id: string;
  name: string;
  slug: string;
  suburb: string | null;
  state: string | null;
  category: string;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  organisationLogoUrl: string | null;
};

type VenueSwitcherProps = {
  currentOrganisationSlug?: string | null;
  currentVenueSlug?: string | null;
  onVenueChange?: (venue: Venue) => void;
};

function toVenue(org: AccessibleOrganisation, venue: AccessibleOrganisation["venues"][number]): Venue {
  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    suburb: venue.suburb,
    state: venue.state,
    category: venue.venueType,
    organisationId: org.id,
    organisationName: org.name,
    organisationSlug: org.slug,
    organisationLogoUrl: org.logoUrl,
  };
}

function getVenueKey(venue: Venue) {
  return `${venue.organisationSlug}:${venue.slug}`;
}

function getVenueLocationLabel(venue: Venue) {
  const suburb = venue.suburb?.trim();
  const state = venue.state?.trim();

  if (suburb && state) {
    return `${suburb}, ${state}`;
  }

  if (suburb) {
    return suburb;
  }

  if (state) {
    return state;
  }

  return "Unknown location";
}

function VenueAvatar({
  logoUrl,
  fallbackIcon: FallbackIcon,
  className,
  fallbackClassName,
}: {
  logoUrl: string | null;
  fallbackIcon: LucideIcon;
  className: string;
  fallbackClassName?: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [logoUrl]);

  const showLogo = Boolean(logoUrl && !hasImageError);

  return (
    <div className={className}>
      {showLogo ? (
        <Image
          src={logoUrl!}
          alt="Organisation logo"
          width={32}
          height={32}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setHasImageError(true)}
        />
      ) : (
        <FallbackIcon className={fallbackClassName} />
      )}
    </div>
  );
}

export function VenueSwitcher({
  currentOrganisationSlug,
  currentVenueSlug,
  onVenueChange,
}: VenueSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVenueKey, setSelectedVenueKey] = useState<string | null>(null);
  const {
    data: organisations = [],
    isLoading,
    isError,
  } = useAccessibleVenueGroupsQuery();
  const { state, isMobile } = useSidebar();
  const displayState = isMobile ? "expanded" : state;
  const isCollapsed = displayState === "collapsed";
  const hasInitializedSelection = useRef(false);

  const allVenues = useMemo(
    () =>
      organisations.flatMap((org) =>
        org.venues.map((venue) => toVenue(org, venue))
      ),
    [organisations]
  );

  const scopedVenue = useMemo(() => {
    if (!currentOrganisationSlug || !currentVenueSlug) {
      return null;
    }

    return (
      allVenues.find(
        (venue) =>
          venue.organisationSlug === currentOrganisationSlug &&
          venue.slug === currentVenueSlug
      ) ?? null
    );
  }, [allVenues, currentOrganisationSlug, currentVenueSlug]);

  const selectedVenue = useMemo(() => {
    if (scopedVenue) {
      return scopedVenue;
    }

    if (selectedVenueKey) {
      return allVenues.find((venue) => getVenueKey(venue) === selectedVenueKey) ?? null;
    }

    return allVenues[0] ?? null;
  }, [allVenues, scopedVenue, selectedVenueKey]);

  useEffect(() => {
    if (hasInitializedSelection.current) {
      return;
    }

    if (!selectedVenue) {
      return;
    }

    hasInitializedSelection.current = true;
    setSelectedVenueKey(getVenueKey(selectedVenue));
    onVenueChange?.(selectedVenue);
  }, [onVenueChange, selectedVenue]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return organisations.map((org) => ({
        ...org,
        venues: org.venues.map((venue) => toVenue(org, venue)),
      }));
    }

    return organisations
      .map((org) => {
        const venues = org.venues
          .map((venue) => toVenue(org, venue))
          .filter((venue) =>
            [
              venue.name,
              venue.organisationName,
              venue.suburb ?? "",
              venue.state ?? "",
              venue.category,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query)
          );

        return { ...org, venues };
      })
      .filter((org) => org.venues.length > 0);
  }, [organisations, search]);

  const emptyMessage = isLoading
    ? "loading venues"
    : isError
      ? "Unable to load venues."
      : "No venues found.";

  return (
    <SidebarMenu className="mb-0">
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Switch venue"
              className="group/venue-switcher"
            >
              <VenueAvatar
                logoUrl={selectedVenue?.organisationLogoUrl ?? null}
                fallbackIcon={Store}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md text-sidebar-primary-foreground"
                fallbackClassName="h-4 w-4"
              />
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {isLoading
                        ? "loading venues"
                        : selectedVenue?.name ?? "No venue access"}
                    </span>
                    <span className="text-muted-foreground truncate text-[0.65rem]">
                      {isLoading
                        ? "loading venues"
                        : selectedVenue
                        ? `${getVenueLocationLabel(selectedVenue)} • ${selectedVenue.organisationName}`
                        : "Ask an admin to assign a venue"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 opacity-70 transition-transform duration-200 group-data-[state=open]/popover:rotate-180" />
                </>
              )}
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            side="right"
            align="start"
          >
            <Command>
              <CommandInput
                placeholder="Search venues..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                {filteredGroups.map((org) => (
                  <CommandGroup key={org.id} heading={org.name}>
                    {org.venues.map((venue) => {
                      const venueKey = getVenueKey(venue);
                      const isSelected =
                        selectedVenueKey === venueKey ||
                        (selectedVenue !== null &&
                          getVenueKey(selectedVenue) === venueKey);

                      return (
                        <CommandItem
                          key={venue.id}
                          value={`${venue.name} ${venue.organisationName} ${venue.suburb ?? ""} ${venue.state ?? ""} ${venue.category}`}
                          onSelect={() => {
                            setSelectedVenueKey(venueKey);
                            onVenueChange?.(venue);
                            setOpen(false);
                          }}
                        >
                          <VenueAvatar
                            logoUrl={venue.organisationLogoUrl}
                            fallbackIcon={Building2}
                            className="mr-2 flex h-7 w-7 items-center justify-center overflow-hidden rounded bg-muted"
                            fallbackClassName="h-4 w-4 text-muted-foreground"
                          />
                          <div className="grid flex-1 leading-tight">
                            <span className="truncate text-sm">{venue.name}</span>
                            <span className="text-muted-foreground truncate text-[0.65rem]">
                              {getVenueLocationLabel(venue)} • {venue.category}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
