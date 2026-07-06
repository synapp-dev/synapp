"use client";

import type { ClassRow, SchoolYearRow } from "@/types/db";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleX,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { classesApi } from "@/entities/classes/api/endpoints";
import { schoolApi } from "@/entities/school/api/endpoints";
import { useUsers } from "@/entities/users/model/store";
import { ClassesTable } from "@/entities/classes/ui/classes-table";
import { BulkYearLevelDialog } from "../../components/bulk-year-level-dialog";
import { ImportClassesDialog } from "../../components/import-classes-dialog";
import { useSchoolDetail } from "../school-detail-context";

type ClassWithYearCodes = ClassRow & { yearCodes?: string[] };

export function SchoolClassesPanel() {
  const {
    school,
    open,
    activeSection,
    onSchoolUpdate,
    classesDialogIntentRef,
  } = useSchoolDetail();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Search and filter state for classes
  const [classesSearchQuery, setClassesSearchQuery] = useState("");
  const [debouncedClassesSearchQuery, setDebouncedClassesSearchQuery] =
    useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState<string>("");
  const [classesRowSelection, setClassesRowSelection] = useState({});

  // Edit class dialog state
  const [editClassDialogOpen, setEditClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithYearCodes | null>(
    null
  );
  const [editClassName, setEditClassName] = useState("");
  const [editClassCode, setEditClassCode] = useState("");
  const [editClassStudentCap, setEditClassStudentCap] = useState<string>("");
  const [editClassActive, setEditClassActive] = useState(true);
  const [editClassRunningYear, setEditClassRunningYear] = useState<string>("");
  const [editSelectedYearIds, setEditSelectedYearIds] = useState<string[]>([]);
  const [editLoadingYears, setEditLoadingYears] = useState(false);
  const [editAvailableYears, setEditAvailableYears] = useState<
    Array<SchoolYearRow>
  >([]);
  const [editYearComboboxOpen, setEditYearComboboxOpen] = useState(false);
  const [editSelectedTeacherIds, setEditSelectedTeacherIds] = useState<
    string[]
  >([]);
  const [editTeacherComboboxOpen, setEditTeacherComboboxOpen] = useState(false);

  const { users, isLoading: loadingUsers } = useUsers({
    schoolId: school.id,
    limit: 100,
    offset: 0,
  });

  // Dialog states
  const [importClassesDialogOpen, setImportClassesDialogOpen] = useState(false);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [isDeleteClassesDialogOpen, setIsDeleteClassesDialogOpen] =
    useState(false);
  const [
    isConfirmDeleteClassesDialogOpen,
    setIsConfirmDeleteClassesDialogOpen,
  ] = useState(false);
  const [isDeletingClasses, setIsDeletingClasses] = useState(false);
  const [deleteClassesError, setDeleteClassesError] = useState<string | null>(
    null
  );

  // Bulk year level edit state
  const [bulkYearLevelDialogOpen, setBulkYearLevelDialogOpen] = useState(false);

  // Class form states
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classRunningYear, setClassRunningYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<
    Array<SchoolYearRow>
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearComboboxOpen, setYearComboboxOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const isClosingDialogRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Debounce classes search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClassesSearchQuery(classesSearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [classesSearchQuery]);

  // Fetch classes function - reusable for initial load and refetch after bulk edit
  const fetchClasses = useCallback(async () => {
    if (!school.id) return;
    
    setLoadingClasses(true);
    try {
      const result = await classesApi.get.list({ schoolId: school.id });
      if (!result.error && result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    } finally {
      setLoadingClasses(false);
    }
  }, [school.id]);

  // Track previous classes section to prevent duplicate fetches
  const prevClassesSectionRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeSection === "classes" && school.id) {
      // Only fetch if we're switching TO the classes section (not already on it)
      if (prevClassesSectionRef.current !== "classes") {
        fetchClasses();
        prevClassesSectionRef.current = "classes";
      }
    } else {
      prevClassesSectionRef.current = activeSection;
    }
  }, [activeSection, school.id, fetchClasses]);

  // Filter classes based on search and year level
  const filteredClasses = useMemo(() => {
    let filtered = classes;

    // Filter by search query
    if (debouncedClassesSearchQuery.trim()) {
      const searchLower = debouncedClassesSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (classItem) =>
          classItem.name.toLowerCase().includes(searchLower) ||
          classItem.code?.toLowerCase().includes(searchLower) ||
          classItem.yearCodes?.some((code) =>
            code.toLowerCase().includes(searchLower)
          )
      );
    }

    // Filter by year level
    if (yearLevelFilter && yearLevelFilter !== "all") {
      filtered = filtered.filter((classItem) =>
        classItem.yearCodes?.includes(yearLevelFilter)
      );
    }

    return filtered;
  }, [classes, debouncedClassesSearchQuery, yearLevelFilter]);

  // Memoize year codes for filter dropdown
  const yearLevelOptions = useMemo(() => {
    const allYearCodes = new Set<string>();
    classes.forEach((classItem) => {
      classItem.yearCodes?.forEach((code) => {
        allYearCodes.add(code);
      });
    });
    return Array.from(allYearCodes)
      .sort()
      .map((yearCode) => {
        const count = classes.filter((classItem) =>
          classItem.yearCodes?.includes(yearCode)
        ).length;
        return { yearCode, count };
      });
  }, [classes]);

  // Stable callback for row selection
  const handleClassesRowSelectionChange = useCallback(
    (selection: Record<string, boolean>) => {
      setClassesRowSelection(selection);
    },
    []
  );

  // Ref to track if edit dialog is open (to prevent infinite loops)
  const editDialogOpenRef = useRef(false);

  useEffect(() => {
    editDialogOpenRef.current = editClassDialogOpen;
  }, [editClassDialogOpen]);

  // Stable callback for class click
  const handleClassClick = useCallback(
    async (classItem: ClassWithYearCodes) => {
      // Prevent multiple clicks or if dialog is already open
      if (editDialogOpenRef.current) return;

      // Load full class data with years
      try {
        const result = await classesApi.get.byId(classItem.id);
        if (result.data && !editDialogOpenRef.current) {
          setEditingClass(result.data);
          setEditClassName(result.data.name);
          setEditClassCode(result.data.code || "");
          setEditClassStudentCap(result.data.studentCap?.toString() || "");
          setEditClassActive(result.data.active ?? true);

          // Extract running year from startYear
          const runningYear = result.data.startYear
            ? new Date(result.data.startYear).getFullYear().toString()
            : new Date().getFullYear().toString();
          setEditClassRunningYear(runningYear);

          // Get year IDs from the years array
          const yearIds = result.data.years?.map((y: any) => y.yearId) || [];
          setEditSelectedYearIds(yearIds);

          // Get teacher IDs from the teachers array
          const classData = result.data as any;
          const teacherIds =
            classData?.teachers?.map((t: any) => t.userId) || [];
          setEditSelectedTeacherIds(teacherIds);

          setEditClassDialogOpen(true);
        }
      } catch (error) {
        console.error("Failed to load class:", error);
      }
    },
    []
  );

  const editAvailableTeachers = useMemo(() => {
    if (!school.id || !users || users.length === 0) return [];

    return users.filter((user) => {
      // Check if user has TEACHER role for this school
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === school.id
      );

      // User must have TEACHER role for this school
      return schoolRoles.some((role) => role.roleKey === "TEACHER");
    });
  }, [users, school.id]);

  // Fetch school years for edit dialog (from school_year_assignments)
  useEffect(() => {
    if (editClassDialogOpen && school.id) {
      setEditLoadingYears(true);
      schoolApi.get
        .years(school.id)
        .then((result) => {
          if (!result.error && result.data) {
            const years = result.data
              .map((item: { year: any }) => item.year)
              .filter((year: any) => year != null);
            const sortedYears = [...years].sort((a, b) => {
              if (a.sortIndex != null && b.sortIndex != null) {
                return a.sortIndex - b.sortIndex;
              }
              const aCode = a.code || "";
              const bCode = b.code || "";
              return aCode.localeCompare(bCode);
            });
            setEditAvailableYears(sortedYears);
          }
        })
        .catch(() => setEditAvailableYears([]))
        .finally(() => setEditLoadingYears(false));
    }
  }, [editClassDialogOpen, school.id]);

  // Fetch school years when add class dialog opens (from school_year_assignments)
  useEffect(() => {
    if (addClassDialogOpen && school.id) {
      setLoadingYears(true);
      schoolApi.get
        .years(school.id)
        .then((result) => {
          if (!result.error && result.data) {
            const years = result.data
              .map((item: { year: any }) => item.year)
              .filter((year: any) => year != null);
            const sortedYears = [...years].sort((a, b) => {
              if (a.sortIndex != null && b.sortIndex != null) {
                return a.sortIndex - b.sortIndex;
              }
              const aCode = a.code || "";
              const bCode = b.code || "";
              return aCode.localeCompare(bCode);
            });
            setAvailableYears(sortedYears);
          }
        })
        .catch(() => setAvailableYears([]))
        .finally(() => setLoadingYears(false));
    } else if (!addClassDialogOpen) {
      setClassName("");
      setClassCode("");
      setClassRunningYear(new Date().getFullYear().toString());
      setSelectedYearIds([]);
    }
  }, [addClassDialogOpen, school.id]);

  // Generate year options for class running year (current year - 2 to current year + 8)
  const getClassRunningYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    const endYear = currentYear + 8;
    const years: { value: string; label: string }[] = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push({
        value: year.toString(),
        label: year.toString(),
      });
    }

    return years;
  };

  const dialogParam = searchParams?.get("dialog") || null;
  const prevDialogParamRef = useRef<string | null>(dialogParam);

  useEffect(() => {
    if (isClosingDialogRef.current) {
      return;
    }

    if (
      isInitialMountRef.current &&
      dialogParam === "add-class" &&
      open &&
      activeSection === "classes"
    ) {
      if (!classesDialogIntentRef.current) {
        classesDialogIntentRef.current = true;
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete("dialog");
        const newUrl = params.toString()
          ? `/admin/schools?${params.toString()}`
          : "/admin/schools";
        router.replace(newUrl, { scroll: false });
        return;
      }
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }

    const dialogParamChanged = prevDialogParamRef.current !== dialogParam;
    if (!dialogParamChanged && !open) {
      return;
    }
    prevDialogParamRef.current = dialogParam;

    if (open && activeSection === "classes") {
      if (dialogParam === "add-class" && !addClassDialogOpen) {
        if (!isInitialMountRef.current || classesDialogIntentRef.current) {
          setAddClassDialogOpen(true);
          classesDialogIntentRef.current = true;
          if (importClassesDialogOpen) {
            setImportClassesDialogOpen(false);
          }
        }
      } else if (dialogParam === "import-classes" && !importClassesDialogOpen) {
        setImportClassesDialogOpen(true);
        if (addClassDialogOpen) {
          setAddClassDialogOpen(false);
        }
      } else if (!dialogParam) {
        if (addClassDialogOpen) {
          setAddClassDialogOpen(false);
          setClassName("");
          setClassCode("");
          setClassRunningYear(new Date().getFullYear().toString());
          setSelectedYearIds([]);
        }
        if (importClassesDialogOpen) {
          setImportClassesDialogOpen(false);
        }
        classesDialogIntentRef.current = false;
      }
    }
  }, [
    open,
    school.id,
    activeSection,
    dialogParam,
    addClassDialogOpen,
    importClassesDialogOpen,
    router,
    searchParams,
    classesDialogIntentRef,
  ]);

  const tabContent =
    activeSection === "classes" ? (
                <div className="space-y-6 pt-1">
                  {/* Action Buttons and Search/Filters */}
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    {/* Add Class and Import Classes Buttons - Left */}
                    <div className="flex items-center gap-2 h-8">
                      {Object.keys(classesRowSelection).filter(
                        (key) => classesRowSelection[key]
                      ).length > 0 ? (
                        <div
                          className="flex items-center gap-2 opacity-0 animate-slide-up-fade-in"
                          style={{ animationFillMode: "forwards" }}
                        >
                          <div className="flex items-center gap-0.5 text-sm text-muted-foreground">
                            <span className="pl-4">
                              {
                                Object.keys(classesRowSelection).filter(
                                  (key) => classesRowSelection[key]
                                ).length
                              }
                            </span>
                            <Check className="h-4 w-4" />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setBulkYearLevelDialogOpen(true);
                                }}
                                className="group h-8 w-8 bg-primary/5 hover:bg-primary/10 border border-transparent hover:border-primary transition-all duration-200 ease-in-out"
                              >
                                <GraduationCap className="h-4 w-4 text-primary opacity-100" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bulk Edit Year Levels</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setIsDeleteClassesDialogOpen(true);
                                }}
                                className="group h-8 w-8 bg-destructive/5 hover:bg-destructive/10 border border-transparent hover:border-destructive transition-all duration-200 ease-in-out"
                              >
                                <Trash2 className="h-4 w-4 text-destructive opacity-100 group-hover:animate-shake-twice" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              // Mark that we're opening via click, not page load
                              classesDialogIntentRef.current = true;
                              setAddClassDialogOpen(true);
                              if (school.slug) {
                                const params = new URLSearchParams(
                                  searchParams?.toString() || ""
                                );
                                params.set("school", school.slug);
                                params.set("tab", "classes");
                                params.set("dialog", "add-class");
                                router.push(
                                  `/admin/schools?${params.toString()}`,
                                  {
                                    scroll: false,
                                  }
                                );
                              }
                            }}
                            disabled={loadingClasses && classes.length === 0}
                            className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <Plus className="h-4 w-4" />
                            Add Class
                          </Button>
                          <Button
                            onClick={() => {
                              setImportClassesDialogOpen(true);
                              if (school.slug) {
                                const params = new URLSearchParams(
                                  searchParams?.toString() || ""
                                );
                                params.set("school", school.slug);
                                params.set("tab", "classes");
                                params.set("dialog", "import-classes");
                                router.push(
                                  `/admin/schools?${params.toString()}`,
                                  {
                                    scroll: false,
                                  }
                                );
                              }
                            }}
                            variant="outline"
                            disabled={loadingClasses && classes.length === 0}
                            className="h-10 opacity-0 animate-slide-left-fade-in transition-colors"
                            style={{ animationFillMode: "forwards" }}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Import Data
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Vertical Separator */}
                    <div className="h-6 w-px bg-border" />

                    {/* Search and Filters - Right */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 min-w-0 transition-all duration-200 ease-in-out">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search by class name or code..."
                          value={classesSearchQuery}
                          onChange={(e) =>
                            setClassesSearchQuery(e.target.value)
                          }
                          className={cn(
                            "pl-10 pr-10 transition-all duration-200 ease-in-out",
                            debouncedClassesSearchQuery.trim() &&
                              "border-orange-500 bg-orange-500/10"
                          )}
                          disabled={loadingClasses && classes.length === 0}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {classesSearchQuery !== debouncedClassesSearchQuery ||
                          loadingClasses ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : classesSearchQuery ? (
                            <button
                              type="button"
                              onClick={() => setClassesSearchQuery("")}
                              className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Clear search"
                            >
                              <CircleX className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Select
                          value={yearLevelFilter || "all"}
                          onValueChange={setYearLevelFilter}
                          disabled={loadingClasses && classes.length === 0}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-[180px]",
                              yearLevelFilter &&
                                yearLevelFilter !== "all" &&
                                "border-orange-500 bg-orange-500/10"
                            )}
                            disabled={loadingClasses && classes.length === 0}
                          >
                            <SelectValue placeholder="Year Level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Year Levels</SelectItem>
                            {yearLevelOptions.map(({ yearCode, count }) => (
                              <SelectItem key={yearCode} value={yearCode}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{yearCode}</span>
                                  {count > 0 && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {count}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Vertical Separator */}
                    {(classesSearchQuery.trim() ||
                      (yearLevelFilter && yearLevelFilter !== "all")) && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        {/* Clear Filters Button */}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setClassesSearchQuery("");
                            setYearLevelFilter("");
                          }}
                          className={cn(
                            "flex items-center gap-1",
                            "text-orange-500 border-orange-500/10 hover:text-orange-500 hover:bg-orange-500/10"
                          )}
                          disabled={loadingClasses && classes.length === 0}
                        >
                          <CircleX className="h-4 w-4" />
                          Clear Filters
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="w-full space-y-4">
                    {loadingClasses ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : classes.length === 0 ? (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No Classes Found
                        </h3>
                        <p className="text-muted-foreground">
                          No classes have been created for this school yet.
                        </p>
                      </div>
                    ) : (
                      <>
                        <ClassesTable
                          classes={filteredClasses}
                          isLoading={false}
                          error={null}
                          showSelection={true}
                          onRowSelectionChange={handleClassesRowSelectionChange}
                          onClassClick={handleClassClick}
                        />
                        {Object.keys(classesRowSelection).length > 0 && (
                          <div className="flex items-center justify-between space-x-2 py-4">
                            <div className="text-muted-foreground flex-1 text-sm">
                              {Object.keys(classesRowSelection).length} of{" "}
                              {filteredClasses.length} row(s) selected.
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setBulkYearLevelDialogOpen(true);
                                }}
                              >
                                <GraduationCap className="h-4 w-4 mr-2" />
                                Bulk Edit Year Levels
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setIsDeleteClassesDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Selected
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
    ) : null;

  return (
    <>
      {tabContent}
      {/* Import Classes Dialog */}
      <ImportClassesDialog
        open={importClassesDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setImportClassesDialogOpen(false);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setImportClassesDialogOpen(open);
          }
        }}
        school={school}
        onSuccess={async () => {
          // Wait a bit to ensure database transactions are committed
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh classes list
          if (school.id) {
            setLoadingClasses(true);
            try {
              const result = await classesApi.get.list({
                schoolId: school.id,
              });
              if (result.data) {
                setClasses(result.data);
              }
            } catch (error) {
              console.error("Failed to refresh classes:", error);
            } finally {
              setLoadingClasses(false);
            }
          }

          // Refresh school data to update counts
          onSchoolUpdate?.();
        }}
      />

      {/* Add Class Dialog */}
      <Dialog
        open={addClassDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Set flag to prevent effect from interfering
            isClosingDialogRef.current = true;

            // Close dialog immediately
            setAddClassDialogOpen(false);
            setClassName("");
            setClassCode("");
            setClassRunningYear(new Date().getFullYear().toString());
            setSelectedYearIds([]);

            // Remove dialog query parameter from URL
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.delete("dialog");
            const newUrl = params.toString()
              ? `/admin/schools?${params.toString()}`
              : "/admin/schools";
            router.replace(newUrl, { scroll: false });

            // Reset flag after a brief delay to allow URL update to complete
            setTimeout(() => {
              isClosingDialogRef.current = false;
            }, 100);
          } else {
            setAddClassDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Create a new class for {school.name || "this school"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Class Name and Class Code in same row */}
            <div className="grid grid-cols-5 gap-4">
              {/* Class Name - 3/5 width */}
              <div className="col-span-3 space-y-1.5">
                <Label
                  htmlFor="class-name"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Class Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="class-name"
                  placeholder="Enter class name"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
              {/* Class Code - 2/5 width */}
              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="class-code"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Class Code
                </Label>
                <Input
                  id="class-code"
                  placeholder="Code (optional)"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                />
              </div>
            </div>

            {/* Class Running Year and School Years - Side by side */}
            <div className="flex gap-4 mt-6">
              {/* Class Running Year - Half width */}
              <div className="flex-1 space-y-1.5">
                <Label
                  htmlFor="class-running-year"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Running Year
                </Label>
                <Select
                  value={classRunningYear}
                  onValueChange={setClassRunningYear}
                >
                  <SelectTrigger id="class-running-year" className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {getClassRunningYearOptions().map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* School Years Multi-Select - Half width */}
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">
                  School Years <span className="text-red-500">*</span>
                </Label>
                <Popover
                  modal
                  open={yearComboboxOpen}
                  onOpenChange={setYearComboboxOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={yearComboboxOpen}
                      className="w-full justify-between"
                    >
                      {selectedYearIds.length === 0
                        ? "Select years..."
                        : `${selectedYearIds.length} year${
                            selectedYearIds.length > 1 ? "s" : ""
                          } selected`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 [&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search years..." />
                      <CommandList className="[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-border/80">
                        <CommandEmpty>
                          {loadingYears ? "Loading..." : "No years found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableYears.map((year) => {
                            const isSelected = selectedYearIds.includes(
                              year.id
                            );
                            return (
                              <CommandItem
                                key={year.id}
                                value={`${year.displayName} ${year.code || ""}`}
                                onSelect={() => {
                                  if (isSelected) {
                                    setSelectedYearIds(
                                      selectedYearIds.filter(
                                        (id) => id !== year.id
                                      )
                                    );
                                  } else {
                                    setSelectedYearIds([
                                      ...selectedYearIds,
                                      year.id,
                                    ]);
                                  }
                                }}
                                className={
                                  isSelected
                                    ? "bg-[var(--brand-bullyproof-primary)]/10"
                                    : ""
                                }
                              >
                                <span className="flex-1">
                                  {year.displayName}
                                </span>
                                <Check
                                  className={`ml-2 h-4 w-4 ${
                                    isSelected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator className="mt-6 mb-6" />

            {/* Class Preview Card */}
            {(className ||
              classCode ||
              classRunningYear ||
              selectedYearIds.length > 0) && (
              <Card className="border-2 border-dashed bg-muted/30 py-4">
                <CardContent className="px-4">
                  <div className="space-y-1.5">
                    {/* Header: School name and Year */}
                    <div className="flex items-center justify-between">
                      {school.name && (
                        <div className="text-sm text-muted-foreground">
                          {school.name}
                        </div>
                      )}
                      {classRunningYear && (
                        <div className="text-sm font-medium text-muted-foreground">
                          {classRunningYear}
                        </div>
                      )}
                    </div>

                    {/* Class name with icon */}
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      {className ? (
                        <span className="text-xl font-bold">{className}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground/50 italic">
                          N/A
                        </span>
                      )}
                      {classCode && (
                        <p className="text-xs text-muted-foreground">
                          {classCode}
                        </p>
                      )}
                    </div>
                    {/* Year level badges */}
                    {selectedYearIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedYearIds.map((yearId) => {
                          const year = availableYears.find(
                            (y) => y.id === yearId
                          );
                          if (!year) return null;
                          return (
                            <Badge
                              key={yearId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {year.displayName}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Set flag to prevent effect from interfering
                isClosingDialogRef.current = true;

                // Close dialog immediately
                setAddClassDialogOpen(false);
                setClassName("");
                setClassCode("");
                setClassRunningYear("");
                setSelectedYearIds([]);

                // Remove dialog query parameter from URL
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.delete("dialog");
                const newUrl = params.toString()
                  ? `/admin/schools?${params.toString()}`
                  : "/admin/schools";
                router.replace(newUrl, { scroll: false });

                // Reset flag after a brief delay to allow URL update to complete
                setTimeout(() => {
                  isClosingDialogRef.current = false;
                }, 100);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!school || !className || selectedYearIds.length === 0)
                  return;
                setSubmitting(true);
                try {
                  // Convert selected year to January 1st of that year
                  const startYearDate = classRunningYear
                    ? new Date(
                        `${classRunningYear}-01-01T00:00:00.000Z`
                      ).toISOString()
                    : undefined;

                  // If no code provided, use the class name as the code
                  const finalCode = classCode.trim() || className.trim();

                  const result = await classesApi.post.create({
                    schoolId: school.id,
                    name: className,
                    code: finalCode,
                    yearIds: selectedYearIds,
                    startYear: startYearDate,
                  });
                  if (result.error) {
                    console.error("Failed to create class:", result.error);
                  } else {
                    // Set flag to prevent effect from interfering
                    isClosingDialogRef.current = true;

                    // Close dialog immediately
                    setAddClassDialogOpen(false);
                    setClassName("");
                    setClassCode("");
                    setClassRunningYear("");
                    setSelectedYearIds([]);

                    // Remove dialog query parameter from URL
                    const params = new URLSearchParams(
                      searchParams?.toString() || ""
                    );
                    params.delete("dialog");
                    const newUrl = params.toString()
                      ? `/admin/schools?${params.toString()}`
                      : "/admin/schools";
                    router.replace(newUrl, { scroll: false });

                    // Refresh classes list
                    if (activeSection === "classes") {
                      setLoadingClasses(true);
                      classesApi.get
                        .list({ schoolId: school.id })
                        .then((refreshResult) => {
                          if (!refreshResult.error && refreshResult.data) {
                            setClasses(refreshResult.data);
                          }
                        })
                        .catch((error) => {
                          console.error("Failed to refresh classes:", error);
                        })
                        .finally(() => {
                          setLoadingClasses(false);
                        });
                    }
                    onSchoolUpdate?.();

                    // Reset flag after a brief delay to allow URL update to complete
                    setTimeout(() => {
                      isClosingDialogRef.current = false;
                    }, 100);
                  }
                } catch (error) {
                  console.error("Failed to create class:", error);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={
                submitting || !className || selectedYearIds.length === 0
              }
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      {editingClass && (
        <Dialog
          open={editClassDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditClassDialogOpen(false);
              setEditingClass(null);
              setEditClassName("");
              setEditClassCode("");
              setEditClassStudentCap("");
              setEditClassActive(true);
              setEditClassRunningYear("");
              setEditSelectedYearIds([]);
              setEditSelectedTeacherIds([]);
            } else {
              setEditClassDialogOpen(open);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class information for {school.name || "this school"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {editingClass && (
                <>
                  {/* Class Name and Class Code in same row */}
                  <div className="grid grid-cols-5 gap-4">
                    {/* Class Name - 3/5 width */}
                    <div className="col-span-3 space-y-1.5">
                      <Label
                        htmlFor="edit-class-name"
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Class Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-class-name"
                        placeholder="Enter class name"
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                      />
                    </div>
                    {/* Class Code - 2/5 width */}
                    <div className="col-span-2 space-y-1.5">
                      <Label
                        htmlFor="edit-class-code"
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Class Code
                      </Label>
                      <Input
                        id="edit-class-code"
                        placeholder="Code (optional)"
                        value={editClassCode}
                        onChange={(e) => setEditClassCode(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Student Cap and Active Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-student-cap"
                        className="text-xs text-muted-foreground ml-2"
                      >
                        Student Capacity
                      </Label>
                      <Input
                        id="edit-student-cap"
                        type="number"
                        placeholder="Number of students"
                        value={editClassStudentCap}
                        onChange={(e) => setEditClassStudentCap(e.target.value)}
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground ml-2">
                        Status
                      </Label>
                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          id="edit-class-active"
                          checked={editClassActive}
                          onCheckedChange={(checked) =>
                            setEditClassActive(checked === true)
                          }
                        />
                        <Label
                          htmlFor="edit-class-active"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Active
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Running Year */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="edit-running-year"
                      className="text-xs text-muted-foreground ml-2"
                    >
                      Running Year
                    </Label>
                    <Select
                      value={editClassRunningYear}
                      onValueChange={setEditClassRunningYear}
                    >
                      <SelectTrigger id="edit-running-year" className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {getClassRunningYearOptions().map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* School Years Multi-Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-2">
                      School Years <span className="text-red-500">*</span>
                    </Label>
                    <Popover
                      modal
                      open={editYearComboboxOpen}
                      onOpenChange={setEditYearComboboxOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editYearComboboxOpen}
                          className="w-full justify-between"
                        >
                          {editSelectedYearIds.length === 0
                            ? "Select years..."
                            : `${editSelectedYearIds.length} year${
                                editSelectedYearIds.length > 1 ? "s" : ""
                              } selected`}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 [&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search years..." />
                          <CommandList className="[&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80">
                            <CommandEmpty>
                              {editLoadingYears
                                ? "Loading..."
                                : "No years found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {editAvailableYears.map((year) => {
                                const isSelected = editSelectedYearIds.includes(
                                  year.id
                                );
                                return (
                                  <CommandItem
                                    key={year.id}
                                    value={`${year.displayName} ${year.code || ""}`}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setEditSelectedYearIds(
                                          editSelectedYearIds.filter(
                                            (id) => id !== year.id
                                          )
                                        );
                                      } else {
                                        setEditSelectedYearIds([
                                          ...editSelectedYearIds,
                                          year.id,
                                        ]);
                                      }
                                    }}
                                    className={
                                      isSelected
                                        ? "bg-[var(--brand-bullyproof-primary)]/10"
                                        : ""
                                    }
                                  >
                                    <span className="flex-1">
                                      {year.displayName}
                                    </span>
                                    <Check
                                      className={`ml-2 h-4 w-4 ${
                                        isSelected ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Teachers Multi-Select */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground ml-2">
                      Teachers
                    </Label>
                    <Popover
                      modal
                      open={editTeacherComboboxOpen}
                      onOpenChange={setEditTeacherComboboxOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editTeacherComboboxOpen}
                          className="w-full justify-between"
                        >
                          {editSelectedTeacherIds.length === 0
                            ? "Select teachers..."
                            : `${editSelectedTeacherIds.length} teacher${
                                editSelectedTeacherIds.length > 1 ? "s" : ""
                              } selected`}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 [&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search teachers..." />
                          <CommandList className="[&_[data-slot='command-list']]:[&::-webkit-scrollbar]:w-2 [&_[data-slot='command-list']]:[&::-webkit-scrollbar-track]:bg-transparent [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:rounded-full [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:bg-border [&_[data-slot='command-list']]:[&::-webkit-scrollbar-thumb]:hover:bg-border/80">
                            <CommandEmpty>
                              {loadingUsers
                                ? "Loading..."
                                : "No teachers found."}
                            </CommandEmpty>
                            <CommandGroup>
                              {editAvailableTeachers.map((teacher) => {
                                const isSelected =
                                  editSelectedTeacherIds.includes(teacher.id);
                                const fullName =
                                  `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
                                  teacher.email;
                                return (
                                  <CommandItem
                                    key={teacher.id}
                                    value={`${fullName} ${teacher.email || ""}`}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setEditSelectedTeacherIds(
                                          editSelectedTeacherIds.filter(
                                            (id) => id !== teacher.id
                                          )
                                        );
                                      } else {
                                        setEditSelectedTeacherIds([
                                          ...editSelectedTeacherIds,
                                          teacher.id,
                                        ]);
                                      }
                                    }}
                                    className={
                                      isSelected
                                        ? "bg-[var(--brand-bullyproof-primary)]/10"
                                        : ""
                                    }
                                  >
                                    <span className="flex-1">{fullName}</span>
                                    <Check
                                      className={`ml-2 h-4 w-4 ${
                                        isSelected ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Separator className="mt-6 mb-6" />

                  {/* Class Preview Card */}
                  {(editClassName ||
                    editClassCode ||
                    editSelectedYearIds.length > 0) && (
                    <Card className="border-2 border-dashed bg-muted/30 py-4">
                      <CardContent className="px-4">
                        <div className="space-y-1.5">
                          {/* Header: School name */}
                          {school.name && (
                            <div className="text-sm text-muted-foreground">
                              {school.name}
                            </div>
                          )}

                          {/* Class name with icon */}
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-muted-foreground" />
                            {editClassName ? (
                              <span className="text-xl font-bold">
                                {editClassName}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground/50 italic">
                                N/A
                              </span>
                            )}
                            {editClassCode && (
                              <p className="text-xs text-muted-foreground">
                                {editClassCode}
                              </p>
                            )}
                          </div>
                          {/* Year level badges */}
                          {editSelectedYearIds.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {editSelectedYearIds.map((yearId) => {
                                const year = editAvailableYears.find(
                                  (y) => y.id === yearId
                                );
                                if (!year) return null;
                                return (
                                  <Badge
                                    key={yearId}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {year.displayName}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          {/* Student cap */}
                          {editClassStudentCap && (
                            <div className="text-sm text-muted-foreground">
                              Capacity: {editClassStudentCap} students
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditClassDialogOpen(false);
                  setEditingClass(null);
                  setEditClassName("");
                  setEditClassCode("");
                  setEditClassStudentCap("");
                  setEditClassActive(true);
                  setEditClassRunningYear("");
                  setEditSelectedYearIds([]);
                  setEditSelectedTeacherIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (
                    !editingClass ||
                    !school ||
                    !editClassName.trim() ||
                    editSelectedYearIds.length === 0
                  )
                    return;
                  setSubmitting(true);
                  try {
                    const studentCap = editClassStudentCap.trim()
                      ? parseInt(editClassStudentCap.trim(), 10)
                      : undefined;

                    // Convert running year to datetime string (January 1st of that year)
                    const startYearDate = editClassRunningYear
                      ? new Date(
                          `${editClassRunningYear}-01-01T00:00:00.000Z`
                        ).toISOString()
                      : undefined;

                    const result = await classesApi.put.update(
                      editingClass.id,
                      {
                        name: editClassName.trim(),
                        code: editClassCode.trim() || undefined,
                        studentCap,
                        active: editClassActive,
                        yearIds: editSelectedYearIds,
                        teacherIds: editSelectedTeacherIds,
                        startYear: startYearDate,
                      }
                    );
                    if (result.error) {
                      console.error("Failed to update class:", result.error);
                    } else {
                      // Close dialog
                      setEditClassDialogOpen(false);
                      setEditingClass(null);
                      setEditClassName("");
                      setEditClassCode("");
                      setEditClassStudentCap("");
                      setEditClassActive(true);
                      setEditClassRunningYear("");
                      setEditSelectedYearIds([]);
                      setEditSelectedTeacherIds([]);

                      // Refresh classes list
                      if (activeSection === "classes") {
                        setLoadingClasses(true);
                        classesApi.get
                          .list({ schoolId: school.id })
                          .then((refreshResult) => {
                            if (!refreshResult.error && refreshResult.data) {
                              setClasses(refreshResult.data);
                            }
                          })
                          .catch((error) => {
                            console.error("Failed to refresh classes:", error);
                          })
                          .finally(() => {
                            setLoadingClasses(false);
                          });
                      }
                      onSchoolUpdate?.();
                    }
                  } catch (error) {
                    console.error("Failed to update class:", error);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={
                  submitting ||
                  !editClassName.trim() ||
                  editSelectedYearIds.length === 0
                }
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Classes Dialog */}
      <Dialog
        open={isDeleteClassesDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteClassesDialogOpen(open);
          if (!open) {
            setDeleteClassesError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classes</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the selected classes? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-2">
              {Object.keys(classesRowSelection)
                .filter((key) => classesRowSelection[key])
                .map((rowIndex) => {
                  const classItem = filteredClasses[parseInt(rowIndex)];
                  if (!classItem) return null;
                  return (
                    <div
                      key={classItem.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <div className="font-medium">{classItem.name}</div>
                        {classItem.code && (
                          <div className="text-sm text-muted-foreground">
                            {classItem.code}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteClassesDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteClassesDialogOpen(false);
                setIsConfirmDeleteClassesDialogOpen(true);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Classes Dialog */}
      <Dialog
        open={isConfirmDeleteClassesDialogOpen}
        onOpenChange={(open) => {
          setIsConfirmDeleteClassesDialogOpen(open);
          if (!open) {
            setDeleteClassesError(null);
            setIsDeletingClasses(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action is irreversible. Are you absolutely sure you want to
              delete these classes?
            </DialogDescription>
          </DialogHeader>
          {deleteClassesError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deleteClassesError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmDeleteClassesDialogOpen(false);
                setClassesRowSelection({});
                setDeleteClassesError(null);
                setIsDeletingClasses(false);
              }}
              disabled={isDeletingClasses}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const selectedClassIds = Object.keys(classesRowSelection)
                  .filter((key) => classesRowSelection[key])
                  .map((rowIndex) => {
                    const classItem = filteredClasses[parseInt(rowIndex)];
                    return classItem?.id;
                  })
                  .filter(Boolean) as string[];

                if (selectedClassIds.length === 0) {
                  setIsConfirmDeleteClassesDialogOpen(false);
                  setClassesRowSelection({});
                  return;
                }

                setIsDeletingClasses(true);
                setDeleteClassesError(null);

                try {
                  // Delete classes in batch using Drizzle batch operations
                  const result = await classesApi.delete.deleteBatch({
                    classIds: selectedClassIds,
                  });

                  if (result.error) {
                    setDeleteClassesError(
                      result.error.message || "Failed to delete classes"
                    );
                  } else {
                    // Complete success - close dialogs and refresh
                    setIsConfirmDeleteClassesDialogOpen(false);
                    setClassesRowSelection({});
                    // Refresh classes list
                    if (activeSection === "classes") {
                      setLoadingClasses(true);
                      classesApi.get
                        .list({ schoolId: school.id })
                        .then((refreshResult) => {
                          if (!refreshResult.error && refreshResult.data) {
                            setClasses(refreshResult.data);
                          }
                        })
                        .catch((error) => {
                          console.error("Failed to refresh classes:", error);
                        })
                        .finally(() => {
                          setLoadingClasses(false);
                        });
                    }
                    onSchoolUpdate?.();
                  }
                } catch (error: any) {
                  console.error("[CLASS DELETE] Error:", error);
                  setDeleteClassesError(
                    error.message || "An unexpected error occurred"
                  );
                } finally {
                  setIsDeletingClasses(false);
                }
              }}
              disabled={isDeletingClasses}
            >
              {isDeletingClasses ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Year Level Dialog */}
      <BulkYearLevelDialog
        open={bulkYearLevelDialogOpen}
        onOpenChange={setBulkYearLevelDialogOpen}
        school={school}
        selectedClassIds={Object.keys(classesRowSelection)
          .filter((key) => classesRowSelection[key])
          .map((rowIndex) => {
            const classItem = filteredClasses[parseInt(rowIndex)];
            return classItem?.id;
          })
          .filter((id): id is string => typeof id === "string")}
        onSuccess={() => {
          setBulkYearLevelDialogOpen(false);
          setClassesRowSelection({});
          // Refetch classes to show updated values
          fetchClasses();
        }}
      />
    </>
  );
}
