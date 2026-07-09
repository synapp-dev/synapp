"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@workspace/ui/components/alert";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Check,
  Trash2,
} from "lucide-react";
import type { SchoolYearRow } from "@/types/db";
import { cn } from "@workspace/ui/lib/utils";
import { type UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { apiFetch } from "@/lib/api/fetcher.client";
import { schoolApi } from "@/entities/school/api/endpoints";
import type { School as SchoolType } from "./schools-table-columns";

interface ImportClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolType | null;
  onSuccess?: () => void;
}

// Check if a row is a header row
const isHeaderRow = (
  className: string,
  studentCount: string,
  teachers: string
): boolean => {
  const classNameLower = className.toLowerCase();
  const studentCountLower = studentCount.toLowerCase();
  const teachersLower = teachers.toLowerCase();

  return (
    (classNameLower.includes("class") && classNameLower.includes("name")) ||
    (studentCountLower.includes("student") && studentCountLower.includes("count")) ||
    (studentCountLower.includes("number") && studentCountLower.includes("student")) ||
    teachersLower.includes("teacher")
  );
};

type ClassRowData = {
  className: string;
  code?: string;
  studentCount?: number;
  selectedYearIds: string[];
  runningYear?: string;
  rowIndex: number;
  isValid: boolean;
  isDuplicate: boolean;
  isIncomplete: boolean;
};

export function ImportClassesDialog({
  open,
  onOpenChange,
  school,
  onSuccess,
}: ImportClassesDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ClassRowData[]>([]);
  const [allUsers, _setAllUsers] = useState<UserWithRolesAndSchools[]>([]);
  const [_loadingUsers, _setLoadingUsers] = useState(false);

  // Filter teachers from the school (users with TEACHER role)
  const _apTeachersFromSchool = useMemo(() => {
    if (!school?.id || allUsers.length === 0) return [];
    
    const teachers = allUsers.filter((user) => {
      // Check if user has TEACHER role for this school
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === school.id
      );
      
      // User must have TEACHER role for this school
      return schoolRoles.some((role) => role.roleKey === "TEACHER");
    }).map((user) => ({
      userId: user.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
    }));
    
    // Debug logging
    if (teachers.length === 0 && allUsers.length > 0) {
      console.log("[ImportClassesDialog] No teachers found:", {
        schoolId: school.id,
        allUsersCount: allUsers.length,
        sampleUser: allUsers[0],
        sampleUserSchoolRoles: allUsers[0]?.schoolRoles,
      });
    }
    
    return teachers;
  }, [allUsers, school?.id]);

  // Table state for CSV data
  const [csvTableSorting, setCsvTableSorting] = useState<SortingState>([]);
  const [csvTableColumnFilters, setCsvTableColumnFilters] =
    useState<ColumnFiltersState>([]);
  const [csvTableColumnVisibility, setCsvTableColumnVisibility] =
    useState<VisibilityState>({});
  const [csvTableRowSelection, setCsvTableRowSelection] = useState({});
  const [csvTableGlobalFilter, setCsvTableGlobalFilter] = useState("");
  const [editingRow, setEditingRow] = useState<ClassRowData | null>(null);
  const [editRowForm, setEditRowForm] = useState<{
    className: string;
    code: string;
    studentCount: string;
    selectedYearIds: string[];
    runningYear: string;
  }>({
    className: "",
    code: "",
    studentCount: "",
    selectedYearIds: [],
    runningYear: new Date().getFullYear().toString(),
  });
  const [editYearComboboxOpen, setEditYearComboboxOpen] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    completed: 0,
    total: 0,
    errors: 0,
  });
  const [addClassSuccess, setAddClassSuccess] = useState(false);
  const [failedClasses, setFailedClasses] = useState<
    Array<{ className: string; error: string }>
  >([]);
  const [showFailedClassesDialog, setShowFailedClassesDialog] = useState(false);
  const [editRowDialogOpen, setEditRowDialogOpen] = useState(false);
  
  // Year levels state
  const [availableYears, setAvailableYears] = useState<
    Array<SchoolYearRow>
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // Load year levels when dialog opens
  useEffect(() => {
    if (open && school) {
      loadYearLevels();
    }
  }, [open, school]);

  const loadYearLevels = async () => {
    if (!school?.id) return;

    setLoadingYears(true);
    try {
      const result = await schoolApi.get.years(school.id);

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
    } catch (error: any) {
      console.error("Failed to load year levels:", error);
    } finally {
      setLoadingYears(false);
    }
  };

  // Reset state when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setAddClassSuccess(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvError(null);
      setBulkProgress({ completed: 0, total: 0, errors: 0 });
      setEditingRow(null);
      setEditRowForm({
        className: "",
        code: "",
        studentCount: "",
        selectedYearIds: [],
        runningYear: new Date().getFullYear().toString(),
      });
      setEditYearComboboxOpen(false);
      setFailedClasses([]);
      setShowFailedClassesDialog(false);
      setEditRowDialogOpen(false);

      // Remove dialog query parameter from URL
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("dialog");
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    }
    onOpenChange(open);
  };

  // Parse CSV file
  const parseCSV = (file: File): Promise<ClassRowData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter((line) => line.trim());

          if (lines.length === 0) {
            reject(new Error("CSV file is empty"));
            return;
          }

          // Helper function to parse CSV line handling quoted fields
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              const nextChar = line[i + 1];

              if (char === '"') {
                if (inQuotes && nextChar === '"') {
                  current += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const data: ClassRowData[] = [];
          const classNameCounts = new Map<string, number>();

          let startIndex = 0;
          if (lines.length > 0) {
            const firstRowValues = parseCSVLine(lines[0]).map((v) =>
              v.replace(/^"|"$/g, "").trim()
            );
            const firstRowClassName = firstRowValues[0] || "";
            const firstRowStudentCount = firstRowValues[1] || "";

            if (
              isHeaderRow(
                firstRowClassName,
                firstRowStudentCount,
                ""
              )
            ) {
              startIndex = 1;
            }
          }

          for (let i = startIndex; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map((v) =>
              v.replace(/^"|"$/g, "").trim()
            );

            const className = values[0]?.trim() || "";
            const studentCountRaw = values[1]?.trim() || "";

            // Parse student count
            const studentCount = studentCountRaw
              ? parseInt(studentCountRaw, 10)
              : undefined;

            // Count how many columns are filled
            const filledColumns = [className, studentCountRaw].filter(
              (val) => val.length > 0
            ).length;

            // If class name is missing, mark as incomplete
            const isIncomplete = !className || className.length === 0;

            // Only skip rows with no data at all
            if (filledColumns === 0) {
              continue;
            }

            // Validate student count if provided
            const isValid =
              !isIncomplete &&
              (studentCount === undefined || studentCount === 0 || (studentCount > 0 && studentCount <= 1000));

            const classNameLower = className.toLowerCase();
            if (className) {
              const count = classNameCounts.get(classNameLower) || 0;
              classNameCounts.set(classNameLower, count + 1);
            }

            data.push({
              className: className || "",
              code: undefined,
              studentCount,
              selectedYearIds: [],
              runningYear: new Date().getFullYear().toString(),
              rowIndex: i + 1,
              isValid: isValid ?? false,
              isDuplicate: false,
              isIncomplete,
            });
          }

          classNameCounts.forEach((count, classNameLower) => {
            if (count > 1) {
              data.forEach((item) => {
                if (item.className.toLowerCase() === classNameLower) {
                  item.isDuplicate = true;
                }
              });
            }
          });

          // Re-validate rows to check for year levels
          data.forEach((item) => {
            const hasValidClassName = item.className.length > 0;
            const hasValidStudentCount =
              item.studentCount === undefined ||
              item.studentCount === 0 ||
              (item.studentCount > 0 && item.studentCount <= 1000);
            
            item.isValid = hasValidClassName && hasValidStudentCount;
            item.isIncomplete = !hasValidClassName;
          });

          if (data.length === 0) {
            reject(
              new Error(
                "No valid class data found in CSV file. Expected format: class name, student count, teachers (first 3 columns)"
              )
            );
            return;
          }

          resolve(data);
        } catch (error: any) {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  // Parse XLSX file
  const parseXLSX = (file: File): Promise<ClassRowData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          }) as string[][];

          if (jsonData.length === 0) {
            reject(new Error("Excel file is empty"));
            return;
          }

          const dataRows: ClassRowData[] = [];
          const classNameCounts = new Map<string, number>();

          let startIndex = 0;
          if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            if (firstRow && firstRow.length >= 3) {
              const firstRowClassName = (firstRow[0]?.toString() || "").trim();
              const firstRowStudentCount = (firstRow[1]?.toString() || "").trim();

              if (
                isHeaderRow(
                  firstRowClassName,
                  firstRowStudentCount,
                  ""
                )
              ) {
                startIndex = 1;
              }
            }
          }

          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 2) continue;

            const className = (row[0]?.toString() || "").trim();
            const studentCountRaw = (row[1]?.toString() || "").trim();

            // Parse student count
            const studentCount = studentCountRaw
              ? parseInt(studentCountRaw, 10)
              : undefined;

            // Count how many columns are filled
            const filledColumns = [className, studentCountRaw].filter(
              (val) => val.length > 0
            ).length;

            // If class name is missing, mark as incomplete
            const isIncomplete = !className || className.length === 0;

            // Only skip rows with no data at all
            if (filledColumns === 0) {
              continue;
            }

            // Validate student count if provided
            const isValid =
              !isIncomplete &&
              (studentCount === undefined || studentCount === 0 || (studentCount > 0 && studentCount <= 1000));

            const classNameLower = className.toLowerCase();
            if (className) {
              const count = classNameCounts.get(classNameLower) || 0;
              classNameCounts.set(classNameLower, count + 1);
            }

            dataRows.push({
              className: className || "",
              code: undefined,
              studentCount,
              selectedYearIds: [],
              runningYear: new Date().getFullYear().toString(),
              rowIndex: i + 1,
              isValid: isValid ?? false,
              isDuplicate: false,
              isIncomplete,
            });
          }

          classNameCounts.forEach((count, classNameLower) => {
            if (count > 1) {
              dataRows.forEach((item) => {
                if (item.className.toLowerCase() === classNameLower) {
                  item.isDuplicate = true;
                }
              });
            }
          });

          // Re-validate rows to check for year levels
          dataRows.forEach((item) => {
            const hasValidClassName = item.className.length > 0;
            const hasValidStudentCount =
              item.studentCount === undefined ||
              item.studentCount === 0 ||
              (item.studentCount > 0 && item.studentCount <= 1000);
            
            item.isValid = hasValidClassName && hasValidStudentCount;
            item.isIncomplete = !hasValidClassName;
          });

          if (dataRows.length === 0) {
            reject(
              new Error(
                "No valid class data found in Excel file. Expected format: class name, student count, teachers (first 3 columns)"
              )
            );
            return;
          }

          resolve(dataRows);
        } catch (error: any) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsBinaryString(file);
    });
  };

  // Handle CSV/XLSX file selection
  const handleCsvFileSelect = async (file: File) => {
    const isCsv = file.name.endsWith(".csv");
    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCsv && !isXlsx) {
      setCsvError("Please select a CSV or Excel (.xlsx) file");
      return;
    }

    setCsvFile(file);
    setCsvError(null);

    try {
      const parsed = isCsv ? await parseCSV(file) : await parseXLSX(file);
      setCsvData(parsed);
    } catch (error: any) {
      setCsvError(error.message);
      setCsvFile(null);
      setCsvData([]);
    }
  };

  // Handle bulk class creation
  const handleBulkCreateClasses = async () => {
    if (!school || csvData.length === 0) return;

    const validData = csvData.filter(
      (row) => row.isValid && !row.isDuplicate && !row.isIncomplete
    );

    if (validData.length === 0) {
      setCsvError("No valid rows to submit. Please fix errors and try again.");
      return;
    }

    setBulkSubmitting(true);
    setBulkProgress({ completed: 0, total: validData.length, errors: 0 });
    setCsvError(null);

    try {
      // Prepare bulk payload
      const bulkPayload = {
        schoolId: school.id,
        classes: validData.map((classRow) => {
          // Convert running year to datetime string (January 1st of that year)
          const startYearDate = classRow.runningYear
            ? new Date(
                `${classRow.runningYear}-01-01T00:00:00.000Z`
              ).toISOString()
            : undefined;

          return {
            name: classRow.className.trim(),
            code: classRow.code?.trim() || undefined,
            studentCap: classRow.studentCount,
            yearIds: classRow.selectedYearIds,
            startYear: startYearDate,
          };
        }),
      };

      // Call bulk API endpoint
      const result = await apiFetch<{
        mode: string;
        school: { id: string; name: string };
        total: number;
        success: number;
        errors: number;
        results: Array<{
          name: string;
          status: string;
          classId?: string;
          message?: string;
          error?: string;
        }>;
      }>("/classes/bulk", {
        method: "POST",
        body: JSON.stringify(bulkPayload),
      });

      if (result.error) {
        setCsvError(
          result.error.message || "Failed to process bulk class creation"
        );
        setBulkSubmitting(false);
        return;
      }

      if (result.data) {
        // Update progress based on results
        const successCount = result.data.success;
        const errorCount = result.data.errors;

        setBulkProgress({
          completed: validData.length,
          total: validData.length,
          errors: errorCount,
        });

        // Extract failed classes from results
        const failed = result.data.results.filter(
          (r) => r.status === "error" && r.error
        );

        if (errorCount > 0 && failed.length > 0) {
          // Show dialog with failed classes
          setFailedClasses(
            failed.map((f) => ({
              className: f.name,
              error: f.error || "Unknown error",
            }))
          );
          setShowFailedClassesDialog(true);
        }

        // Always invalidate queries and refresh if any classes succeeded
        if (successCount > 0) {
          queryClient.invalidateQueries({ queryKey: ["classes"] });
          if (school) {
            queryClient.invalidateQueries({
              queryKey: ["classes", { schoolId: school.id }],
            });
          }

          // Call onSuccess callback to refresh classes table
          onSuccess?.();

          // Show success message
          if (errorCount === 0) {
            setAddClassSuccess(true);
            setTimeout(() => {
              handleClose(false);
            }, 2000);
          } else {
            // Show success message even when there are errors
            setCsvError(
              `${successCount} class${successCount !== 1 ? "es" : ""} added successfully. ${errorCount} failed.`
            );
          }
        } else {
          // All failed
          setCsvError(
            `Failed to add ${errorCount} class${errorCount !== 1 ? "es" : ""}. See details in the error dialog.`
          );
        }
      }
    } catch (error: any) {
      console.error("[BULK CLASS CREATE] Error:", error);
      setCsvError(
        error.message ||
          "An unexpected error occurred. Check console for details."
      );
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Function to save edited row
  const handleSaveEditedRow = () => {
    if (!editingRow || editingRow.rowIndex === undefined) return;

    setCsvData((prev) => {
      const updated = prev.map((row) => {
        if (row.rowIndex === editingRow.rowIndex) {
          const updatedRow = { ...row };

          updatedRow.className = editRowForm.className.trim();
          updatedRow.code = editRowForm.code.trim() || undefined;
          const studentCount = editRowForm.studentCount.trim()
            ? parseInt(editRowForm.studentCount.trim(), 10)
            : undefined;
          updatedRow.studentCount = studentCount;
          updatedRow.selectedYearIds = [...editRowForm.selectedYearIds];
          updatedRow.runningYear = editRowForm.runningYear;

          // Re-validate the row
          const hasValidClassName = updatedRow.className.length > 0;
          const hasValidStudentCount =
            studentCount === undefined ||
            studentCount === 0 ||
            (studentCount > 0 && studentCount <= 1000);
          
          const isValid = hasValidClassName && hasValidStudentCount;
          const isIncomplete = !hasValidClassName;

          updatedRow.isValid = isValid;
          updatedRow.isIncomplete = isIncomplete;

          return updatedRow;
        }
        return row;
      });

      // Re-check duplicates
      const classNameCounts = new Map<string, number>();
      updated.forEach((row) => {
        if (row.className) {
          const classNameLower = row.className.toLowerCase();
          classNameCounts.set(
            classNameLower,
            (classNameCounts.get(classNameLower) || 0) + 1
          );
        }
      });

      return updated.map((row) => {
        if (row.className) {
          const classNameLower = row.className.toLowerCase();
          const count = classNameCounts.get(classNameLower) || 0;
          return {
            ...row,
            isDuplicate: count > 1,
          };
        }
        return row;
      });
    });

    setEditingRow(null);
    setEditRowDialogOpen(false);
    setEditRowForm({
      className: "",
      code: "",
      studentCount: "",
      selectedYearIds: [],
      runningYear: new Date().getFullYear().toString(),
    });
    setEditYearComboboxOpen(false);
  };

  // CSV Table columns
  const headerButtonClassName = "h-auto p-0 -ml-3 hover:bg-transparent group";

  const csvTableColumns = useMemo<ColumnDef<ClassRowData>[]>(
    () => [
      {
        id: "status",
        header: "",
        cell: ({ row }) => {
          const rowData = row.original;
          if (rowData.isIncomplete || !rowData.isValid) {
            return (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            );
          } else if (rowData.isDuplicate) {
            return (
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            );
          } else {
            return (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            );
          }
        },
        enableSorting: false,
        size: 30,
        minSize: 30,
        maxSize: 30,
      },
      {
        id: "select",
        header: ({ table }) => {
          const isAllSelected = table.getIsAllPageRowsSelected();
          const isSomeSelected = table.getIsSomePageRowsSelected();
          return (
            <Checkbox
              checked={
                isAllSelected
                  ? true
                  : isSomeSelected
                    ? ("indeterminate" as const)
                    : false
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
        minSize: 40,
        maxSize: 40,
      },
      {
        accessorKey: "rowIndex",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className={headerButtonClassName}
            >
              Row
            </Button>
          );
        },
        cell: ({ row }) => {
          return (
            <span className="font-mono text-xs whitespace-nowrap !text-left">
              {row.getValue("rowIndex")}
            </span>
          );
        },
        size: 67,
        minSize: 67,
        maxSize: 67,
      },
      {
        accessorKey: "className",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className={headerButtonClassName}
            >
              Class Name
            </Button>
          );
        },
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span
              className={
                rowData.isIncomplete || !rowData.isValid
                  ? "text-red-600 dark:text-red-400"
                  : ""
              }
            >
              {rowData.className || "—"}
            </span>
          );
        },
        size: 150,
        minSize: 150,
        maxSize: 150,
      },
      {
        accessorKey: "code",
        header: () => {
          return "Code";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span className="text-sm text-muted-foreground">
              {rowData.code || "—"}
            </span>
          );
        },
        size: 100,
        minSize: 100,
        maxSize: 100,
      },
      {
        id: "yearLevels",
        header: () => {
          return "Year Levels";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          
          if (rowData.selectedYearIds.length === 0) {
            return (
              <span className="text-sm text-muted-foreground italic">
                Select levels
              </span>
            );
          }

          // Get year details for selected IDs
          const selectedYears = availableYears.filter((year) =>
            rowData.selectedYearIds.includes(year.id)
          );

          return (
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-1">
                {selectedYears.map((year) => (
                  <Badge key={year.id} variant="secondary" className="text-xs">
                    {year.displayName}
                  </Badge>
                ))}
              </div>
            </div>
          );
        },
        size: 200,
        minSize: 200,
        maxSize: 200,
      },
      {
        id: "runningYear",
        header: () => {
          return "Running Year";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span className="text-sm">
              {rowData.runningYear || new Date().getFullYear().toString()}
            </span>
          );
        },
        size: 120,
        minSize: 120,
        maxSize: 120,
      },
      {
        accessorKey: "studentCount",
        header: () => {
          return "Student Count";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span
              className={
                rowData.studentCount !== undefined &&
                (rowData.studentCount <= 0 || rowData.studentCount > 1000)
                  ? "text-red-600 dark:text-red-400"
                  : ""
              }
            >
              {rowData.studentCount !== undefined
                ? rowData.studentCount.toString()
                : "—"}
            </span>
          );
        },
        size: 120,
        minSize: 120,
        maxSize: 120,
      },
    ],
    [availableYears]
  );

  // Helper function to generate unique row identifier
  const getRowIdentifier = (rowData: ClassRowData) => {
    const rowIndex = rowData.rowIndex ?? 0;
    const className = (rowData.className || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    return `${rowIndex}-${className}`;
  };

  // CSV Table setup
  const csvTable = useReactTable({
    data: csvData,
    columns: csvTableColumns,
    onSortingChange: setCsvTableSorting,
    onColumnFiltersChange: setCsvTableColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setCsvTableColumnVisibility,
    onRowSelectionChange: setCsvTableRowSelection,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const rowData = row.original;

      // Check if search value matches row identifier pattern
      const isRowIdentifierPattern = /^\d+-.+/.test(searchValue);

      if (isRowIdentifierPattern) {
        const rowIdentifier = getRowIdentifier(rowData);
        return rowIdentifier === searchValue;
      }

      // Fall back to general search
      const rowNumber = String(rowData.rowIndex || "").toLowerCase();
      const className = (rowData.className || "").toLowerCase();

      return (
        rowNumber.includes(searchValue) || className.includes(searchValue)
      );
    },
    state: {
      sorting: csvTableSorting,
      columnFilters: csvTableColumnFilters,
      columnVisibility: csvTableColumnVisibility,
      rowSelection: csvTableRowSelection,
      globalFilter: csvTableGlobalFilter,
    },
    onGlobalFilterChange: setCsvTableGlobalFilter,
  });

  // Listen for file selection event from Import Data button
  useEffect(() => {
    if (!open) return;

    const handleFileSelected = async (e: CustomEvent<{ file: File }>) => {
      const dialogParam = searchParams?.get("dialog");
      if (dialogParam === "import-classes") {
        const file = e.detail.file;
        await handleCsvFileSelect(file);
      }
    };

    window.addEventListener(
      "csv-file-selected",
      handleFileSelected as EventListener
    );
    return () => {
      window.removeEventListener(
        "csv-file-selected",
        handleFileSelected as EventListener
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchParams]);

  if (!school) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={`${
            csvFile && csvData.length > 0 ? "!max-w-6xl" : "!max-w-lg"
          } max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden`}
          showCloseButton={true}
        >
          <DialogHeader className="p-4 bg-muted flex-shrink-0">
            <div className="flex items-center gap-4">
              {/* Bullyproof Logo */}
              <Image
                src="/images/bullyproof-logo.svg"
                alt="Bullyproof Logo"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
              {/* Vertical Separator */}
              <div className="h-6 w-px bg-border" />
              {/* Title */}
              <div className="flex flex-col gap-1 flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Classes Data
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Review and edit the imported data before adding classes to the
                  school.
                </p>
              </div>
              {csvFile && csvData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="group w-fit h-auto py-1.5 px-3"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv,.xlsx,.xls";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleCsvFileSelect(file);
                      }
                    };
                    input.click();
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:hidden" />
                      <RefreshCw className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden group-hover:block" />
                      <span className="text-sm font-medium whitespace-nowrap group-hover:hidden">
                        {csvFile.name.replace(/\.[^/.]+$/, "")}
                      </span>
                      <span className="text-sm font-medium whitespace-nowrap hidden group-hover:inline">
                        Replace data
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      {csvFile.name.lastIndexOf(".") > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {csvFile.name.substring(
                            csvFile.name.lastIndexOf(".")
                          )}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {csvData.length} row{csvData.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto flex flex-col space-y-4 py-4 px-6 min-h-0">
            {csvError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
                  {csvError}
                </p>
              </div>
            )}

            {csvFile && csvData.length > 0 && (
              <>
                {/* Validation Summary */}
                {(() => {
                  const incompleteRows = csvData.filter(
                    (row) => row.isIncomplete
                  );
                  const invalidRows = csvData.filter(
                    (row) => !row.isValid && !row.isIncomplete
                  );
                  const duplicateRows = csvData.filter(
                    (row) => row.isDuplicate && !row.isIncomplete
                  );
                  const hasErrors =
                    incompleteRows.length > 0 ||
                    invalidRows.length > 0 ||
                    duplicateRows.length > 0;

                  const allErrorRows = [
                    ...incompleteRows.map((row) => {
                      // Determine what's missing
                      const missingClassName = !row.className || row.className.length === 0;
                      const missingYearLevels = row.selectedYearIds.length === 0;
                      
                      let status = "Missing";
                      if (missingYearLevels && !missingClassName) {
                        status = "Missing year levels";
                      } else if (missingClassName && !missingYearLevels) {
                        status = "Missing class name";
                      } else if (missingClassName && missingYearLevels) {
                        status = "Missing class name and year levels";
                      }
                      
                      return {
                        row,
                        type: "incomplete" as const,
                        icon: XCircle,
                        status,
                      };
                    }),
                    ...invalidRows.map((row) => ({
                      row,
                      type: "invalid" as const,
                      icon: XCircle,
                      status: "Invalid",
                    })),
                    ...duplicateRows.map((row) => ({
                      row,
                      type: "duplicate" as const,
                      icon: AlertTriangle,
                      status: "Duplicate",
                    })),
                  ];

                  const maxVisible = allErrorRows.length > 4 ? 3 : 4;
                  const visibleErrorRows = allErrorRows.slice(0, maxVisible);
                  const remainingCount =
                    allErrorRows.length > 4 ? allErrorRows.length - 3 : 0;

                  return (
                    <div className="w-full mt-4">
                      {hasErrors && (
                        <div className="grid grid-cols-4 gap-4">
                          {visibleErrorRows.map((errorItem) => {
                            const Icon = errorItem.icon;
                            const isIncomplete = errorItem.type === "incomplete";
                            const isInvalid = errorItem.type === "invalid";
                            const isDuplicate = errorItem.type === "duplicate";

                            const rowIdentifier = getRowIdentifier(
                              errorItem.row
                            );
                            const isActive =
                              csvTableGlobalFilter === rowIdentifier;

                            let alertClassName = "";
                            let iconClassName = "";
                            let titleClassName = "";

                            if (isIncomplete) {
                              alertClassName = isActive
                                ? "border-destructive/70 dark:border-destructive/70 bg-destructive/20 dark:bg-destructive/20 animate-pulse"
                                : "border-destructive/50 dark:border-destructive/50 bg-destructive/10 dark:bg-destructive/10";
                              iconClassName =
                                "!text-destructive dark:!text-destructive !h-5 !w-5";
                              titleClassName =
                                "text-destructive dark:text-destructive";
                            } else if (isInvalid) {
                              alertClassName = isActive
                                ? "border-destructive/70 dark:border-destructive/70 bg-destructive/20 dark:bg-destructive/20 animate-pulse"
                                : "border-destructive/50 dark:border-destructive/50 bg-destructive/10 dark:bg-destructive/10";
                              iconClassName =
                                "!text-destructive dark:!text-destructive !h-5 !w-5";
                              titleClassName =
                                "text-destructive dark:text-destructive";
                            } else if (isDuplicate) {
                              alertClassName = isActive
                                ? "border-yellow-300 dark:border-yellow-700 bg-yellow-100 dark:bg-yellow-900 animate-pulse"
                                : "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950";
                              iconClassName =
                                "!text-yellow-600 dark:!text-yellow-400 !h-5 !w-5";
                              titleClassName =
                                "text-yellow-800 dark:text-yellow-200";
                            }

                            return (
                              <Alert
                                key={`${errorItem.type}-${errorItem.row.rowIndex}`}
                                className={`cursor-pointer hover:bg-opacity-80 transition-colors ${alertClassName}`}
                                onClick={() => {
                                  setCsvTableGlobalFilter(rowIdentifier);
                                }}
                              >
                                <Icon className={iconClassName} />
                                <AlertTitle
                                  className={`flex items-center justify-between ${titleClassName}`}
                                >
                                  <span>{errorItem.status}</span>
                                  <span className="text-xs font-normal">
                                    {errorItem.row.rowIndex}
                                  </span>
                                </AlertTitle>
                                <AlertDescription className={titleClassName}>
                                  <p className="text-xs truncate">
                                    {errorItem.row.className || "---"}
                                  </p>
                                </AlertDescription>
                              </Alert>
                            );
                          })}
                          {remainingCount > 0 && (
                            <Alert
                              className="cursor-pointer hover:bg-opacity-80 transition-colors border-muted-foreground/30 dark:border-muted-foreground/30 bg-muted/50 dark:bg-muted/50"
                              onClick={() => {
                                setCsvTableGlobalFilter("");
                              }}
                            >
                              <AlertTriangle className="!text-muted-foreground !h-5 !w-5" />
                              <AlertTitle className="flex items-center justify-between text-muted-foreground">
                                <span className="font-medium">
                                  {remainingCount} more issues
                                </span>
                              </AlertTitle>
                            </Alert>
                          )}
                        </div>
                      )}
                      {!hasErrors && (
                        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                All rows are valid. Ready to submit!
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}

                {/* Separator */}
                <div className="border-t my-4" />

                {/* Table Controls */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative max-w-sm">
                    <Input
                      placeholder="Search by row number or class name..."
                      value={csvTableGlobalFilter}
                      onChange={(event) =>
                        setCsvTableGlobalFilter(event.target.value)
                      }
                      className={`pr-8 ${
                        csvTableGlobalFilter
                          ? "border-orange-500 focus-visible:ring-orange-500"
                          : ""
                      }`}
                    />
                    {csvTableGlobalFilter && (
                      <button
                        type="button"
                        onClick={() => setCsvTableGlobalFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {csvTable.getSelectedRowModel().rows.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {csvTable.getSelectedRowModel().rows.length} selected
                      </span>
                      <div className="h-6 w-px bg-border" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedRows =
                            csvTable.getSelectedRowModel().rows;
                          const selectedIndices = selectedRows.map(
                            (row) => row.original.rowIndex
                          );
                          setCsvData((prev) =>
                            prev.filter(
                              (row) =>
                                row.rowIndex === undefined ||
                                !selectedIndices.includes(row.rowIndex)
                            )
                          );
                          csvTable.resetRowSelection();
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                {/* Data Table */}
                <div className="flex-1 border rounded-md flex flex-col min-h-[300px] overflow-hidden">
                  <div className="flex-shrink-0 border-b overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="w-full table-fixed">
                        <TableHeader>
                          {csvTable.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                                const isStatusColumn =
                                  header.column.id === "status";
                                const isSelectColumn =
                                  header.column.id === "select";
                                const isRowColumn =
                                  header.column.id === "rowIndex";

                                let className = "!text-left p-2";
                                if (isStatusColumn) {
                                  className +=
                                    " !w-[30px] !min-w-[30px] !max-w-[30px]";
                                } else if (isSelectColumn) {
                                  className +=
                                    " !w-[40px] !min-w-[40px] !max-w-[40px] pr-1";
                                } else if (isRowColumn) {
                                  className +=
                                    " !w-[67px] !min-w-[67px] !max-w-[67px] pl-2 !text-left";
                                }

                                return (
                                  <TableHead
                                    key={header.id}
                                    className={className}
                                  >
                                    {header.isPlaceholder
                                      ? null
                                      : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                        )}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableHeader>
                      </Table>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <Table className="w-full table-fixed">
                      <TableBody>
                        {csvTable.getRowModel().rows?.length ? (
                          csvTable.getRowModel().rows.map((row) => {
                            const rowData = row.original;
                            const hasError =
                              !rowData.isValid ||
                              rowData.isDuplicate ||
                              rowData.isIncomplete;
                            const rowIdentifier = getRowIdentifier(rowData);
                            return (
                              <TableRow
                                key={row.id}
                                id={rowIdentifier}
                                data-state={row.getIsSelected() && "selected"}
                                className={`cursor-pointer hover:bg-muted/50 ${
                                  hasError
                                    ? rowData.isDuplicate
                                      ? "bg-yellow-50 dark:bg-yellow-950/30"
                                      : rowData.isIncomplete
                                        ? "bg-orange-50 dark:bg-orange-950/30"
                                        : "bg-red-50 dark:bg-red-950/30"
                                    : ""
                                }`}
                                onClick={() => {
                                  if (rowData.rowIndex !== undefined) {
                                    setEditingRow(rowData);
                                    setEditRowForm({
                                      className: rowData.className || "",
                                      code: rowData.code || "",
                                      studentCount:
                                        rowData.studentCount?.toString() || "",
                                      selectedYearIds: [...rowData.selectedYearIds],
                                      runningYear: rowData.runningYear || new Date().getFullYear().toString(),
                                    });
                                    setEditRowDialogOpen(true);
                                  }
                                }}
                              >
                                {row.getVisibleCells().map((cell) => {
                                  const isStatusColumn =
                                    cell.column.id === "status";
                                  const isSelectColumn =
                                    cell.column.id === "select";
                                  const isRowColumn =
                                    cell.column.id === "rowIndex";

                                  let className = "p-2 !text-left";
                                  if (isStatusColumn) {
                                    className +=
                                      " !w-[30px] !min-w-[30px] !max-w-[30px]";
                                  } else if (isSelectColumn) {
                                    className +=
                                      " !w-[40px] !min-w-[40px] !max-w-[40px] pr-1";
                                  } else if (isRowColumn) {
                                    className +=
                                      " !w-[67px] !min-w-[67px] !max-w-[67px] pl-2 !text-left";
                                  }

                                  return (
                                    <TableCell
                                      key={cell.id}
                                      className={className}
                                      onClick={(e) => {
                                        // Prevent row click when clicking on checkbox or popover
                                        if (
                                          cell.column.id === "select" ||
                                          cell.column.id === "recommendedUsers"
                                        ) {
                                          e.stopPropagation();
                                        }
                                      }}
                                    >
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={csvTableColumns.length}
                              className="h-24 text-center"
                            >
                              No results.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {bulkSubmitting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing classes...</span>
                      <span>
                        {bulkProgress.completed} / {bulkProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(bulkProgress.completed / bulkProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    {bulkProgress.errors > 0 && (
                      <p className="text-sm text-red-500">
                        {bulkProgress.errors} error
                        {bulkProgress.errors !== 1 ? "s" : ""} occurred
                      </p>
                    )}
                  </div>
                )}

                {/* Row Selection Info */}
                <div className="text-muted-foreground text-sm py-2">
                  {csvTable.getFilteredSelectedRowModel().rows.length} of{" "}
                  {csvTable.getFilteredRowModel().rows.length} row(s) selected.
                </div>
              </>
            )}

            {!csvFile && (
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center flex flex-col items-center gap-2">
                    <p className="font-medium">Upload File</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a CSV or Excel (.xlsx) file.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The file should contain the following columns: class name,
                      student count, teachers.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".csv,.xlsx,.xls";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleCsvFileSelect(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={bulkSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreateClasses}
              disabled={
                !csvFile ||
                csvData.length === 0 ||
                csvData.some(
                  (row) => !row.isValid || row.isDuplicate || row.isIncomplete
                ) ||
                bulkSubmitting ||
                addClassSuccess
              }
              className={
                addClassSuccess
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : ""
              }
            >
              {addClassSuccess
                ? "Upload Successful"
                : bulkSubmitting
                  ? `Adding... (${bulkProgress.completed}/${bulkProgress.total})`
                  : `Add ${csvData.filter((r) => r.isValid && !r.isDuplicate && !r.isIncomplete).length} Class${csvData.filter((r) => r.isValid && !r.isDuplicate && !r.isIncomplete).length !== 1 ? "es" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      <Dialog
        open={editRowDialogOpen && !!editingRow}
        onOpenChange={(open) => {
          if (!open) {
            setEditRowDialogOpen(false);
      setEditingRow(null);
      setEditRowForm({
        className: "",
        code: "",
        studentCount: "",
        selectedYearIds: [],
        runningYear: new Date().getFullYear().toString(),
      });
      setEditYearComboboxOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Row {editingRow?.rowIndex}</DialogTitle>
            <DialogDescription>
              Update the class information for this row. Running Year: {editingRow?.runningYear || new Date().getFullYear().toString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="edit-className"
                className={`text-xs pl-2 ${
                  !editRowForm.className.trim()
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                Class Name *
              </Label>
              <Input
                id="edit-className"
                value={editRowForm.className}
                onChange={(e) =>
                  setEditRowForm({
                    ...editRowForm,
                    className: e.target.value,
                  })
                }
                placeholder="Enter class name"
                className={
                  !editRowForm.className.trim() ? "border-destructive" : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-code"
                className="text-xs pl-2 text-muted-foreground"
              >
                Class Code (optional)
              </Label>
              <Input
                id="edit-code"
                value={editRowForm.code}
                onChange={(e) =>
                  setEditRowForm({ ...editRowForm, code: e.target.value })
                }
                placeholder="Enter class code"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-studentCount"
                className="text-xs pl-2 text-muted-foreground"
              >
                Student Count (optional)
              </Label>
              <Input
                id="edit-studentCount"
                type="number"
                value={editRowForm.studentCount}
                onChange={(e) =>
                  setEditRowForm({
                    ...editRowForm,
                    studentCount: e.target.value,
                  })
                }
                placeholder="Enter student count"
                min="1"
                max="1000"
              />
            </div>
            {/* Year Levels */}
            <div className="space-y-2">
              <Label className="text-xs pl-2 text-muted-foreground">
                Year Levels <span className="text-red-500">*</span>
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
                    {editRowForm.selectedYearIds.length === 0
                      ? "Select years..."
                      : `${editRowForm.selectedYearIds.length} year${
                          editRowForm.selectedYearIds.length > 1 ? "s" : ""
                        } selected`}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search years..." />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>
                        {loadingYears ? "Loading..." : "No years found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {availableYears.map((year) => {
                          const isSelected = editRowForm.selectedYearIds.includes(
                            year.id
                          );
                          return (
                            <CommandItem
                              key={year.id}
                              value={`${year.displayName} ${year.code || ""}`}
                              onSelect={() => {
                                setEditRowForm({
                                  ...editRowForm,
                                  selectedYearIds: isSelected
                                    ? editRowForm.selectedYearIds.filter(
                                        (id) => id !== year.id
                                      )
                                    : [...editRowForm.selectedYearIds, year.id],
                                });
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {year.displayName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {/* Running Year */}
            <div className="space-y-2">
              <Label
                htmlFor="edit-running-year"
                className="text-xs pl-2 text-muted-foreground"
              >
                Running Year
              </Label>
              <Select
                value={editRowForm.runningYear}
                onValueChange={(value) =>
                  setEditRowForm({ ...editRowForm, runningYear: value })
                }
              >
                <SelectTrigger id="edit-running-year" className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
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
                  })().map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditRowDialogOpen(false);
                setEditingRow(null);
                setEditRowForm({
                  className: "",
                  code: "",
                  studentCount: "",
                  selectedYearIds: [],
                  runningYear: new Date().getFullYear().toString(),
                });
                setEditYearComboboxOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditedRow}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failed Classes Dialog */}
      <Dialog
        open={showFailedClassesDialog}
        onOpenChange={(open) => {
          setShowFailedClassesDialog(open);
          if (!open) {
            setFailedClasses([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {failedClasses.length} Class{failedClasses.length !== 1 ? "es" : ""}{" "}
              Failed to Add
            </DialogTitle>
            <DialogDescription>
              The following classes could not be added. Other classes were added
              successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-2">
              {failedClasses.map((failedClass, index) => (
                <Alert
                  key={index}
                  variant="destructive"
                  className="border-destructive/50 bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-medium">
                    {failedClass.className}
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    {failedClass.error}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowFailedClassesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
