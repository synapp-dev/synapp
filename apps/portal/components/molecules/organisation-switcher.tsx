"use client";

import * as React from "react";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { useOrganisations } from "@/stores/organisations/organisation-store";

// TODO: Create these components/hooks
// import { IfCan, usePermissionWithLoading } from "@/lib/permissions";
// import { NewOrganisationSheet } from "@/components/organisms/new-organisation-sheet";

export function OrganisationSwitcher() {
  const { isMobile } = useSidebar();
  const router = useRouter();

  // Use the simplified store hook that auto-fetches
  const {
    organisations,
    isLoading,
    error,
    selectedOrganisation,
    setSelectedOrganisation,
  } = useOrganisations();

  // TODO: Implement permission checking
  // const { allowed: canCreateOrganisation, loading: permissionLoading } =
  //   usePermissionWithLoading("create_organisation");

  // State to control the new organisation sheet
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleOrganisationSelect = (orgId: string) => {
    const selectedOrg = organisations.find((org: any) => org.id === orgId);
    if (selectedOrg) {
      setSelectedOrganisation(selectedOrg);
      // Update the URL with the new organisation slug
      const currentPath = window.location.pathname;
      const newPath = currentPath.replace(/\/[^/]+/, `/${selectedOrg.slug}`);
      router.push(newPath);
    }
  };

  const handleCreateOrganisation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropdownOpen(false); // Close the dropdown first
    setTimeout(() => {
      setIsCreateSheetOpen(true); // Then open the sheet
    }, 100); // Small delay to ensure dropdown closes first
  };

  if (isLoading) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" disabled>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  Loading organisations...
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* TODO: Include sheet for all cases */}
        {/* <NewOrganisationSheet
          open={isCreateSheetOpen}
          onOpenChange={setIsCreateSheetOpen}
        /> */}
      </>
    );
  }

  if (error) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-red-500">
                Error loading organisations
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // If there's only one organisation, render a simple button without dropdown but still include create option
  if (organisations.length === 1) {
    const organisation = organisations[0];
    if (!organisation) {
      return null;
    }
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {organisation.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {/* No role_name property, so show nothing or a placeholder */}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Organisations
                </DropdownMenuLabel>
                {organisation && (
                  <DropdownMenuItem
                    key={organisation.id}
                    onClick={() => handleOrganisationSelect(organisation.id)}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Building2 className="size-3.5 shrink-0" />
                    </div>
                    {organisation.name}
                    <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
                  </DropdownMenuItem>
                )}

                {/* TODO: Implement permission checking */}
                {/* <IfCan action="create_organisation">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onClick={handleCreateOrganisation}
                    disabled={permissionLoading}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      {permissionLoading ? (
                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </div>
                    <div className="font-medium">
                      {permissionLoading
                        ? "Checking permission..."
                        : "Create organisation"}
                    </div>
                  </DropdownMenuItem>
                </IfCan> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* TODO: Render the sheet outside the dropdown to avoid conflicts */}
        {/* <NewOrganisationSheet
          open={isCreateSheetOpen}
          onOpenChange={setIsCreateSheetOpen}
        /> */}
      </>
    );
  }

  // If there are multiple organisations, render the dropdown switcher
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {selectedOrganisation ? (
                    <Building2 className="size-4" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {selectedOrganisation?.name || "No organisation selected"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {/* No role_name property, so show nothing or a placeholder */}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Organisations
              </DropdownMenuLabel>
              {organisations.length > 0 ? (
                organisations.map((organisation: any, index: number) => (
                  <DropdownMenuItem
                    key={organisation.id}
                    onClick={() => handleOrganisationSelect(organisation.id)}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Building2 className="size-3.5 shrink-0" />
                    </div>
                    {organisation.name}
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Building2 className="size-3.5 shrink-0" />
                  </div>
                  No organisations found
                </DropdownMenuItem>
              )}
              {/* TODO: Implement permission checking */}
              {/* <IfCan action="create_organisation">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={handleCreateOrganisation}
                  disabled={permissionLoading}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    {permissionLoading ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </div>
                  <div className="font-medium">
                    {permissionLoading
                      ? "Checking permission..."
                      : "Create organisation"}
                  </div>
                </DropdownMenuItem>
              </IfCan> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* TODO: Render the sheet outside the dropdown to avoid conflicts */}
      {/* <NewOrganisationSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
      /> */}
    </>
  );
}
