"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { SchoolDetailHeader } from "../components/school-detail-header";
import { SchoolDetailSidebar } from "../components/school-detail-sidebar";
import { SchoolDeleteSchoolDialogs } from "./school-delete-school-dialogs";
import { SchoolDetailMobileHeader } from "./school-detail-mobile-header";
import { SchoolDetailProvider } from "./school-detail-context";
import { SchoolDetailTabContent } from "./school-detail-tab-content";
import type { SchoolDetailDrawerProps, SchoolDetailTabId } from "./types";

type TabId = SchoolDetailTabId;

export function SchoolDetailDrawerContent({
  school,
  open,
  onOpenChange,
  initialTab = "onboarding",
  onTabChange,
  onSchoolUpdate,
}: SchoolDetailDrawerProps) {
  const {
    hasAccess: canAccessSchoolActivation,
    isLoading: isLoadingSchoolActivationAccess,
  } = useFeatureAccess("admin:school-activation");
  const [activeSection, setActiveSection] = useState<TabId>(
    initialTab || "onboarding"
  );
  const [isDeleteSchoolDialogOpen, setIsDeleteSchoolDialogOpen] =
    useState(false);
  const prevInitialTabRef = useRef<TabId | undefined>(initialTab);
  const prevOpenRef = useRef(open);
  const classesDialogIntentRef = useRef(false);

  useEffect(() => {
    const initialTabChanged = prevInitialTabRef.current !== initialTab;
    const drawerJustOpened = !prevOpenRef.current && open;

    if (open && (initialTabChanged || drawerJustOpened)) {
      setActiveSection(initialTab || "onboarding");
      prevInitialTabRef.current = initialTab;
    }

    if (!open && prevOpenRef.current) {
      classesDialogIntentRef.current = false;
    }

    prevOpenRef.current = open;
  }, [open, initialTab]);

  const handleTabChange = (tab: TabId) => {
    if (
      tab === "activation" &&
      !isLoadingSchoolActivationAccess &&
      !canAccessSchoolActivation
    ) {
      return;
    }
    setActiveSection(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (
      !open ||
      activeSection !== "activation" ||
      isLoadingSchoolActivationAccess ||
      canAccessSchoolActivation
    ) {
      return;
    }
    setActiveSection("onboarding");
    onTabChange?.("onboarding");
  }, [
    open,
    activeSection,
    canAccessSchoolActivation,
    isLoadingSchoolActivationAccess,
    onTabChange,
  ]);

  if (!school) return null;

  return (
    <SchoolDetailProvider
      value={{
        school,
        open,
        activeSection,
        handleTabChange,
        onOpenChange,
        onSchoolUpdate,
        classesDialogIntentRef,
        isDeleteSchoolDialogOpen,
        setIsDeleteSchoolDialogOpen,
      }}
    >
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[95vh] w-full max-w-7xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 gap-2 overflow-hidden flex flex-col"
        >
          <SheetTitle className="sr-only">
            {school.name} - School Details
          </SheetTitle>

          <SchoolDetailHeader school={school} />

          <div className="flex flex-1 overflow-hidden min-h-0 gap-0">
            <SchoolDetailSidebar
              activeTab={activeSection}
              onTabChange={handleTabChange}
              onDeleteClick={() => setIsDeleteSchoolDialogOpen(true)}
            />

            <main className="flex flex-1 flex-col overflow-hidden min-h-0 pt-2 pr-6 pl-4">
              <SchoolDetailMobileHeader />

              <div
                className={cn(
                  "flex-1 min-h-0",
                  activeSection === "users"
                    ? "flex flex-col overflow-hidden"
                    : "overflow-y-auto"
                )}
              >
                <SchoolDetailTabContent />
              </div>
            </main>
          </div>
        </SheetContent>

        <SchoolDeleteSchoolDialogs />
      </Sheet>
    </SchoolDetailProvider>
  );
}
