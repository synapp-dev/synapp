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
import { FeatureGuard } from "@/components/molecules/feature-guard";
import type { TabType } from "./types";

interface UserDetailSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  canManageFeatures?: boolean;
  onDeleteClick?: () => void;
  /** When provided, only show these tabs. Omits History, Features, and Delete. */
  visibleTabs?: TabType[];
}

const TAB_CONFIG: Array<{
  tab: TabType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = [
  { tab: "details", icon: User, label: "Details" },
  { tab: "roles", icon: ShieldCheck, label: "Roles" },
  { tab: "positions", icon: Briefcase, label: "Positions" },
  { tab: "classes", icon: GraduationCap, label: "Classes" },
  { tab: "history", icon: History, label: "History" },
  { tab: "features", icon: Settings, label: "Feature Access" },
];

export function UserDetailSidebar({
  activeTab,
  onTabChange,
  canManageFeatures,
  onDeleteClick,
  visibleTabs,
}: UserDetailSidebarProps) {
  const tabsToShow = visibleTabs ?? (TAB_CONFIG.map((c) => c.tab) as TabType[]);
  const showDelete = !visibleTabs && onDeleteClick;

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
                    {TAB_CONFIG.filter((c) => tabsToShow.includes(c.tab)).map(
                      ({ tab, icon: Icon, label }) => (
                        <SidebarMenuItem key={tab}>
                          <SidebarMenuButton
                            isActive={activeTab === tab}
                            onClick={() =>
                              tab === "features" && !canManageFeatures
                                ? undefined
                                : onTabChange(tab)
                            }
                            disabled={tab === "features" && !canManageFeatures}
                            className={
                              activeTab === tab
                                ? "!bg-[var(--brand-bullyproof-primary)] !text-white hover:!bg-[var(--brand-bullyproof-primary)]/90 hover:!text-white data-[active=true]:!bg-[var(--brand-bullyproof-primary)] data-[active=true]:!text-white"
                                : ""
                            }
                          >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    )}
                    {showDelete && (
                      <>
                        <SidebarSeparator className="!mx-0 !ml-0 my-1" />
                        <SidebarMenuItem>
                          <FeatureGuard feature="admin:delete-user">
                            <SidebarMenuButton
                              disabled={!onDeleteClick}
                              onClick={onDeleteClick}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete user</span>
                            </SidebarMenuButton>
                          </FeatureGuard>
                        </SidebarMenuItem>
                      </>
                    )}
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
