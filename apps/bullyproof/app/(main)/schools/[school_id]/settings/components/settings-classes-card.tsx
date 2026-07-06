"use client";

import type { SchoolYearRow } from "@/types/db";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { classesApi } from "@/entities/classes/api/endpoints";
import { ClassesTable } from "@/entities/classes/ui/classes-table";
import type { ClassWithYearCodes } from "@/entities/classes/model/store";
import { schoolApi } from "@/entities/school/api/endpoints";
import { ImportClassesDialog } from "@/entities/dashboard/ui/admin/sections/schools/components/import-classes-dialog";
import { BulkYearLevelDialog } from "@/entities/dashboard/ui/admin/sections/schools/components/bulk-year-level-dialog";
import type { School as AdminSchool } from "@/entities/dashboard/ui/admin/sections/schools/components/schools-table-columns";
import { StorageImage } from "@/components/atoms/storage-image";
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
import { Switch } from "@workspace/ui/components/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Check,
  ChevronDown,
  CircleX,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  School,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsClassesCardProps {
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  /** School logo; storage path or URL. Optional — falls back to icon badge. */
  schoolAvatarUrl?: string | null;
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

type EditClassFormBaseline = {
  name: string;
  active: boolean;
  runningYear: string;
  /** sorted for stable comparison */
  yearIds: string[];
  studentCap: number | null;
};

/** Digits only, clamped 0–1000; empty input → null */
function normalizedStudentCapFromString(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(1000, Math.max(0, n));
}

function yearIdsMatchBaseline(selected: string[], baselineYearIdsSorted: string[]): boolean {
  const sorted = [...selected].sort();
  if (sorted.length !== baselineYearIdsSorted.length) return false;
  return sorted.every((id, i) => id === baselineYearIdsSorted[i]);
}

/**
 * Sort key for a year code: P/Prep (and common early labels) before 1, then 1 … 12, then others last.
 */
function yearCodeSortRank(code: string): number {
  const trimmed = code.trim();
  if (!trimmed) return 10_000;

  const upper = trimmed.toUpperCase();
  if (
    upper === "P" ||
    upper === "PREP" ||
    upper === "PF" ||
    upper === "K" ||
    upper === "FD" ||
    upper === "FOUNDATION" ||
    upper === "FY" ||
    upper === "F" ||
    upper.startsWith("PREP")
  ) {
    return 0;
  }

  const withoutY = trimmed.replace(/^Y/i, "");
  if (/^\d{1,2}$/.test(withoutY)) {
    const n = Number.parseInt(withoutY, 10);
    if (n >= 1 && n <= 12) return n;
    return 50 + n;
  }

  return 8000 + (upper.codePointAt(0) ?? 0);
}

function classMinYearSortRank(classItem: ClassWithYearCodes): number {
  const codes = (classItem.yearCodes || []).filter(Boolean);
  if (codes.length === 0) return 10_000;
  return Math.min(...codes.map(yearCodeSortRank));
}

function compareClassesByYearCodesThenName(
  a: ClassWithYearCodes,
  b: ClassWithYearCodes
): number {
  const ra = classMinYearSortRank(a);
  const rb = classMinYearSortRank(b);
  if (ra !== rb) return ra - rb;
  return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
    sensitivity: "base",
  });
}

const CLASSES_LIST_Q_KEY = "q";
const CLASSES_LIST_YEAR_KEY = "year";
/** Edit-class dialog deep link (UUID). */
const EDIT_CLASS_ID_PARAM = "classId";

function sortYearCodesStable(codes: string[]): string[] {
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))].sort(
    (a, b) => yearCodeSortRank(a) - yearCodeSortRank(b) || a.localeCompare(b)
  );
}

function parseYearLevelsFromSearchParams(
  sp: Pick<URLSearchParams, "get" | "getAll">
): string[] {
  const repeated = sp.getAll(CLASSES_LIST_YEAR_KEY);
  if (repeated.length > 0) {
    return sortYearCodesStable(repeated);
  }
  const legacy = sp.get("years");
  if (legacy?.trim()) {
    return sortYearCodesStable(legacy.split(","));
  }
  return [];
}

function readClassesListFiltersFromSearchParams(
  queryString: string | null | undefined
): { q: string; years: string[] } {
  if (!queryString) return { q: "", years: [] };
  const sp = new URLSearchParams(queryString);
  const q = sp.get(CLASSES_LIST_Q_KEY) ?? "";
  return { q, years: parseYearLevelsFromSearchParams(sp) };
}

/** Signature of list filters only (ignores e.g. `dialog`). */
function classesListFiltersSignature(sp: URLSearchParams): string {
  const q = (sp.get(CLASSES_LIST_Q_KEY) ?? "").trim();
  const years = sortYearCodesStable(sp.getAll(CLASSES_LIST_YEAR_KEY));
  return `${q}@@${years.join("\0")}`;
}

function buildClassesListSearchParams(
  base: URLSearchParams,
  q: string,
  years: string[]
): URLSearchParams {
  const params = new URLSearchParams(base.toString());
  params.delete(CLASSES_LIST_Q_KEY);
  params.delete(CLASSES_LIST_YEAR_KEY);
  params.delete("years");
  const trimmed = q.trim();
  if (trimmed) params.set(CLASSES_LIST_Q_KEY, trimmed);
  for (const code of sortYearCodesStable(years)) {
    params.append(CLASSES_LIST_YEAR_KEY, code);
  }
  return params;
}

const MAX_VISIBLE_SCHOOL_YEAR_BADGES = 4;

function SelectedSchoolYearsTrigger({
  yearIds,
  availableYears,
  emptyLabel,
}: {
  yearIds: string[];
  availableYears: SchoolYearRow[];
  emptyLabel: string;
}) {
  if (yearIds.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }
  const allLabels = yearIds
    .map((id) => availableYears.find((y) => y.id === id)?.displayName ?? id)
    .join(", ");
  const visibleIds = yearIds.slice(0, MAX_VISIBLE_SCHOOL_YEAR_BADGES);
  const overflow = yearIds.length - visibleIds.length;
  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1 overflow-hidden text-left"
      title={allLabels}
    >
      {visibleIds.map((id) => {
        const year = availableYears.find((y) => y.id === id);
        const label = year?.displayName ?? id;
        return (
          <Badge
            key={id}
            variant="secondary"
            className="max-w-[10rem] shrink-0 truncate text-xs font-normal"
          >
            {label}
          </Badge>
        );
      })}
      {overflow > 0 ? (
        <span className="shrink-0 text-xs text-muted-foreground">+{overflow}</span>
      ) : null}
    </div>
  );
}

export function SettingsClassesCard({
  schoolId,
  schoolSlug,
  schoolName,
  schoolAvatarUrl,
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
  const [yearLevelFilters, setYearLevelFilters] = useState<string[]>([]);
  const [yearLevelFilterOpen, setYearLevelFilterOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const lastPushedClassesFiltersSigRef = useRef<string | null>(null);
  const appliedClassesFiltersFromUrlSigRef = useRef<string | null>(null);

  const [availableYears, setAvailableYears] = useState<
    Array<SchoolYearRow>
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
  const [editClassRunningYear, setEditClassRunningYear] = useState("");
  const [editClassActive, setEditClassActive] = useState(true);
  const [editSelectedYearIds, setEditSelectedYearIds] = useState<string[]>([]);
  const [editYearComboboxOpen, setEditYearComboboxOpen] = useState(false);
  const [editStudentCap, setEditStudentCap] = useState("");
  const [submittingEditClass, setSubmittingEditClass] = useState(false);
  const [editFormBaseline, setEditFormBaseline] = useState<EditClassFormBaseline | null>(null);

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
          .map((item: { year: SchoolYearRow }) => item.year)
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
    const raw = searchParams?.toString() ?? "";
    const sp = new URLSearchParams(raw);
    const sig = classesListFiltersSignature(sp);
    if (
      appliedClassesFiltersFromUrlSigRef.current !== null &&
      sig === appliedClassesFiltersFromUrlSigRef.current
    ) {
      return;
    }
    if (lastPushedClassesFiltersSigRef.current !== null) {
      if (sig === lastPushedClassesFiltersSigRef.current) {
        lastPushedClassesFiltersSigRef.current = null;
        appliedClassesFiltersFromUrlSigRef.current = sig;
        return;
      }
      lastPushedClassesFiltersSigRef.current = null;
    }
    const { q, years } = readClassesListFiltersFromSearchParams(raw);
    setSearchQuery(q);
    setDebouncedSearchQuery(q);
    setYearLevelFilters(years);
    appliedClassesFiltersFromUrlSigRef.current = sig;
  }, [searchParams]);

  useEffect(() => {
    const base = new URLSearchParams(searchParams?.toString() || "");
    const nextParams = buildClassesListSearchParams(
      base,
      debouncedSearchQuery,
      yearLevelFilters
    );
    const nextFull = nextParams.toString();
    const currentFull = searchParams?.toString() ?? "";
    if (nextFull === currentFull) return;
    lastPushedClassesFiltersSigRef.current = classesListFiltersSignature(nextParams);
    const href = nextFull ? `${pathname}?${nextFull}` : pathname;
    router.replace(href, { scroll: false });
  }, [
    debouncedSearchQuery,
    pathname,
    router,
    searchParams,
    yearLevelFilters,
  ]);

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
    const nameFromClasses = new Map<string, string>();
    classes.forEach((classItem) => {
      const codes = classItem.yearCodes || [];
      const names = classItem.yearNames || [];
      codes.forEach((code, index) => {
        if (!code) return;
        counts.set(code, (counts.get(code) || 0) + 1);
        if (!nameFromClasses.has(code)) {
          const label = names[index];
          if (typeof label === "string" && label.trim()) {
            nameFromClasses.set(code, label.trim());
          }
        }
      });
    });
    const displayNameForCode = (code: string) => {
      const fromSchool = availableYears.find((y) => y.code === code)?.displayName;
      if (fromSchool) return fromSchool;
      return nameFromClasses.get(code) ?? code;
    };
    return Array.from(counts.entries())
      .map(([yearCode, count]) => ({
        yearCode,
        count,
        displayName: displayNameForCode(yearCode),
      }))
      .sort((a, b) => {
        const ra = yearCodeSortRank(a.yearCode);
        const rb = yearCodeSortRank(b.yearCode);
        if (ra !== rb) return ra - rb;
        return a.yearCode.localeCompare(b.yearCode);
      });
  }, [classes, availableYears]);

  const filteredClasses = useMemo(() => {
    let filtered = classes;
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((classItem) => {
        const haystack = [
          classItem.name || "",
          classItem.studentCap != null ? String(classItem.studentCap) : "",
          (classItem.yearNames || []).filter(Boolean).join(" "),
          (classItem.yearCodes || []).filter(Boolean).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    if (yearLevelFilters.length > 0) {
      filtered = filtered.filter((classItem) =>
        (classItem.yearCodes || []).some((code) =>
          yearLevelFilters.includes(code)
        )
      );
    }
    return [...filtered].sort(compareClassesByYearCodesThenName);
  }, [classes, debouncedSearchQuery, yearLevelFilters]);

  const selectedClassIds = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((rowIndex) => filteredClasses[parseInt(rowIndex)]?.id)
        .filter((id): id is string => typeof id === "string"),
    [rowSelection, filteredClasses]
  );

  const stripEditClassFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (!params.has(EDIT_CLASS_ID_PARAM)) return;
    params.delete(EDIT_CLASS_ID_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const closeEditClassDialog = useCallback(() => {
    setEditClassDialogOpen(false);
    setEditingClass(null);
    setEditSelectedYearIds([]);
    setEditFormBaseline(null);
    setEditYearComboboxOpen(false);
    stripEditClassFromUrl();
  }, [stripEditClassFromUrl]);

  const openDialogWithUrl = (dialog: "add-class" | "import-classes") => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete(EDIT_CLASS_ID_PARAM);
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
    params.delete(EDIT_CLASS_ID_PARAM);
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

  const populateEditDialogFromClassItem = useCallback(
    async (classItem: ClassWithYearCodes) => {
      setEditingClass(classItem);
      setEditClassDialogOpen(true);
      setEditFormBaseline(null);
      setEditClassName(classItem.name || "");
      setEditClassActive(Boolean(classItem.active));
      const runningYear =
        classItem.startYear
          ? new Date(classItem.startYear).getFullYear().toString()
          : new Date().getFullYear().toString();
      setEditClassRunningYear(runningYear);
      setEditSelectedYearIds([]);

      const listCapRaw =
        classItem.studentCap != null ? Number(classItem.studentCap) : NaN;
      const listCapNorm =
        !Number.isNaN(listCapRaw)
          ? Math.min(1000, Math.max(0, Math.round(listCapRaw)))
          : null;
      setEditStudentCap(listCapNorm != null ? String(listCapNorm) : "");

      const result = await classesApi.get.byId(classItem.id);
      let yearIds: string[] = [];
      let studentCapBaseline: number | null = listCapNorm;
      if (!result.error && result.data) {
        const years = (result.data.years || []) as Array<{ yearId?: string; id?: string }>;
        yearIds = normalizeYearIds(years);
        setEditSelectedYearIds(yearIds);
        const cap = (result.data as { studentCap?: number | null }).studentCap;
        studentCapBaseline =
          cap != null && cap !== undefined && !Number.isNaN(Number(cap))
            ? Math.min(1000, Math.max(0, Math.round(Number(cap))))
            : null;
        setEditStudentCap(studentCapBaseline != null ? String(studentCapBaseline) : "");
      } else {
        setEditSelectedYearIds([]);
      }

      setEditFormBaseline({
        name: (classItem.name || "").trim(),
        active: Boolean(classItem.active),
        runningYear,
        yearIds: [...yearIds].sort(),
        studentCap: studentCapBaseline,
      });
    },
    []
  );

  const openEditDialog = (classItem: ClassWithYearCodes) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("dialog");
    params.set(EDIT_CLASS_ID_PARAM, classItem.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const id = searchParams?.get(EDIT_CLASS_ID_PARAM)?.trim() ?? "";
    if (!id) {
      if (editClassDialogOpen) {
        closeEditClassDialog();
      }
      return;
    }
    if (editingClass?.id === id && editClassDialogOpen) return;
    const match = classes.find((c) => c.id === id);
    if (match) {
      void populateEditDialogFromClassItem(match);
      return;
    }
    if (!isLoadingClasses) {
      stripEditClassFromUrl();
    }
  }, [
    searchParams,
    classes,
    isLoadingClasses,
    editClassDialogOpen,
    editingClass?.id,
    populateEditDialogFromClassItem,
    stripEditClassFromUrl,
    closeEditClassDialog,
  ]);

  const handleSaveEditClass = async () => {
    if (!editingClass || !editClassName.trim() || !editFormBaseline) return;
    const capNow = normalizedStudentCapFromString(editStudentCap);
    if (
      editClassName.trim() === editFormBaseline.name &&
      editClassActive === editFormBaseline.active &&
      editClassRunningYear === editFormBaseline.runningYear &&
      yearIdsMatchBaseline(editSelectedYearIds, editFormBaseline.yearIds) &&
      capNow === editFormBaseline.studentCap
    ) {
      return;
    }
    setSubmittingEditClass(true);
    try {
      const startYearDate = editClassRunningYear
        ? new Date(`${editClassRunningYear}-01-01T00:00:00.000Z`).toISOString()
        : undefined;
      const studentCapPayload = capNow === null ? undefined : capNow;
      const result = await classesApi.put.update(editingClass.id, {
        name: editClassName.trim(),
        active: editClassActive,
        yearIds: editSelectedYearIds,
        startYear: startYearDate,
        ...(studentCapPayload !== undefined ? { studentCap: studentCapPayload } : {}),
      });
      if (result.error) {
        toast.error(result.error.message || "Failed to update class");
        return;
      }
      toast.success("Class updated");
      closeEditClassDialog();
      await fetchClasses();
    } finally {
      setSubmittingEditClass(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setYearLevelFilters([]);
    setYearLevelFilterOpen(false);
  };

  const yearLevelFilterLabel = useMemo(() => {
    if (yearLevelFilters.length === 0) {
      return "Year Level";
    }
    if (yearLevelFilters.length === 1) {
      const code = yearLevelFilters[0];
      const opt = yearLevelOptions.find((o) => o.yearCode === code);
      return opt?.displayName ?? code;
    }
    return `${yearLevelFilters.length} year levels`;
  }, [yearLevelFilters, yearLevelOptions]);

  const toggleYearLevelFilter = (yearCode: string) => {
    setYearLevelFilters((prev) => {
      const set = new Set(prev);
      if (set.has(yearCode)) set.delete(yearCode);
      else set.add(yearCode);
      return sortYearCodesStable(Array.from(set));
    });
  };

  const hasEditClassChanges = useMemo(() => {
    if (!editFormBaseline || !editClassName.trim()) return false;
    const capNow = normalizedStudentCapFromString(editStudentCap);
    return (
      editClassName.trim() !== editFormBaseline.name ||
      editClassActive !== editFormBaseline.active ||
      editClassRunningYear !== editFormBaseline.runningYear ||
      !yearIdsMatchBaseline(editSelectedYearIds, editFormBaseline.yearIds) ||
      capNow !== editFormBaseline.studentCap
    );
  }, [
    editFormBaseline,
    editClassName,
    editClassActive,
    editClassRunningYear,
    editSelectedYearIds,
    editStudentCap,
  ]);

  const editSaveDisabled =
    submittingEditClass ||
    !editClassName.trim() ||
    !editFormBaseline ||
    !hasEditClassChanges;

  const editSaveDisabledTooltip = useMemo(() => {
    if (submittingEditClass) return null;
    if (!editClassName.trim()) return "Enter a class name before saving.";
    if (!editFormBaseline) return null;
    if (!hasEditClassChanges) return "Change something to enable Save.";
    return null;
  }, [
    submittingEditClass,
    editClassName,
    editFormBaseline,
    hasEditClassChanges,
  ]);

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
                <FileSpreadsheet className="h-4 w-4" />
                Import Data
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by class name, size, or year levels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "h-10 pl-10 pr-10 md:text-sm",
                debouncedSearchQuery.trim() && "border-orange-500 bg-orange-500/10"
              )}
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
          <Popover modal open={yearLevelFilterOpen} onOpenChange={setYearLevelFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={yearLevelFilterOpen}
                disabled={isLoadingClasses && classes.length === 0}
                className={cn(
                  "h-10 w-[200px] shrink-0 justify-between gap-2 px-3 font-normal",
                  yearLevelFilters.length > 0 &&
                    "border-orange-500 bg-orange-500/10"
                )}
              >
                <span className="truncate">{yearLevelFilterLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search year levels..." />
                <CommandList>
                  <CommandEmpty>No year level found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-year-levels"
                      onSelect={() => {
                        setYearLevelFilters([]);
                        setYearLevelFilterOpen(false);
                      }}
                    >
                      <span className="flex-1">All year levels</span>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 shrink-0",
                          yearLevelFilters.length === 0 ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                    {yearLevelOptions.map(({ yearCode, count, displayName }) => (
                      <CommandItem
                        key={yearCode}
                        value={`${displayName} ${yearCode} ${count}`}
                        onSelect={() => {
                          toggleYearLevelFilter(yearCode);
                        }}
                        className="flex items-center gap-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-left font-normal">
                          {displayName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {count} {count === 1 ? "class" : "classes"}
                        </span>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            yearLevelFilters.includes(yearCode)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {(searchQuery.trim() || yearLevelFilters.length > 0) && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="h-10 shrink-0 text-orange-500 border-orange-500/20 hover:bg-orange-500/10"
            >
              <CircleX className="h-4 w-4" />
              Clear filters
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

      <div className="flex min-h-0 flex-1 flex-col">
        <ClassesTable
          classes={filteredClasses}
          isLoading={isLoadingClasses}
          error={classesError}
          showSelection
          fillHeight
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
          <div className="space-y-6">
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
                  <SelectTrigger className="w-full">
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
                  Class Year Levels <span className="text-red-500">*</span>
                </Label>
                <Popover modal open={yearComboboxOpen} onOpenChange={setYearComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="h-auto min-h-10 w-full justify-between gap-2 py-2 text-left font-normal"
                      aria-label={
                        selectedYearIds.length === 0
                          ? undefined
                          : selectedYearIds
                              .map(
                                (id) =>
                                  availableYears.find((y) => y.id === id)?.displayName ?? id
                              )
                              .join(", ")
                      }
                    >
                      <SelectedSchoolYearsTrigger
                        yearIds={selectedYearIds}
                        availableYears={availableYears}
                        emptyLabel="Select years..."
                      />
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
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
          if (open) {
            setEditClassDialogOpen(true);
            return;
          }
          closeEditClassDialog();
        }}
      >
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader className="gap-0 pb-4">
            <DialogTitle className="flex items-center gap-2 text-left font-normal leading-snug text-muted-foreground">
              <GraduationCap className="size-5 shrink-0 opacity-80" aria-hidden />
              <span>
                Edit{" "}
                <span className="font-bold">
                  {editClassName.trim() || editingClass?.name || "Class"}
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="edit-class-school-display" className="text-xs text-muted-foreground ml-2">
                School
              </Label>
              <div className="relative">
                <span
                  className={cn(
                    "pointer-events-none absolute top-1/2 left-2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md ",

                  )}
                  style={schoolAvatarUrl ? undefined : { backgroundColor: "#008993" }}
                  aria-hidden
                >
                  {schoolAvatarUrl ? (
                    <div className="w-7 shrink-0">
                      <StorageImage
                        src={schoolAvatarUrl}
                        alt={schoolName}
                        width={100}
                        height={100}
                        className="h-7 w-auto object-contain"
                        
                      />
                    </div>
                  ) : (
                    <School className="size-4 text-background" />
                  )}
                </span>
                <Input
                  id="edit-class-school-display"
                  value={schoolName}
                  readOnly
                  disabled
                  className="h-10 pl-10 font-medium"
                  aria-readonly
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Running Year</Label>
                <Select value={editClassRunningYear} onValueChange={setEditClassRunningYear}>
                  <SelectTrigger className="w-full">
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
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Class Name</Label>
                <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="edit-class-student-cap" className="text-xs text-muted-foreground ml-2">
                  Class Size
                </Label>
                <Input
                  id="edit-class-student-cap"
                  value={editStudentCap}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setEditStudentCap(digits);
                  }}
                  onBlur={() => {
                    const n = normalizedStudentCapFromString(editStudentCap);
                    setEditStudentCap(n != null ? String(n) : "");
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="—"
                  title="Optional. Whole numbers from 0 to 1000."
                  className="h-10 min-h-10 w-full py-2 tabular-nums"
                  aria-describedby="edit-class-student-cap-hint"
                />
                <p id="edit-class-student-cap-hint" className="sr-only">
                  Optional. Whole numbers from 0 to 1000.
                </p>
              </div>
              <div className="col-span-3 min-w-0 space-y-1.5">
                <Label className="text-xs text-muted-foreground ml-2">Class Year Levels</Label>
                <Popover modal open={editYearComboboxOpen} onOpenChange={setEditYearComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="h-auto min-h-10 w-full justify-between gap-2 py-2 text-left font-normal"
                      aria-label={
                        editSelectedYearIds.length === 0
                          ? undefined
                          : editSelectedYearIds
                              .map(
                                (id) =>
                                  availableYears.find((y) => y.id === id)?.displayName ?? id
                              )
                              .join(", ")
                      }
                    >
                      <SelectedSchoolYearsTrigger
                        yearIds={editSelectedYearIds}
                        availableYears={availableYears}
                        emptyLabel="Select years..."
                      />
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
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

            <div className="flex w-fit items-center">
              <div className="flex w-fit items-center gap-2 bg-transparent px-3 py-2">
                <Label htmlFor="edit-class-active" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                  Active
                </Label>
                <Switch
                  id="edit-class-active"
                  checked={editClassActive}
                  onCheckedChange={setEditClassActive}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded-sm p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="What active means"
                  >
                    <HelpCircle className="size-3.5" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="">
                  When a class is active, it can be used in lessons and selected by teachers.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeEditClassDialog}>
              Cancel
            </Button>
            {editSaveDisabledTooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant={
                        hasEditClassChanges && editClassName.trim() && !submittingEditClass
                          ? "default"
                          : "outline"
                      }
                      onClick={handleSaveEditClass}
                      disabled={editSaveDisabled}
                      className={cn(
                        "gap-1.5",
                        hasEditClassChanges &&
                          editClassName.trim() &&
                          !submittingEditClass &&
                          "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)] hover:text-white"
                      )}
                    >
                      {submittingEditClass ? (
                        <>
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 shrink-0" />
                          Save
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {editSaveDisabledTooltip}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant={
                  hasEditClassChanges && editClassName.trim() && !submittingEditClass
                    ? "default"
                    : "outline"
                }
                onClick={handleSaveEditClass}
                disabled={editSaveDisabled}
                className={cn(
                  "gap-1.5",
                  hasEditClassChanges &&
                    editClassName.trim() &&
                    !submittingEditClass &&
                    "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)] hover:text-white"
                )}
              >
                {submittingEditClass ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 shrink-0" />
                    Save
                  </>
                )}
              </Button>
            )}
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
