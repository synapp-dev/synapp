"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { classesApi } from "@/entities/classes/api/endpoints";
import { ClassesTable } from "@/entities/classes/ui/classes-table";
import type { ClassWithYearCodes } from "@/entities/classes/model/store";
import { schoolApi } from "@/entities/school/api/endpoints";
import type { schoolYears } from "@/server/db/schema";
import { ImportClassesDialog } from "@/entities/dashboard/ui/admin/sections/schools/components/import-classes-dialog";
import { BulkYearLevelDialog } from "@/entities/dashboard/ui/admin/sections/schools/components/bulk-year-level-dialog";
import type { School as AdminSchool } from "@/entities/dashboard/ui/admin/sections/schools/components/schools-table-columns";
import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Check,
  ChevronDown,
  CircleX,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsClassesCardProps {
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  schoolState: string | null;
  schoolSector: "government" | "catholic" | "independent" | null;
  schoolLevels?: string[] | null;
}

const getClassRunningYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years: Array<{ value: string; label: string }> = [];
  for (let year = currentYear - 2; year <= currentYear + 8; year++) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
};

function normalizeYearIds(
  years: Array<{ yearId?: string; id?: string }> | undefined
): string[] {
  if (!Array.isArray(years)) return [];
  return years
    .map((y) => y.yearId ?? y.id)
    .filter((id): id is string => typeof id === "string");
}

export function SettingsClassesCard({
  schoolId,
  schoolSlug,
  schoolName,
  schoolState,
  schoolSector,
  schoolLevels,
}: SettingsClassesCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [classes, setClasses] = useState<ClassWithYearCodes[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState<string>("all");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const [availableYears, setAvailableYears] = useState<
    Array<typeof schoolYears.$inferSelect>
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);

  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [classRunningYear, setClassRunningYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);
  const [yearComboboxOpen, setYearComboboxOpen] = useState(false);
  const [submittingAddClass, setSubmittingAddClass] = useState(false);

  const [editingClass, setEditingClass] = useState<ClassWithYearCodes | null>(null);
  const [editClassDialogOpen, setEditClassDialogOpen] = useState(false);
  const [editClassName, setEditClassName] = useState("");
  const [editClassCode, setEditClassCode] = useState("");
  const [editClassRunningYear, setEditClassRunningYear] = useState("");
  const [editClassActive, setEditClassActive] = useState(true);
  const [editSelectedYearIds, setEditSelectedYearIds] = useState<string[]>([]);
  const [editYearComboboxOpen, setEditYearComboboxOpen] = useState(false);
  const [submittingEditClass, setSubmittingEditClass] = useState(false);

  const [importClassesDialogOpen, setImportClassesDialogOpen] = useState(false);
  const [bulkYearLevelDialogOpen, setBulkYearLevelDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [deletingClasses, setDeletingClasses] = useState(false);
  const [deleteClassesError, setDeleteClassesError] = useState<string | null>(null);

  const adminSchoolForDialogs: AdminSchool = {
    id: schoolId,
    name: schoolName,
    state: schoolState,
    sector: schoolSector,
    levels: schoolLevels ?? null,
    teacherCount: 0,
    classCount: classes.length,
    schoolAdminCount: 0,
    schoolLicenceCount: 0,
    activeLicence: false,
    status: "active",
    slug: schoolSlug,
  };

  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    setClassesError(null);
    try {
      const result = await classesApi.get.list({ schoolId });
      if (result.error) {
        setClassesError(result.error.message || "Failed to fetch classes");
        setClasses([]);
      } else {
        setClasses(result.data || []);
      }
    } catch (error: any) {
      setClassesError(error?.message || "Failed to fetch classes");
      setClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const fetchYears = async () => {
    setLoadingYears(true);
    try {
      const result = await schoolApi.get.years(schoolId);
      if (!result.error && result.data) {
        const years = result.data
          .map((item: { year: typeof schoolYears.$inferSelect }) => item.year)
          .filter(Boolean);
        const sorted = [...years].sort((a, b) => {
          if (a.sortIndex != null && b.sortIndex != null) {
            return a.sortIndex - b.sortIndex;
          }
          return (a.code || "").localeCompare(b.code || "");
        });
        setAvailableYears(sorted);
      }
    } catch {
      // No-op: years are optional for viewing.
    } finally {
      setLoadingYears(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchYears();
  }, [schoolId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const dialogParam = searchParams?.get("dialog");
    if (dialogParam === "add-class") {
      setAddClassDialogOpen(true);
    } else if (dialogParam === "import-classes") {
      setImportClassesDialogOpen(true);
    }
  }, [searchParams]);

  const yearLevelOptions = useMemo(() => {
    const counts = new Map<string, number>();
    classes.forEach((classItem) => {
      (classItem.yearCodes || []).forEach((code) => {
        counts.set(code, (counts.get(code) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([yearCode, count]) => ({ yearCode, count }))
      .sort((a, b) => a.yearCode.localeCompare(b.yearCode));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    let filtered = classes;
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((classItem) =>
        [classItem.name || "", classItem.code || ""]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    if (yearLevelFilter && yearLevelFilter !== "all") {
      filtered = filtered.filter((classItem) =>
        (classItem.yearCodes || []).includes(yearLevelFilter)
      );
    }
    return filtered;
  }, [classes, debouncedSearchQuery, yearLevelFilter]);

  const selectedClassIds = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((rowIndex) => filteredClasses[parseInt(rowIndex)]?.id)
        .filter((id): id is string => typeof id === "string"),
    [rowSelection, filteredClasses]
  );

  const openDialogWithUrl = (dialog: "add-class" | "import-classes") => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("dialog", dialog);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    if (dialog === "add-class") {
      setAddClassDialogOpen(true);
    } else {
      setImportClassesDialogOpen(true);
    }
  };

  const closeDialogUrlParam = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("dialog");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const resetAddDialog = () => {
    setClassName("");
    setClassCode("");
    setClassRunningYear(new Date().getFullYear().toString());
    setSelectedYearIds([]);
    setYearComboboxOpen(false);
  };

  const handleCreateClass = async () => {
    if (!className.trim() || selectedYearIds.length === 0) return;
    setSubmittingAddClass(true);
    try {
      const startYearDate = classRunningYear
        ? new Date(`${classRunningYear}-01-01T00:00:00.000Z`).toISOString()
        : undefined;
      const result = await classesApi.post.create({
        schoolId,
        name: className.trim(),
        code: classCode.trim() || className.trim(),
        yearIds: selectedYearIds,
        startYear: startYearDate,
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to create class");
        return;
      }
      toast.success("Class created");
      setAddClassDialogOpen(false);
      resetAddDialog();
      closeDialogUrlParam();
      await fetchClasses();
    } finally {
      setSubmittingAddClass(false);
    }
  };

  const openEditDialog = async (classItem: ClassWithYearCodes) => {
    setEditingClass(classItem);
    setEditClassDialogOpen(true);
    setEditClassName(classItem.name || "");
    setEditClassCode(classItem.code || "");
    setEditClassActive(Boolean(classItem.active));
    setEditClassRunningYear(
      classItem.startYear
        ? new Date(classItem.startYear).getFullYear().toString()
        : new Date().getFullYear().toString()
    );
    setEditSelectedYearIds([]);

    const result = await classesApi.get.byId(classItem.id);
    if (!result.error && result.data) {
      const years = (result.data.years || []) as Array<{ yearId?: string; id?: string }>;
      setEditSelectedYearIds(normalizeYearIds(years));
    }
  };

  const handleSaveEditClass = async () => {
    if (!editingClass || !editClassName.trim()) return;
    setSubmittingEditClass(true);
    try {
      const startYearDate = editClassRunningYear
        ? new Date(`${editClassRunningYear}-01-01T00:00:00.000Z`).toISOString()
        : undefined;
      const result = await classesApi.put.update(editingClass.id, {
        name: editClassName.trim(),
        code: editClassCode.trim() || undefined,
        active: editClassActive,
        yearIds: editSelectedYearIds,
        startYear: startYearDate,
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to update class");
        return;
      }
      toast.success("Class updated");
      setEditClassDialogOpen(false);
      setEditingClass(null);
      setEditSelectedYearIds([]);
      await fetchClasses();
    } finally {
      setSubmittingEditClass(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setYearLevelFilter("all");
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2">
          {selectedClassIds.length > 0 ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setBulkYearLevelDialogOpen(true)}>
                <GraduationCap className="h-4 w-4 mr-2" />
                Bulk Edit Year Levels
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => openDialogWithUrl("add-class")}
                disabled={isLoadingClasses && classes.length === 0}
                className="bg-transparent hover:bg-[var(--brand-bullyproof-primary)] text-[var(--brand-bullyproof-primary)] hover:text-white h-10"
              >
                <Plus className="h-4 w-4" />
                Add Class
              </Button>
              <Button
                variant="outline"
                onClick={() => openDialogWithUrl("import-classes")}
                disabled={isLoadingClasses && classes.length === 0}
                className="h-10"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by class name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("pl-10 pr-10", debouncedSearchQuery.trim() && "border-orange-500 bg-orange-500/10")}
              disabled={isLoadingClasses && classes.length === 0}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {searchQuery !== debouncedSearchQuery || isLoadingClasses ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : searchQuery ? (
                <button type="button" onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                  <CircleX className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <Select value={yearLevelFilter || "all"} onValueChange={setYearLevelFilter}>
            <SelectTrigger
              className={cn(
                "w-[180px]",
                yearLevelFilter && yearLevelFilter !== "all" && "border-orange-500 bg-orange-500/10"
              )}
            >
              <SelectValue placeholder="Year Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Year Levels</SelectItem>
              {yearLevelOptions.map(({ yearCode, count }) => (
                <SelectItem key={yearCode} value={yearCode}>
                  {yearCode} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery.trim() || (yearLevelFilter && yearLevelFilter !== "all")) && (
            <Button variant="outline" onClick={clearFilters} className="text-orange-500 border-orange-500/20 hover:bg-orange-500/10">
              <CircleX className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {classesError && (
        <Alert variant="destructive" className="flex-shrink-0">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{classesError}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 min-h-0">
        <ClassesTable
          classes={filteredClasses}
          isLoading={isLoadingClasses}
          error={classesError}
          showSelection
          onRowSelectionChange={setRowSelection}
          onClassClick={openEditDialog}
        />
      </div>

      <Dialog
        open={addClassDialogOpen}
        onOpenChange={(open) => {
          setAddClassDialogOpen(open);
          if (!open) {
            resetAddDialog();
            closeDialogUrlParam();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>Create a new class for {schoolName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">
                  Class Name <span className="text-red-500">*</span>
                </Label>
                <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Enter class name" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Class Code</Label>
                <Input value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="Code (optional)" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Running Year</Label>
                <Select value={classRunningYear} onValueChange={setClassRunningYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {getClassRunningYearOptions().map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">
                  School Years <span className="text-red-500">*</span>
                </Label>
                <Popover modal open={yearComboboxOpen} onOpenChange={setYearComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedYearIds.length === 0
                        ? "Select years..."
                        : `${selectedYearIds.length} year${selectedYearIds.length > 1 ? "s" : ""} selected`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search years..." />
                      <CommandList>
                        <CommandEmpty>{loadingYears ? "Loading..." : "No years found."}</CommandEmpty>
                        <CommandGroup>
                          {availableYears.map((year) => {
                            const isSelected = selectedYearIds.includes(year.id);
                            return (
                              <CommandItem
                                key={year.id}
                                value={`${year.displayName} ${year.code || ""}`}
                                onSelect={() => {
                                  setSelectedYearIds((prev) =>
                                    isSelected ? prev.filter((id) => id !== year.id) : [...prev, year.id]
                                  );
                                }}
                              >
                                <span className="flex-1">{year.displayName}</span>
                                <Check className={cn("ml-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
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

            {(className || classCode || selectedYearIds.length > 0) && (
              <div className="border rounded-md p-3 bg-muted/20">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{schoolName}</span>
                  <span>{classRunningYear}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{className || "New class"}</span>
                  {classCode ? <span className="text-xs text-muted-foreground">{classCode}</span> : null}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedYearIds.map((yearId) => {
                    const year = availableYears.find((y) => y.id === yearId);
                    return year ? (
                      <Badge key={yearId} variant="secondary" className="text-xs">
                        {year.displayName}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddClassDialogOpen(false);
                resetAddDialog();
                closeDialogUrlParam();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateClass} disabled={submittingAddClass || !className.trim() || selectedYearIds.length === 0}>
              {submittingAddClass ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editClassDialogOpen}
        onOpenChange={(open) => {
          setEditClassDialogOpen(open);
          if (!open) {
            setEditingClass(null);
            setEditSelectedYearIds([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update class details for {editingClass?.name || "selected class"}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Class Name</Label>
                <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Class Code</Label>
                <Input value={editClassCode} onChange={(e) => setEditClassCode(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Running Year</Label>
                <Select value={editClassRunningYear} onValueChange={setEditClassRunningYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {getClassRunningYearOptions().map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Status</Label>
                <Select
                  value={editClassActive ? "active" : "inactive"}
                  onValueChange={(value) => setEditClassActive(value === "active")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground ml-2">School Years</Label>
              <Popover modal open={editYearComboboxOpen} onOpenChange={setEditYearComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {editSelectedYearIds.length === 0
                      ? "Select years..."
                      : `${editSelectedYearIds.length} year${editSelectedYearIds.length > 1 ? "s" : ""} selected`}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search years..." />
                    <CommandList>
                      <CommandEmpty>{loadingYears ? "Loading..." : "No years found."}</CommandEmpty>
                      <CommandGroup>
                        {availableYears.map((year) => {
                          const isSelected = editSelectedYearIds.includes(year.id);
                          return (
                            <CommandItem
                              key={year.id}
                              value={`${year.displayName} ${year.code || ""}`}
                              onSelect={() => {
                                setEditSelectedYearIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== year.id) : [...prev, year.id]
                                );
                              }}
                            >
                              <span className="flex-1">{year.displayName}</span>
                              <Check className={cn("ml-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClassDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditClass} disabled={submittingEditClass || !editClassName.trim()}>
              {submittingEditClass ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteClassesError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classes</DialogTitle>
            <DialogDescription>Delete {selectedClassIds.length} selected classes?</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-2 py-2">
              {selectedClassIds.map((id) => {
                const classItem = filteredClasses.find((c) => c.id === id);
                if (!classItem) return null;
                return (
                  <div key={id} className="p-2 border rounded-md">
                    <div className="font-medium">{classItem.name}</div>
                    {classItem.code ? <div className="text-sm text-muted-foreground">{classItem.code}</div> : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmDeleteDialogOpen(true);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteDialogOpen}
        onOpenChange={(open) => {
          setConfirmDeleteDialogOpen(open);
          if (!open) {
            setDeleteClassesError(null);
            setDeletingClasses(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>This action is irreversible.</DialogDescription>
          </DialogHeader>
          {deleteClassesError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{deleteClassesError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={deletingClasses} onClick={() => setConfirmDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingClasses}
              onClick={async () => {
                if (selectedClassIds.length === 0) {
                  setConfirmDeleteDialogOpen(false);
                  return;
                }
                setDeletingClasses(true);
                setDeleteClassesError(null);
                try {
                  const result = await classesApi.delete.deleteBatch({
                    classIds: selectedClassIds,
                  });
                  if (result.error) {
                    setDeleteClassesError(result.error.message || "Failed to delete classes");
                    return;
                  }
                  toast.success("Classes deleted");
                  setConfirmDeleteDialogOpen(false);
                  setRowSelection({});
                  await fetchClasses();
                } finally {
                  setDeletingClasses(false);
                }
              }}
            >
              {deletingClasses ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportClassesDialog
        open={importClassesDialogOpen}
        onOpenChange={(open) => {
          setImportClassesDialogOpen(open);
          if (!open) closeDialogUrlParam();
        }}
        school={adminSchoolForDialogs}
        onSuccess={async () => {
          setImportClassesDialogOpen(false);
          closeDialogUrlParam();
          await fetchClasses();
        }}
      />

      <BulkYearLevelDialog
        open={bulkYearLevelDialogOpen}
        onOpenChange={setBulkYearLevelDialogOpen}
        school={adminSchoolForDialogs}
        selectedClassIds={selectedClassIds}
        onSuccess={async () => {
          setBulkYearLevelDialogOpen(false);
          setRowSelection({});
          await fetchClasses();
        }}
      />
    </div>
  );
}
