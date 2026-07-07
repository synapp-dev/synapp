"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Star, AlertTriangle } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import type { ClassOption } from "@/types/lesson-wizard";
import { classesApi } from "@/entities/classes/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { apiFetch } from "@/lib/api/fetcher.client";
import { useStages } from "@/entities/stages/model/store";

interface LessonWizardClassesProps {
  schoolId: string | null;
  selectedClasses: ClassOption[];
  onClassesChange: (classes: ClassOption[]) => void;
}

type ClassWithYearCodes = {
  id: string;
  name: string;
  code: string | null;
  schoolId: string;
  yearCodes?: string[] | null;
  yearNames?: string[] | null;
};

type UserClass = {
  classId: string;
  className: string;
  classCode: string | null;
  schoolId: string;
  schoolName: string;
  active: boolean;
};

type ClassProgressInfo = {
  classId: string;
  stageName: string;
  topicTitle: string | null;
  stageOrder: number | null;
  status: "next_topic" | "fallback_year_match" | "stage_complete" | "no_match";
};

/** Scrolls its text when it overflows; static otherwise. */
function MarqueeText({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const inner = textRef.current;
    if (!container || !inner) return;
    setIsOverflowing(inner.scrollWidth > container.clientWidth + 2);
  }, [text]);

  return (
    <span
      ref={containerRef}
      className="block max-w-[170px] overflow-hidden whitespace-nowrap"
    >
      <style>{`@keyframes bp-marquee { from { transform: translateX(0); } to { transform: translateX(calc(-50% - 12px)); } }`}</style>
      {isOverflowing ? (
        <span className="inline-flex w-max gap-6 animate-[bp-marquee_9s_linear_infinite]">
          <span>{text}</span>
          <span aria-hidden>{text}</span>
        </span>
      ) : (
        <span ref={textRef}>{text}</span>
      )}
    </span>
  );
}

export function LessonWizardClasses({
  schoolId,
  selectedClasses,
  onClassesChange,
}: LessonWizardClassesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState<string>("all");
  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [userClasses, setUserClasses] = useState<UserClass[]>([]);
  const [classProgress, setClassProgress] = useState<
    Map<string, ClassProgressInfo>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useMeStore((s) => s.currentUser);
  
  // Fetch curriculum stages with year codes (cached via React Query)
  const { stages, isLoading: isLoadingStages } = useStages();

  // Fetch all classes for the school
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      // Fetch all classes for the school
      classesApi.get.list({ schoolId, active: true }),
      // Fetch user's assigned classes if user is logged in
      currentUser?.id
        ? apiFetch<UserClass[]>(`/users/${currentUser.id}/classes`)
        : Promise.resolve({ data: [], error: null }),
    ])
      .then(([classesResult, userClassesResult]) => {
        if (classesResult.error) {
          setError(classesResult.error.message || "Failed to load classes");
          setClasses([]);
        } else if (classesResult.data) {
          setClasses(classesResult.data);
        } else {
          setClasses([]);
        }

        if (userClassesResult.error) {
          console.error("Failed to fetch user classes:", userClassesResult.error);
          setUserClasses([]);
        } else if (userClassesResult.data) {
          // Filter user classes to only include classes for this school
          const filteredUserClasses = userClassesResult.data.filter(
            (uc) => uc.schoolId === schoolId && uc.active
          );
          setUserClasses(filteredUserClasses);
        } else {
          setUserClasses([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch classes:", err);
        setError("Failed to load classes. Please try again.");
        setClasses([]);
        setUserClasses([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolId, currentUser?.id]);

  // Fetch each class's curriculum position (level + next lesson) so the
  // selection step can explain level mismatches instead of just flagging them.
  useEffect(() => {
    if (classes.length === 0) {
      setClassProgress(new Map());
      return;
    }
    let alive = true;
    apiFetch<{ classes: ClassProgressInfo[] }>("/lessons/class-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classIds: classes.map((c) => c.id) }),
    })
      .then((result) => {
        if (!alive || result.error || !result.data) return;
        setClassProgress(
          new Map(result.data.classes.map((row) => [row.classId, row]))
        );
      })
      .catch(() => {
        // Non-fatal: rows just fall back to the generic warning tooltip.
      });
    return () => {
      alive = false;
    };
  }, [classes]);

  // Split classes into "My Classes" and "All Classes", and create a Set for quick lookup
  const { myClasses, allClasses, userClassIds } = useMemo(() => {
    const userClassIdsSet = new Set(userClasses.map((uc) => uc.classId));
    
    const myClassesList: ClassWithYearCodes[] = [];
    const allClassesList: ClassWithYearCodes[] = [];

    classes.forEach((cls) => {
      if (userClassIdsSet.has(cls.id)) {
        myClassesList.push(cls);
      } else {
        allClassesList.push(cls);
      }
    });

    return {
      myClasses: myClassesList,
      allClasses: allClassesList,
      userClassIds: userClassIdsSet,
    };
  }, [classes, userClasses]);

  // Get all available year levels from classes
  const availableYearLevels = useMemo(() => {
    const yearLevelsSet = new Set<string>();
    classes.forEach((cls) => {
      if (cls.yearNames && cls.yearNames.length > 0) {
        cls.yearNames.forEach((yearName) => yearLevelsSet.add(yearName));
      }
    });
    return Array.from(yearLevelsSet).sort();
  }, [classes]);

  // Filter classes based on search query and year level filter
  const filterClasses = (classList: ClassWithYearCodes[]) => {
    let filtered = classList;

    // Filter by search query
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cls) =>
          cls.name.toLowerCase().includes(queryLower) ||
          cls.code?.toLowerCase().includes(queryLower) ||
          cls.yearCodes?.some((code) => code.toLowerCase().includes(queryLower)) ||
          cls.yearNames?.some((name) => name.toLowerCase().includes(queryLower))
      );
    }

    // Filter by year level
    if (yearLevelFilter && yearLevelFilter !== "all") {
      filtered = filtered.filter(
        (cls) => cls.yearNames?.includes(yearLevelFilter)
      );
    }

    return filtered;
  };

  const filteredMyClasses = filterClasses(myClasses);
  const filteredAllClasses = filterClasses(allClasses);

  // Combine classes with myClasses first
  const allFilteredClasses = [...filteredMyClasses, ...filteredAllClasses];

  // Helper function to determine curriculum stage(s) for a class based on its year codes
  const getStagesForClass = useMemo(() => {
    return (classItem: ClassWithYearCodes): Set<string> => {
      const stageIds = new Set<string>();
      
      if (!classItem.yearCodes || classItem.yearCodes.length === 0) {
        return stageIds;
      }
      
      if (!stages || stages.length === 0) {
        return stageIds;
      }
      
      // For each year code in the class, find which stage(s) it belongs to
      classItem.yearCodes.forEach((yearCode) => {
        stages.forEach((stage) => {
          if (stage.years && stage.years.some((year) => year.code === yearCode)) {
            stageIds.add(stage.id);
          }
        });
      });
      
      return stageIds;
    };
  }, [stages]);

  // Determine baseline stage(s) from the first selected class
  const baselineStages = useMemo(() => {
    if (selectedClasses.length === 0 || isLoadingStages || !stages || stages.length === 0) {
      return new Set<string>();
    }
    
    // Find the first selected class in our classes list
    const firstSelectedClass = classes.find((cls) => cls.id === selectedClasses[0].id);
    if (!firstSelectedClass) {
      return new Set<string>();
    }
    
    return getStagesForClass(firstSelectedClass);
  }, [selectedClasses, classes, getStagesForClass, isLoadingStages, stages]);

  // Helper function to check if a class has different stage(s) than the baseline
  const hasDifferentStage = useMemo(() => {
    return (classItem: ClassWithYearCodes): boolean => {
      // Don't show alert if no classes selected, stages not loaded, or no baseline
      if (selectedClasses.length === 0 || isLoadingStages || !stages || stages.length === 0 || baselineStages.size === 0) {
        return false;
      }
      
      // Don't show alert if class has no year codes (can't determine stage)
      if (!classItem.yearCodes || classItem.yearCodes.length === 0) {
        return false;
      }
      
      // Get stages for this class
      const classStages = getStagesForClass(classItem);
      
      // If class has no matching stages, don't show alert (edge case)
      if (classStages.size === 0) {
        return false;
      }
      
      // Check if ANY of the class's stages differ from baseline
      // If there's no overlap between classStages and baselineStages, they differ
      const hasOverlap = Array.from(classStages).some((stageId) => baselineStages.has(stageId));
      
      return !hasOverlap;
    };
  }, [selectedClasses, baselineStages, getStagesForClass, isLoadingStages, stages]);

  // Convert ClassWithYearCodes to ClassOption
  const toClassOption = (cls: ClassWithYearCodes): ClassOption => ({
    id: cls.id,
    name: cls.name,
    yearLevel: cls.yearCodes?.join(", ") || cls.code || "N/A",
    schoolId: cls.schoolId,
  });

  const toggleClassSelection = (classItem: ClassWithYearCodes) => {
    const classOption = toClassOption(classItem);
    const isSelected = selectedClasses.some((c) => c.id === classOption.id);

    if (isSelected) {
      onClassesChange(selectedClasses.filter((c) => c.id !== classOption.id));
    } else {
      onClassesChange([...selectedClasses, classOption]);
    }
  };

  const renderClassCard = (classItem: ClassWithYearCodes) => {
    const isSelected = selectedClasses.some((c) => c.id === classItem.id);
    const isMyClass = userClassIds.has(classItem.id);
    const showsStageWarning = hasDifferentStage(classItem);
    const progress = classProgress.get(classItem.id);
    const progressLabel = progress
      ? progress.status === "stage_complete"
        ? `${progress.stageName} complete`
        : progress.topicTitle
          ? `${progress.stageName}${progress.stageOrder != null ? ` · L${progress.stageOrder}` : ""} ${progress.topicTitle}`
          : progress.stageName
      : null;

    return (
      <button
        key={classItem.id}
        onClick={() => toggleClassSelection(classItem)}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
          isSelected
            ? "border-blue-600 dark:border-blue-400 bg-blue-600/10 dark:bg-blue-400/10"
            : "border-border hover:bg-accent"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showsStageWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mb-0.5 animate-pulse" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                {progress ? (
                  <p>
                    <span className="font-semibold">{classItem.name}</span> is on{" "}
                    <span className="font-semibold">{progress.stageName}</span>
                    {progress.status === "stage_complete"
                      ? " (all lessons complete)"
                      : progress.topicTitle
                        ? `, next lesson: ${progress.stageOrder != null ? `L${progress.stageOrder} ` : ""}${progress.topicTitle}`
                        : ""}
                    {" "}- a different level from the class you&apos;ve already
                    selected.
                  </p>
                ) : (
                  <p>
                    This class&apos;s lesson level differs from the class
                    you&apos;ve already selected
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          <span className="font-medium">{classItem.name}</span>
          {showsStageWarning && progressLabel && (
            <Badge
              variant="outline"
              className="hidden sm:flex text-[10px] py-0 px-1.5 h-5 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-normal min-w-0"
            >
              <MarqueeText text={progressLabel} />
            </Badge>
          )}
          {isMyClass && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0 mb-0.5" />
              </TooltipTrigger>
              <TooltipContent>
                <p>My Class</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end">
          {classItem.yearNames && classItem.yearNames.length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-end">
              {classItem.yearNames.map((yearName, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {yearName}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-background pb-4 flex flex-col gap-4">
        {/* Search and filter */}
        <div className="flex gap-2">
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {availableYearLevels.length > 0 && (
            <Select value={yearLevelFilter} onValueChange={setYearLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYearLevels.map((yearLevel) => (
                  <SelectItem key={yearLevel} value={yearLevel}>
                    {yearLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Class list */}
      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {allFilteredClasses.length > 0 ? (
              allFilteredClasses.map(renderClassCard)
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery
                  ? `No classes found matching "${searchQuery}"`
                  : "No classes available for this school"}
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

