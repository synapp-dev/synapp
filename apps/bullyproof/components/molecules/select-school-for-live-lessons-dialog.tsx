"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { School } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog";
import { Card } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useMySchoolsQuery, type School as SchoolType } from "@/entities/me/model/useMySchoolsQuery";
import { useLiveLessonStore } from "@/stores/live-lesson-store";
import { cn } from "@workspace/ui/lib/utils";

type SelectSchoolForLiveLessonsDialogProps = {
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
      : (sector as any)?.name || "";

  // Handle levels: can be array or object
  const levels = (school as any)?.levels;
  const levelsText = Array.isArray(levels)
    ? levels.map((l: any) => (typeof l === "string" ? l : l?.name || "")).join(", ")
    : levels
      ? typeof levels === "string"
        ? levels
        : (levels as any)?.name || ""
      : "";

  return { stateText, sectorText, levelsText };
}

export function SelectSchoolForLiveLessonsDialog({
  open,
  onOpenChange,
}: SelectSchoolForLiveLessonsDialogProps) {
  const router = useRouter();
  const { getUniqueSchools } = useLiveLessonStore();
  const uniqueSchools = getUniqueSchools();

  // Fetch full school details for display
  const { data: allSchools = [], isLoading: isLoadingSchools } =
    useMySchoolsQuery({ limit: 50 });

  // Create a map of schoolId to school details
  const schoolMap = React.useMemo(() => {
    const map = new Map<string, SchoolType>();
    allSchools.forEach((school) => {
      map.set(school.id, school);
    });
    return map;
  }, [allSchools]);

  const handleSchoolSelect = (schoolSlug: string) => {
    onOpenChange(false);
    router.push(`/schools/${schoolSlug}/lessons`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[65vh] flex flex-col"
        showCloseButton={true}
      >
        <DialogHeader className="text-center shrink-0">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
            <School className="h-8 w-8" />
            Select a School
          </DialogTitle>
          <DialogDescription className="text-center">
            You have live lessons in multiple schools. Choose which school you'd like to view.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 py-2 pr-4">
            {isLoadingSchools ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="h-4 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-1/2 bg-muted rounded" />
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            ) : uniqueSchools.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No schools found</p>
              </div>
            ) : (
              uniqueSchools.map((schoolInfo) => {
                const school = schoolMap.get(schoolInfo.schoolId);
                const { stateText, sectorText, levelsText } = extractSchoolMetadata(school);

                return (
                  <Card
                    key={schoolInfo.schoolId}
                    className={cn(
                      "px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                      "border-border"
                    )}
                    onClick={() => handleSchoolSelect(schoolInfo.schoolSlug)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <School className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {school?.name || "Unknown School"}
                          </span>
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {schoolInfo.count} {schoolInfo.count === 1 ? "lesson" : "lessons"}
                          </span>
                        </div>
                        {(stateText || sectorText || levelsText) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {stateText && <span>{stateText}</span>}
                            {stateText && (sectorText || levelsText) && <span>•</span>}
                            {sectorText && <span>{sectorText}</span>}
                            {sectorText && levelsText && <span>•</span>}
                            {levelsText && <span>{levelsText}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
