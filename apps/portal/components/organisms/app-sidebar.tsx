"use client";

import * as React from "react";

import { NavUser } from "@/components/molecules/nav-user";
import { OrganisationSwitcher } from "@/components/molecules/organisation-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
// import { ProjectSwitcher } from "@/components/project-switcher";
import { Separator } from "@workspace/ui/components/separator";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  //   const { getActiveProject } = useProjectScope();
  //   const activeProject = getActiveProject();
  //   const { navSections, isLoading, error } = useNavigation(
  //     activeProject?.project_id || ""
  //   );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader></SidebarHeader>
      <Separator />
      <SidebarContent>
        <OrganisationSwitcher />
        {/* <div className="px-2 pt-4"></div>
        {!activeProject ? (
          <></>
        ) : isLoading ? (
          <div className="p-4 text-muted-foreground text-sm animate-pulse w-full flex justify-center items-center">
            <LoaderPinwheel className="w-4 h-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : navSections.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No navigation items available
          </div>
        ) : (
          <div key={activeProject.project_id}>
            {navSections
              .filter((section) => section.items && section.items.length > 0)
              .map((section) => (
                <NavSection key={section.id} {...section} />
              ))}
          </div>
        )} */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
