"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Plane } from "lucide-react";

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

import { OrganisationLogoAvatar } from "@/components/branding/organisation-logo-avatar";
import { useOrganisations } from "@/hooks/organisations/use-organisations";
import type { Organisation } from "@/entities/organisations/api/endpoints";
import { ORG } from "@/lib/aviate-demo";

// Resilient fallback so the switcher always brands correctly, even before the
// API resolves or if the account is not yet attached to an org.
const FALLBACK_ORG: Organisation = {
  id: "fallback",
  name: ORG.name,
  slug: ORG.slug,
  logo_url: ORG.logoUrl,
};

const logoBoxClassName =
  "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg";

export function OrgSwitcher() {
  const { data: organisations, isLoading } = useOrganisations();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { state, isMobile } = useSidebar();
  const isCollapsed = !isMobile && state === "collapsed";

  const orgs = useMemo<Organisation[]>(
    () => (organisations && organisations.length > 0 ? organisations : [FALLBACK_ORG]),
    [organisations]
  );

  const selected =
    orgs.find((o) => o.id === selectedId) ?? orgs[0] ?? FALLBACK_ORG;

  // The bundled asset backstops a null logo_url so the mark shows immediately.
  const logoFor = (org: Organisation) => org.logo_url ?? ORG.logoUrl;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip="Organisation"
              className="group/org-switcher"
            >
              <OrganisationLogoAvatar
                logoUrl={logoFor(selected)}
                fallbackIcon={Plane}
                className={logoBoxClassName}
                fallbackClassName="h-5 w-5"
              />
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold">
                      {isLoading ? "Loading…" : selected.name}
                    </span>
                    <span className="truncate text-[0.65rem] opacity-70">
                      {ORG.subtitle}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 opacity-70 transition-transform duration-200 group-data-[state=open]/org-switcher:rotate-180" />
                </>
              )}
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" side="right" align="start">
            <Command>
              <CommandInput placeholder="Search organisations…" />
              <CommandList>
                <CommandEmpty>No organisations found.</CommandEmpty>
                <CommandGroup heading="Organisations">
                  {orgs.map((org) => {
                    const isSelected = org.id === selected.id;
                    return (
                      <CommandItem
                        key={org.id}
                        value={org.name}
                        onSelect={() => {
                          setSelectedId(org.id);
                          setOpen(false);
                        }}
                      >
                        <OrganisationLogoAvatar
                          logoUrl={logoFor(org)}
                          fallbackIcon={Building2}
                          className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded"
                          fallbackClassName="h-4 w-4 text-muted-foreground"
                        />
                        <span className="flex-1 truncate text-sm">
                          {org.name}
                        </span>
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
