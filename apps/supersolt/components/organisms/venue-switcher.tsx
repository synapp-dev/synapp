"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  OrganisationLogoAvatar,
  organisationLogoBoxClassName,
} from "@/components/branding/organisation-logo-avatar";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import { useCreateOrganisationVenueMutation } from "@/entities/venues/model/useCreateOrganisationVenueMutation";
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

type OrganisationVenueCreateContext = Pick<
  AccessibleOrganisation,
  "id" | "name" | "slug" | "logoUrl"
>;

function toVenue(
  org: AccessibleOrganisation,
  venue: AccessibleOrganisation["venues"][number],
): Venue {
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

export function VenueSwitcher({
  currentOrganisationSlug,
  currentVenueSlug,
  onVenueChange,
}: VenueSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedVenueKey, setSelectedVenueKey] = useState<string | null>(null);
  const [createOrg, setCreateOrg] =
    useState<OrganisationVenueCreateContext | null>(null);
  const [createName, setCreateName] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createTimezone, setCreateTimezone] = useState("Australia/Melbourne");
  const createVenue = useCreateOrganisationVenueMutation();
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
        org.venues.map((venue) => toVenue(org, venue)),
      ),
    [organisations],
  );

  const scopedVenue = useMemo(() => {
    if (!currentOrganisationSlug || !currentVenueSlug) {
      return null;
    }

    return (
      allVenues.find(
        (venue) =>
          venue.organisationSlug === currentOrganisationSlug &&
          venue.slug === currentVenueSlug,
      ) ?? null
    );
  }, [allVenues, currentOrganisationSlug, currentVenueSlug]);

  const selectedVenue = useMemo(() => {
    if (scopedVenue) {
      return scopedVenue;
    }

    if (selectedVenueKey) {
      return (
        allVenues.find((venue) => getVenueKey(venue) === selectedVenueKey) ??
        null
      );
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
              .includes(query),
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
      <SidebarMenuItem className="flex justify-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Switch venue"
              className="group/venue-switcher "
            >
              <OrganisationLogoAvatar
                logoUrl={selectedVenue?.organisationLogoUrl ?? null}
                fallbackIcon={Store}
                className={organisationLogoBoxClassName}
                fallbackClassName="h-4 w-4 text-muted-foreground"
              />
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {isLoading
                        ? "loading venues"
                        : (selectedVenue?.name ?? "No venue access")}
                    </span>
                    <span className="text-muted-foreground truncate text-[0.65rem]">
                      {isLoading
                        ? "loading venues"
                        : selectedVenue
                          ? `${selectedVenue.organisationName} • ${selectedVenue.state ?? ""}`
                          : "Ask an admin to assign a venue"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 opacity-70 transition-transform duration-200 group-data-[state=open]/popover:rotate-180" />
                </>
              )}
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" side="right" align="start">
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
                          <OrganisationLogoAvatar
                            logoUrl={venue.organisationLogoUrl}
                            fallbackIcon={Building2}
                            className="mr-2 flex h-7 w-7 items-center justify-center overflow-hidden rounded bg-muted"
                            fallbackClassName="h-4 w-4 text-muted-foreground"
                          />
                          <div className="grid flex-1 leading-tight">
                            <span className="truncate text-sm">
                              {venue.name}
                            </span>
                            <span className="text-muted-foreground truncate text-[0.65rem]">
                              {getVenueLocationLabel(venue)} • {venue.category}
                            </span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                    {org.roleSlug === "owner" ? (
                      <button
                        type="button"
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm border border-dashed border-muted-foreground/30 bg-muted/25 px-2 py-1.5 text-left text-sm outline-none transition-colors",
                          "hover:border-muted-foreground/50 hover:bg-accent/60 hover:text-accent-foreground",
                          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                        )}
                        onClick={() => {
                          setCreateOrg({
                            id: org.id,
                            name: org.name,
                            slug: org.slug,
                            logoUrl: org.logoUrl,
                          });
                          setCreateName("");
                          setCreateAddress("");
                          setCreateTimezone("Australia/Melbourne");
                          setOpen(false);
                        }}
                      >
                        <div className="mr-2 flex h-7 w-7 items-center justify-center rounded bg-muted/80">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="grid flex-1 leading-tight">
                          <span className="truncate text-sm text-muted-foreground">
                            Add new venue
                          </span>
                          <span className="text-muted-foreground truncate text-[0.65rem]">
                            Create another location for {org.name}
                          </span>
                        </div>
                      </button>
                    ) : null}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Sheet
          open={createOrg !== null}
          onOpenChange={(next) => {
            if (!next) {
              setCreateOrg(null);
            }
          }}
        >
          <SheetContent
            side="top"
            className="flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-b-2xl sm:max-w-md sm:mx-auto"
          >
            <SheetHeader className="gap-1.5 p-0 px-5 pb-2 pt-6 sm:px-8 sm:pb-3 sm:pt-7">
              <SheetTitle>Add new venue</SheetTitle>
              <SheetDescription>
                {createOrg
                  ? `New venue under ${createOrg.name}. You can adjust details later in settings.`
                  : null}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 px-5 pb-2 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="venue-switcher-new-name">Venue name</Label>
                <Input
                  id="venue-switcher-new-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Hawthorn"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-switcher-new-address">
                  Street address (optional)
                </Label>
                <Input
                  id="venue-switcher-new-address"
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="Line 1"
                  autoComplete="street-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-switcher-new-tz">Timezone</Label>
                <Input
                  id="venue-switcher-new-tz"
                  value={createTimezone}
                  onChange={(e) => setCreateTimezone(e.target.value)}
                  placeholder="Australia/Melbourne"
                  autoComplete="off"
                />
              </div>
            </div>
            <SheetFooter className="gap-2 p-0 px-5 pb-6 pt-2 sm:flex-col sm:space-x-0 sm:px-8 sm:pb-8 sm:pt-3">
              <Button
                type="button"
                disabled={
                  createVenue.isPending ||
                  !createOrg?.slug ||
                  !createName.trim()
                }
                onClick={async () => {
                  if (!createOrg) {
                    return;
                  }
                  try {
                    const created = await createVenue.mutateAsync({
                      organisationSlug: createOrg.slug,
                      name: createName.trim(),
                      addressLine1: createAddress.trim() || null,
                      timezone: createTimezone.trim() || undefined,
                    });
                    const nextVenue: Venue = {
                      id: created.id,
                      name: created.name,
                      slug: created.slug,
                      suburb: null,
                      state: null,
                      category: "restaurant",
                      organisationId: createOrg.id,
                      organisationName: createOrg.name,
                      organisationSlug: created.organisationSlug,
                      organisationLogoUrl: createOrg.logoUrl,
                    };
                    setSelectedVenueKey(getVenueKey(nextVenue));
                    onVenueChange?.(nextVenue);
                    setCreateOrg(null);
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Could not create venue",
                    );
                  }
                }}
              >
                {createVenue.isPending ? "Creating…" : "Create venue"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={createVenue.isPending}
                onClick={() => setCreateOrg(null)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
