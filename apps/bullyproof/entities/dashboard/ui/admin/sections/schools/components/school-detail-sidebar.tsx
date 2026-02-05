"use client";

import React from "react";
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
import {
  Rocket,
  Eye,
  Users,
  GraduationCap,
  Activity,
  Star,
  Key,
  Trash2,
  Settings,
} from "lucide-react";

type TabId =
  | "onboarding"
  | "details"
  | "users"
  | "classes"
  | "activity"
  | "culture"
  | "license"
  | "features";

interface SchoolDetailSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onDeleteClick: () => void;
}

const navItems = [
  { id: "onboarding", name: "Onboarding", icon: Rocket },
  { id: "details", name: "Details", icon: Eye },
  { id: "users", name: "Users", icon: Users },
  { id: "classes", name: "Classes", icon: GraduationCap },
  { id: "activity", name: "Activity", icon: Activity, disabled: true },
  { id: "culture", name: "Culture", icon: Star, disabled: true },
  { id: "license", name: "License", icon: Key },
  { id: "features", name: "Feature Access", icon: Settings },
];

export function SchoolDetailSidebar({
  activeTab,
  onTabChange,
  onDeleteClick,
}: SchoolDetailSidebarProps) {
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
                    {navItems.map((item, index) => {
                      const Icon = item.icon;
                      const isOnboarding = item.id === "onboarding";
                      const isDisabled = item.disabled;
                      
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={activeTab === item.id}
                            onClick={() => {
                              if (!isDisabled) {
                                onTabChange(item.id as TabId);
                              }
                            }}
                            disabled={isDisabled}
                            className={
                              isDisabled
                                ? "opacity-50 cursor-not-allowed"
                                : activeTab === item.id
                                  ? isOnboarding
                                    ? "!bg-orange-500 !text-white hover:!bg-orange-500/90 hover:!text-white data-[active=true]:!bg-orange-500 data-[active=true]:!text-white"
                                    : "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                                  : isOnboarding
                                    ? "animate-pulse text-orange-600"
                                    : ""
                            }
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    <SidebarSeparator className="!mx-0 !ml-0 my-1" />
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={onDeleteClick}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete School</span>
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
