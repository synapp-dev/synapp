"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GraduationCap, School, ChevronsRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Card } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { useDismissDialog } from "@/entities/me/api/dismissDialog";
import {
  useMySchoolsQuery,
  type School as SchoolType,
} from "@/entities/me/model/useMySchoolsQuery";
import { useMeStore } from "@/entities/me/model/store";
import { useQuery } from "@tanstack/react-query";
import { meApi } from "@/entities/me/api/endpoints";

type AddClassesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Helper function to extract school metadata (state, sector, levels)
function extractSchoolMetadata(school: SchoolType | null) {
  if (!school) {
    return { stateText: "", sectorText: "", levelsText: "" };
  }

  const st = (school as any)?.state;
  const stateText = st
    ? typeof st === "string"
      ? st.toUpperCase()
      : (st as any)?.code?.toUpperCase() || ""
    : "";

  // Handle sector: can be string (vSchoolsReadable) or object (vSchoolsEnriched)
  const sector = (school as any)?.sector;
  const sectorText =
    typeof sector === "string"
      ? sector
      : sector && typeof sector === "object"
        ? (sector as any)?.name || ""
        : "";

  // Handle levels: can be string[] (vSchoolsReadable) or object[] (vSchoolsEnriched)
  const lvls = (school as any)?.levels;
  let levelsText = "";
  if (Array.isArray(lvls) && lvls.length > 0) {
    // Extract names if objects, or use strings directly
    const levelNames = lvls.map((lvl) =>
      typeof lvl === "string"
        ? lvl
        : (lvl as any)?.name || (lvl as any)?.key || ""
    );
    const lower = levelNames.map((s) => s.toLowerCase());
    const hasPrimary = lower.some((s) => s.includes("primary"));
    const hasSecondary = lower.some((s) => s.includes("secondary"));
    if (hasPrimary && hasSecondary) levelsText = "P-12";
    else if (hasPrimary) levelsText = "Primary";
    else if (hasSecondary) levelsText = "Secondary";
    else levelsText = levelNames.join(", ");
  }

  return { stateText, sectorText, levelsText };
}

export function AddClassesDialog({
  open,
  onOpenChange,
}: AddClassesDialogProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const [showSchoolSelection, setShowSchoolSelection] = React.useState(false);
  const dismissDialog = useDismissDialog();
  const router = useRouter();
  const currentUser = useMeStore((s) => s.currentUser);

  // Fetch user's schools (uses cached data if SchoolSwitcher already fetched)
  const { data: allSchools = [], isLoading: isLoadingSchools } =
    useMySchoolsQuery({ limit: 50 });

  // Fetch school IDs where user already has classes
  const {
    data: schoolsWithClassesData,
    isLoading: isLoadingSchoolsWithClasses,
  } = useQuery({
    queryKey: ["teacher-classes-schools", currentUser?.id],
    queryFn: async () => {
      const result = await meApi.teacherClasses.getSchoolsWithClasses();
      if (result.error) {
        throw new Error(
          result.error.message || "Failed to fetch schools with classes"
        );
      }
      return result.data ?? { schoolIds: [] };
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const schoolsWithClasses = schoolsWithClassesData?.schoolIds ?? [];

  // Filter schools where user has TEACHER role and doesn't already have classes
  const teacherSchools = React.useMemo(() => {
    if (!currentUser?.schoolRoles || !Array.isArray(allSchools)) {
      return [];
    }

    // Get school IDs where user has TEACHER role
    const teacherSchoolIds = (
      currentUser.schoolRoles as Array<{
        roleKey: string;
        schoolId: string;
      }>
    )
      .filter((role) => role.roleKey === "TEACHER" && role.schoolId)
      .map((role) => role.schoolId);

    // Filter schools to only include those where user is a teacher
    const teacherSchools = allSchools.filter((school) =>
      teacherSchoolIds.includes(school.id)
    );

    // Exclude schools where user already has classes
    return teacherSchools.filter(
      (school) => !schoolsWithClasses.includes(school.id)
    );
  }, [currentUser?.schoolRoles, allSchools, schoolsWithClasses]);

  const handleGetStarted = async () => {
    if (dontShowAgain) {
      try {
        await dismissDialog.mutateAsync("addClasses");
      } catch (error) {
        console.error("Error dismissing dialog:", error);
        // Still proceed even if there's an error
      }
    }

    // Check if user has multiple schools with TEACHER role
    if (teacherSchools.length === 1) {
      // Single school: navigate directly
      const school = teacherSchools[0];
      if (school.slug) {
        onOpenChange(false);
        setDontShowAgain(false);
        router.push(`/schools/${school.slug}/classes`);
      }
    } else if (teacherSchools.length > 1) {
      // Multiple schools: show selection view
      setShowSchoolSelection(true);
    } else {
      // No schools: just close the dialog
      onOpenChange(false);
      setDontShowAgain(false);
    }
  };

  const handleSchoolSelect = (school: (typeof teacherSchools)[0]) => {
    if (school.slug) {
      onOpenChange(false);
      setDontShowAgain(false);
      setShowSchoolSelection(false);
      router.push(`/schools/${school.slug}/classes`);
    }
  };

  const handleBack = () => {
    setShowSchoolSelection(false);
  };

  const handleMaybeLater = () => {
    if (showSchoolSelection) {
      setShowSchoolSelection(false);
    } else {
      onOpenChange(false);
      setDontShowAgain(false);
    }
  };

  // School selection view
  if (showSchoolSelection) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-xs max-h-[65vh] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="text-center shrink-0">
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              <School className="h-8 w-8" />
              Select a School
            </DialogTitle>
            <DialogDescription className="text-center">
              Choose which school you&apos;d like to add classes for.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 py-2 pr-4">
              {isLoadingSchools || isLoadingSchoolsWithClasses ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                        <div className="flex flex-col gap-1 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : teacherSchools.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    No schools found.
                  </div>
                </div>
              ) : (
                teacherSchools.map((school) => (
                  <Card
                    key={school.id}
                    className={cn(
                      "px-4 py-2.5 cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    )}
                    onClick={() => handleSchoolSelect(school)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "#008993" }}
                      >
                        <School className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex flex-col -space-y-0.5">
                        <h3 className="font-semibold text-base truncate">
                          {school.name}
                        </h3>
                        {(() => {
                          const { stateText, sectorText, levelsText } =
                            extractSchoolMetadata(school);
                          const parts = [
                            stateText,
                            sectorText,
                            levelsText,
                          ].filter(Boolean);
                          return parts.length > 0 ? (
                            <div className="flex items-center gap-1 text-muted-foreground text-[0.65rem]">
                              {parts.map((part, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1"
                                >
                                  <div className="truncate capitalize">
                                    {part}
                                  </div>
                                  {index < parts.length - 1 && (
                                    <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="shrink-0">
            <div className="flex w-full items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={dismissDialog.isPending}
              >
                Back
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Initial view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xs max-h-[65vh] flex flex-col"
        showCloseButton={false}
      >
        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-4">
            <div className="flex flex-col items-center gap-4 pb-2">
              <Image
                src="/images/bullyproof-logo.svg"
                alt="BullyProof"
                width={120}
                height={32}
                className="h-auto"
              />
            </div>
            <DialogHeader className="text-center mt-6">
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                <GraduationCap className="h-8 w-8" />
                Add Your Classes
              </DialogTitle>
              <DialogDescription className="text-center">
                Add the classes you teach frequently to quickly access them and
                manage your lessons more efficiently.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center pt-4 pb-4">
              <Card
                className={cn(
                  "px-4 py-1 transition-all cursor-pointer w-fit group rounded-lg",
                  dontShowAgain
                    ? "bg-blue-100/50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800"
                    : cn(
                        "bg-card border-border",
                        "hover:border-blue-300 dark:hover:border-blue-800",
                        "hover:[animation:var(--animate-border-pulse-blue)]"
                      )
                )}
                onClick={() => setDontShowAgain(!dontShowAgain)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dont-show-again"
                    checked={dontShowAgain}
                    onCheckedChange={(checked) =>
                      setDontShowAgain(checked === true)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "transition-colors",
                      dontShowAgain &&
                        "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    )}
                  />
                  <Label
                    htmlFor="dont-show-again"
                    className={cn(
                      "text-sm font-normal cursor-pointer transition-colors",
                      dontShowAgain
                        ? "text-blue-900 dark:text-blue-200"
                        : "group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Don&apos;t show this again
                  </Label>
                </div>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0">
          <div className="flex w-full items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleMaybeLater}
              disabled={
                dismissDialog.isPending ||
                isLoadingSchools ||
                isLoadingSchoolsWithClasses
              }
            >
              Maybe Later
            </Button>
            <Button
              type="button"
              onClick={handleGetStarted}
              disabled={
                dismissDialog.isPending ||
                isLoadingSchools ||
                isLoadingSchoolsWithClasses
              }
              className="bg-[var(--brand-bullyproof-primary)] gap-1 text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
            >
              {dismissDialog.isPending ||
              isLoadingSchools ||
              isLoadingSchoolsWithClasses ? (
                "Loading..."
              ) : (
                <>
                  Get Started
                  <ChevronsRight className="h-4 w-4 [animation:var(--animate-bounce-right)]" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
