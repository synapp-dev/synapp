"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@workspace/ui/components/sidebar";
import { User, ShieldCheck, History, Trash2, Briefcase, GraduationCap, Settings } from "lucide-react";
import type { TabType } from "./types";

interface UserDetailSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  canManageFeatures?: boolean;
}

export function UserDetailSidebar({
  activeTab,
  onTabChange,
  canManageFeatures,
}: UserDetailSidebarProps) {
  return (
    <div className="hidden md:flex flex-col w-48 shrink-0 bg-transparent">
      <div className="h-fit">
        <SidebarProvider className="items-start">
          <Sidebar
            collapsible="none"
            className="border-0 p-0 bg-transparent"
          >
            <SidebarContent className="px-1">
              <SidebarGroup className="p-0">
                <SidebarGroupContent className="p-0">
                  <SidebarMenu className="p-2">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === "details"}
                        onClick={() => onTabChange("details")}
                        className={
                          activeTab === "details"
                            ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                            : ""
                        }
                      >
                        <User className="h-4 w-4" />
                        <span>Details</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === "roles"}
                        onClick={() => onTabChange("roles")}
                        className={
                          activeTab === "roles"
                            ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                            : ""
                        }
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Roles</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === "positions"}
                        onClick={() => onTabChange("positions")}
                        className={
                          activeTab === "positions"
                            ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                            : ""
                        }
                      >
                        <Briefcase className="h-4 w-4" />
                        <span>Positions</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === "classes"}
                        onClick={() => onTabChange("classes")}
                        className={
                          activeTab === "classes"
                            ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                            : ""
                        }
                      >
                        <GraduationCap className="h-4 w-4" />
                        <span>Classes</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === "history"}
                        onClick={() => onTabChange("history")}
                        className={
                          activeTab === "history"
                            ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                            : ""
                        }
                      >
                        <History className="h-4 w-4" />
                        <span>History</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeTab === "features"}
                        onClick={canManageFeatures ? () => onTabChange("features") : undefined}
                        disabled={!canManageFeatures}
                        className={
                          activeTab === "features"
                            ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                            : ""
                        }
                      >
                        <Settings className="h-4 w-4" />
                        <span>Feature Access</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarSeparator className="!mx-0 !ml-0 my-1" />
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        <span>Delete user</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </div>
    </div>
  );
}
