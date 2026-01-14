"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {} from "@workspace/ui/components/dropdown-menu";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  UserPlus,
  Upload,
  Shield,
  ArrowLeft,
  FileText,
  Check,
  X,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { usersApi } from "@/entities/users/api/endpoints";
import { meApi } from "@/entities/me/api/endpoints";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { useRoles } from "@/entities/users/model/store";
import { apiFetch } from "@/lib/api/fetcher.client";
import type { School as SchoolType } from "./schools-table-columns";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolType | null;
  onSuccess?: () => void;
  skipToManual?: boolean; // Skip directly to manual form
  initialUserType?: "admin" | "teacher"; // Pre-select user type
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Check if a row is a header row
const isHeaderRow = (
  firstName: string,
  lastName: string,
  email: string
): boolean => {
  const firstNameLower = firstName.toLowerCase();
  const lastNameLower = lastName.toLowerCase();
  const emailLower = email.toLowerCase();

  return (
    (firstNameLower.includes("first") && firstNameLower.includes("name")) ||
    (lastNameLower.includes("last") && lastNameLower.includes("name")) ||
    emailLower.includes("email") ||
    emailLower.includes("e-mail")
  );
};

export function AddUserDialog({
  open,
  onOpenChange,
  school,
  onSuccess,
  skipToManual = false,
  initialUserType,
}: AddUserDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { roles } = useRoles();

  // Dialog state - start with method selection, will be updated by useEffect based on URL param
  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [addUserStep, setAddUserStep] = useState<
    "method" | "userType" | "manual" | "csv"
  >(skipToManual ? "manual" : "method");
  const [addUserMethod, setAddUserMethod] = useState<"manual" | "csv" | null>(
    skipToManual ? "manual" : null
  );
  // Remove addUserType - we'll always add as SCHOOL_STAFF
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<
    Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      rowIndex?: number;
      isValid?: boolean;
      isDuplicate?: boolean;
      isIncomplete?: boolean;
      apTeacher?: string;
      position?: string;
    }>
  >([]);

  // Table state for CSV data
  const [csvTableSorting, setCsvTableSorting] = useState<SortingState>([]);
  const [csvTableColumnFilters, setCsvTableColumnFilters] =
    useState<ColumnFiltersState>([]);
  const [csvTableColumnVisibility, setCsvTableColumnVisibility] =
    useState<VisibilityState>({});
  const [csvTableRowSelection, setCsvTableRowSelection] = useState({});
  const [csvTableGlobalFilter, setCsvTableGlobalFilter] = useState("");
  const [editingRow, setEditingRow] = useState<(typeof csvData)[0] | null>(
    null
  );
  const [editRowForm, setEditRowForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    apTeacher: boolean;
    position?: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    apTeacher: false,
    position: "",
  });
  const [csvError, setCsvError] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    completed: 0,
    total: 0,
    errors: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // Form fields (simplified - no admin/teacher separation)
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [apTeacher, setApTeacher] = useState(false);
  const [schoolAdmin, setSchoolAdmin] = useState(false);

  const hasValidEmail = email ? isValidEmail(email) : false;

  // Reset state when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setAddUserSuccess(false);
      // Reset to method selection (default) when closing
      setAddUserStep("method");
      setAddUserMethod(null);
      setEmail("");
      setFirstName("");
      setLastName("");
      setApTeacher(false);
      setSchoolAdmin(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvError(null);
      setBulkProgress({ completed: 0, total: 0, errors: 0 });
      setEditingRow(null);
      setEditRowForm({
        firstName: "",
        lastName: "",
        email: "",
        apTeacher: false,
        position: "",
      });

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
  const parseCSV = (
    file: File
  ): Promise<
    Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      rowIndex: number;
      isValid: boolean;
      isDuplicate: boolean;
      isIncomplete: boolean;
    }>
  > => {
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

          const data: Array<{
            email: string;
            firstName?: string;
            lastName?: string;
            rowIndex: number;
            isValid: boolean;
            isDuplicate: boolean;
            isIncomplete: boolean;
            apTeacher?: string;
            position?: string;
          }> = [];
          const emailCounts = new Map<string, number>();

          let startIndex = 0;
          if (lines.length > 0) {
            const firstRowValues = parseCSVLine(lines[0]).map((v) =>
              v.replace(/^"|"$/g, "").trim()
            );
            const firstRowFirstName = firstRowValues[0] || "";
            const firstRowLastName = firstRowValues[1] || "";
            const firstRowEmail = firstRowValues[2] || "";

            if (
              isHeaderRow(firstRowFirstName, firstRowLastName, firstRowEmail)
            ) {
              startIndex = 1;
            }
          }

          for (let i = startIndex; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]).map((v) =>
              v.replace(/^"|"$/g, "")
            );

            const firstName = values[0]?.trim() || "";
            const lastName = values[1]?.trim() || "";
            const email = values[2]?.trim() || "";
            const apTeacherRaw = values[3]?.trim() || "";
            const position = values[4]?.trim() || "";

            // Normalize apTeacher: "Y" (case-insensitive) becomes "Y", otherwise undefined
            const apTeacher =
              apTeacherRaw.toUpperCase().trim() === "Y" ? "Y" : undefined;

            // Count how many columns are filled
            const filledColumns = [firstName, lastName, email].filter(
              (val) => val.length > 0
            ).length;

            // If 2 out of 3 columns are filled, mark as incomplete (error)
            const isIncomplete = filledColumns === 2;

            // Only skip rows with no data at all
            if (filledColumns === 0) {
              continue;
            }

            // If email is missing, mark as invalid
            const isValid = email ? isValidEmail(email) : false;
            const emailLower = email.toLowerCase();
            if (email) {
              const count = emailCounts.get(emailLower) || 0;
              emailCounts.set(emailLower, count + 1);
            }

            data.push({
              email: email || "",
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              rowIndex: i + 1,
              isValid,
              isDuplicate: false,
              isIncomplete,
              apTeacher,
              position: position || undefined,
            });
          }

          emailCounts.forEach((count, emailLower) => {
            if (count > 1) {
              data.forEach((item) => {
                if (item.email.toLowerCase() === emailLower) {
                  item.isDuplicate = true;
                }
              });
            }
          });

          if (data.length === 0) {
            reject(
              new Error(
                "No valid user data found in CSV file. Expected format: firstName, lastName, email (first 3 columns)"
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
  const parseXLSX = (
    file: File
  ): Promise<
    Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      rowIndex: number;
      isValid: boolean;
      isDuplicate: boolean;
      isIncomplete: boolean;
      apTeacher?: string;
      position?: string;
    }>
  > => {
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

          const dataRows: Array<{
            email: string;
            firstName?: string;
            lastName?: string;
            rowIndex: number;
            isValid: boolean;
            isDuplicate: boolean;
            isIncomplete: boolean;
            apTeacher?: string;
            position?: string;
          }> = [];
          const emailCounts = new Map<string, number>();

          let startIndex = 0;
          if (jsonData.length > 0) {
            const firstRow = jsonData[0];
            if (firstRow && firstRow.length >= 3) {
              const firstRowFirstName = (firstRow[0]?.toString() || "").trim();
              const firstRowLastName = (firstRow[1]?.toString() || "").trim();
              const firstRowEmail = (firstRow[2]?.toString() || "").trim();

              if (
                isHeaderRow(firstRowFirstName, firstRowLastName, firstRowEmail)
              ) {
                startIndex = 1;
              }
            }
          }

          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 3) continue;

            const firstName = (row[0]?.toString() || "").trim();
            const lastName = (row[1]?.toString() || "").trim();
            const email = (row[2]?.toString() || "").trim();
            const apTeacherRaw = (row[3]?.toString() || "").trim();
            const position = (row[4]?.toString() || "").trim();

            // Normalize apTeacher: "Y" (case-insensitive) becomes "Y", otherwise undefined
            const apTeacher =
              apTeacherRaw.toUpperCase().trim() === "Y" ? "Y" : undefined;

            // Count how many columns are filled
            const filledColumns = [firstName, lastName, email].filter(
              (val) => val.length > 0
            ).length;

            // If 2 out of 3 columns are filled, mark as incomplete (error)
            const isIncomplete = filledColumns === 2;

            // Only skip rows with no data at all
            if (filledColumns === 0) {
              continue;
            }

            // If email is missing, mark as invalid
            const isValid = email ? isValidEmail(email) : false;
            const emailLower = email.toLowerCase();
            if (email) {
              const count = emailCounts.get(emailLower) || 0;
              emailCounts.set(emailLower, count + 1);
            }

            dataRows.push({
              email: email || "",
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              rowIndex: i + 1,
              isValid,
              isDuplicate: false,
              isIncomplete,
              apTeacher: apTeacher || undefined,
              position: position || undefined,
            });
          }

          emailCounts.forEach((count, emailLower) => {
            if (count > 1) {
              dataRows.forEach((item) => {
                if (item.email.toLowerCase() === emailLower) {
                  item.isDuplicate = true;
                }
              });
            }
          });

          if (dataRows.length === 0) {
            reject(
              new Error(
                "No valid user data found in Excel file. Expected format: firstName, lastName, email (first 3 columns)"
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
      setAddUserStep("csv");
    } catch (error: any) {
      setCsvError(error.message);
      setCsvFile(null);
      setCsvData([]);
    }
  };

  // Handle bulk user creation - everyone gets SCHOOL_STAFF, TEACHER role added if apTeacher is "Y"
  const handleBulkCreateUsers = async () => {
    if (!school || csvData.length === 0) return;

    const validData = csvData.filter(
      (row) => row.isValid && !row.isDuplicate && !row.isIncomplete
    );

    if (validData.length === 0) {
      setCsvError("No valid rows to submit. Please fix errors and try again.");
      return;
    }

    // Get role IDs
    const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
    const teacherRole = roles.find((r) => r.key === "TEACHER");

    if (!staffRole) {
      setCsvError("SCHOOL_STAFF role not found. Please contact support.");
      return;
    }

    setBulkSubmitting(true);
    setBulkProgress({ completed: 0, total: validData.length, errors: 0 });
    setCsvError(null);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validData.length; i++) {
      const user = validData[i];
      try {
        // Create user with SCHOOL_STAFF role using /users/new endpoint
        const createResult = await apiFetch<{
          userId: string;
          email: string;
          schoolId: string;
        }>("/users/new", {
          method: "POST",
          body: JSON.stringify({
            email: user.email,
            roleScope: "school",
            schoolId: school.id,
            roleName: "SCHOOL_STAFF",
            firstName: user.firstName?.trim() || undefined,
            lastName: user.lastName?.trim() || undefined,
          }),
        });

        if (createResult.error) {
          errorCount++;
          console.error(
            `Failed to create user ${user.email}:`,
            createResult.error
          );
        } else {
          // If apTeacher is "Y", also assign TEACHER role
          const isApTeacher =
            user.apTeacher &&
            user.apTeacher.toString().toUpperCase().trim() === "Y";
          if (isApTeacher && teacherRole && createResult.data) {
            const assignResult = await rolesApi.post.assignRole({
              userId: createResult.data.userId,
              roleId: teacherRole.id,
              schoolId: school.id,
            });

            if (assignResult.error) {
              console.error(
                `Failed to assign TEACHER role to ${user.email}:`,
                assignResult.error
              );
              // Don't count this as a failure since user was created successfully
            }
          }
          successCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to create user ${user.email}:`, error);
      }

      setBulkProgress({
        completed: i + 1,
        total: validData.length,
        errors: errorCount,
      });
    }

    onSuccess?.();

    if (errorCount > 0) {
      setCsvError(
        `${successCount} user${successCount !== 1 ? "s" : ""} added successfully. ${errorCount} failed.`
      );
    } else {
      setAddUserSuccess(true);
      setTimeout(() => {
        handleClose(false);
      }, 2000);
    }

    setBulkSubmitting(false);
  };

  // Handle manual user creation - creates user with SCHOOL_STAFF role and optionally TEACHER and SCHOOL_ADMIN
  const handleManualCreate = async () => {
    if (!school || !hasValidEmail || addUserSuccess) return;

    setSubmitting(true);
    try {
      // Get roles
      const staffRole = roles.find((r) => r.key === "SCHOOL_STAFF");
      const teacherRole = roles.find((r) => r.key === "TEACHER");
      const adminRole = roles.find((r) => r.key === "SCHOOL_ADMIN");

      if (!staffRole) {
        console.error("SCHOOL_STAFF role not found");
        return;
      }

      // Create user with SCHOOL_STAFF role using /users/new endpoint
      const createResult = await apiFetch<{
        userId: string;
        email: string;
        schoolId: string;
      }>("/users/new", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          roleScope: "school",
          schoolId: school.id,
          roleName: "SCHOOL_STAFF",
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });

      if (createResult.error) {
        console.error("Failed to create user:", createResult.error);
      } else if (createResult.data) {
        // Assign additional roles if checked
        const roleAssignments = [];

        if (apTeacher && teacherRole) {
          roleAssignments.push(
            rolesApi.post.assignRole({
              userId: createResult.data.userId,
              roleId: teacherRole.id,
              schoolId: school.id,
            })
          );
        }

        if (schoolAdmin && adminRole) {
          roleAssignments.push(
            rolesApi.post.assignRole({
              userId: createResult.data.userId,
              roleId: adminRole.id,
              schoolId: school.id,
            })
          );
        }

        // Wait for all role assignments to complete
        if (roleAssignments.length > 0) {
          await Promise.all(roleAssignments);
        }

        setAddUserSuccess(true);
        onSuccess?.();
        setTimeout(() => {
          handleClose(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Function to save edited row
  const handleSaveEditedRow = () => {
    if (!editingRow || editingRow.rowIndex === undefined) return;

    // Update all three fields at once
    setCsvData((prev) => {
      // First, update the specific row
      const updated = prev.map((row) => {
        if (row.rowIndex === editingRow.rowIndex) {
          const updatedRow = { ...row };

          updatedRow.firstName = editRowForm.firstName.trim() || undefined;
          updatedRow.lastName = editRowForm.lastName.trim() || undefined;
          updatedRow.email = editRowForm.email.trim();
          updatedRow.apTeacher = editRowForm.apTeacher ? "Y" : undefined;
          updatedRow.position = editRowForm.position?.trim() || undefined;

          // Re-validate the row
          const firstName = updatedRow.firstName || "";
          const lastName = updatedRow.lastName || "";
          const email = updatedRow.email || "";

          // Count filled columns
          const filledColumns = [firstName, lastName, email].filter(
            (val) => val.length > 0
          ).length;

          // Check if incomplete (2 out of 3 filled)
          updatedRow.isIncomplete = filledColumns === 2;

          // Validate email
          updatedRow.isValid = email ? isValidEmail(email) : false;

          return updatedRow;
        }
        return row;
      });

      // Re-check duplicates across all rows (after the update)
      const emailCounts = new Map<string, number>();
      updated.forEach((row) => {
        if (row.email) {
          const emailLower = row.email.toLowerCase();
          emailCounts.set(emailLower, (emailCounts.get(emailLower) || 0) + 1);
        }
      });

      return updated.map((row) => {
        if (row.email) {
          const emailLower = row.email.toLowerCase();
          const count = emailCounts.get(emailLower) || 0;
          return {
            ...row,
            isDuplicate: count > 1,
          };
        }
        return row;
      });
    });

    setEditingRow(null);
    setEditRowForm({
      firstName: "",
      lastName: "",
      email: "",
      apTeacher: false,
      position: "",
    });
  };

  // Function to update a cell value and re-validate the row (kept for backwards compatibility, but not used)
  const updateCellValue = (
    rowIndex: number,
    field: "firstName" | "lastName" | "email",
    value: string
  ) => {
    setCsvData((prev) => {
      // First, update the specific row
      const updated = prev.map((row) => {
        if (row.rowIndex === rowIndex) {
          const updatedRow = { ...row };

          // Update the field
          if (field === "email") {
            updatedRow.email = value.trim();
          } else if (field === "firstName") {
            updatedRow.firstName = value.trim() || undefined;
          } else if (field === "lastName") {
            updatedRow.lastName = value.trim() || undefined;
          }

          // Re-validate the row
          const firstName = updatedRow.firstName || "";
          const lastName = updatedRow.lastName || "";
          const email = updatedRow.email || "";

          // Count filled columns
          const filledColumns = [firstName, lastName, email].filter(
            (val) => val.length > 0
          ).length;

          // Check if incomplete (2 out of 3 filled)
          updatedRow.isIncomplete = filledColumns === 2;

          // Validate email
          updatedRow.isValid = email ? isValidEmail(email) : false;

          return updatedRow;
        }
        return row;
      });

      // Re-check duplicates across all rows (after the update)
      const emailCounts = new Map<string, number>();
      updated.forEach((row) => {
        if (row.email) {
          const emailLower = row.email.toLowerCase();
          emailCounts.set(emailLower, (emailCounts.get(emailLower) || 0) + 1);
        }
      });

      return updated.map((row) => {
        if (row.email) {
          const emailLower = row.email.toLowerCase();
          const count = emailCounts.get(emailLower) || 0;
          return {
            ...row,
            isDuplicate: count > 1,
          };
        }
        return row;
      });
    });
  };

  // CSV Table columns
  const headerButtonClassName = "h-auto p-0 -ml-3 hover:bg-transparent group";
  const headerIconClassName =
    "ml-2 h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors";

  const csvTableColumns = useMemo<ColumnDef<(typeof csvData)[0]>[]>(
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
            disabled={
              !row.original.isValid ||
              row.original.isDuplicate ||
              row.original.isIncomplete
            }
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
        accessorKey: "firstName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className={headerButtonClassName}
            >
              First Name
            </Button>
          );
        },
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span
              className={
                rowData.isIncomplete || (!rowData.isValid && rowData.email)
                  ? "text-red-600 dark:text-red-400"
                  : ""
              }
            >
              {rowData.firstName || "—"}
            </span>
          );
        },
        size: 110,
        minSize: 110,
        maxSize: 110,
      },
      {
        accessorKey: "lastName",
        header: () => {
          return "Last Name";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span
              className={
                rowData.isIncomplete || (!rowData.isValid && rowData.email)
                  ? "text-red-600 dark:text-red-400"
                  : ""
              }
            >
              {rowData.lastName || "—"}
            </span>
          );
        },
        size: 110,
        minSize: 110,
        maxSize: 110,
      },
      {
        accessorKey: "email",
        header: () => {
          return "Email";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          return (
            <span
              className={`font-medium ${
                rowData.isIncomplete || !rowData.isValid
                  ? "text-red-600 dark:text-red-400"
                  : rowData.isDuplicate
                    ? "text-yellow-600 dark:text-yellow-400"
                    : ""
              }`}
            >
              {rowData.email || "—"}
            </span>
          );
        },
        size: 200,
        minSize: 200,
        maxSize: 200,
      },
      {
        accessorKey: "apTeacher",
        header: () => {
          return "AP Teacher";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          const isApTeacher =
            rowData.apTeacher &&
            rowData.apTeacher.toString().toUpperCase().trim() === "Y";
          return isApTeacher ? (
            <Image
              src="/images/ap-teacher-icon.svg"
              alt="AP Teacher"
              width={20}
              height={20}
              className="inline-block"
            />
          ) : null;
        },
        size: 50,
        minSize: 50,
        maxSize: 50,
      },
      {
        accessorKey: "position",
        header: () => {
          return "Position";
        },
        enableSorting: false,
        cell: ({ row }) => {
          const rowData = row.original;
          return rowData.position ? <span>{rowData.position}</span> : null;
        },
        size: 120,
        minSize: 120,
        maxSize: 120,
      },
    ],
    []
  );

  // Helper function to generate unique row identifier
  const getRowIdentifier = (rowData: {
    rowIndex?: number;
    firstName?: string;
    lastName?: string;
  }) => {
    const rowIndex = rowData.rowIndex ?? 0;
    const firstName = (rowData.firstName || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    const lastName = (rowData.lastName || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
    return `${rowIndex}-${firstName}-${lastName}`;
  };

  // CSV Table setup (no pagination - infinite scroll)
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

      // Check if search value matches row identifier pattern (e.g., "3-annette-brown")
      // Pattern: starts with number, followed by dashes and names
      const isRowIdentifierPattern = /^\d+-.+/.test(searchValue);

      if (isRowIdentifierPattern) {
        // When searching by row identifier, ONLY match exact identifier
        const rowIdentifier = getRowIdentifier(rowData);
        return rowIdentifier === searchValue;
      }

      // Fall back to general search across row number, firstName, lastName, and email
      const rowNumber = String(rowData.rowIndex || "").toLowerCase();
      const firstName = (rowData.firstName || "").toLowerCase();
      const lastName = (rowData.lastName || "").toLowerCase();
      const email = (rowData.email || "").toLowerCase();

      return (
        rowNumber.includes(searchValue) ||
        firstName.includes(searchValue) ||
        lastName.includes(searchValue) ||
        email.includes(searchValue)
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

  if (!school) return null;

  // Listen for file selection event from Import Data button
  useEffect(() => {
    if (!open) return;

    const handleFileSelected = async (e: CustomEvent<{ file: File }>) => {
      const dialogParam = searchParams?.get("dialog");
      if (dialogParam === "import-users") {
        const file = e.detail.file;
        const isCsv = file.name.endsWith(".csv");
        const isXlsx =
          file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

        if (!isCsv && !isXlsx) {
          setCsvError("Please select a CSV or Excel (.xlsx) file");
          return;
        }

        setCsvFile(file);
        setCsvError(null);

        try {
          const parsed = isCsv ? await parseCSV(file) : await parseXLSX(file);
          setCsvData(parsed);
          setAddUserStep("csv");
        } catch (error: any) {
          setCsvError(error.message);
          setCsvFile(null);
          setCsvData([]);
        }
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

  // Check dialog param and set step accordingly when dialog opens
  useEffect(() => {
    if (open) {
      const dialogParam = searchParams?.get("dialog");
      if (dialogParam === "add-user") {
        // Skip directly to manual form
        setAddUserStep("manual");
        setAddUserMethod("manual");
      } else if (dialogParam === "import-users") {
        // Skip directly to CSV step (file will be processed by file selection handler)
        setAddUserStep("csv");
        setAddUserMethod("csv");
      }
    }
  }, [open, searchParams]);

  const isCsvStep = addUserStep === "csv";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="!max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={!isCsvStep}
      >
        <DialogHeader
          className={`${isCsvStep ? "p-4 bg-muted" : "px-6 pt-6 pb-4"} flex-shrink-0`}
        >
          {isCsvStep ? (
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
                  Import Teacher Data
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Review and edit the imported data before adding users to the
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
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <DialogTitle className="flex items-center gap-2">
                  {addUserStep === "method"
                    ? "Add User"
                    : addUserStep === "userType"
                      ? `Add ${addUserMethod === "manual" ? "User" : "Users"}`
                      : "Add User"}
                </DialogTitle>
              </div>
            </div>
          )}
          {!isCsvStep && (
            <DialogDescription>
              {addUserStep === "method"
                ? "Choose how you want to add users to this school."
                : addUserStep === "userType"
                  ? `Select the type of user you want to ${addUserMethod === "manual" ? "add" : "upload"}.`
                  : "Add a new user to this school. Users will be added as SCHOOL_STAFF."}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step 1: Method Selection */}
        {addUserStep === "method" && (
          <div className="space-y-4 py-4 px-6 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:bg-muted/50 transition-colors border-2"
                onClick={() => {
                  setAddUserMethod("manual");
                  setAddUserStep("manual");
                }}
              >
                <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
                  <UserPlus className="h-12 w-12 text-primary" />
                  <h3 className="font-semibold text-lg">Add Manually</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Manually enter user details one at a time
                  </p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:bg-muted/50 transition-colors border-2"
                onClick={() => {
                  setAddUserMethod("csv");
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
                <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
                  <Upload className="h-12 w-12 text-primary" />
                  <h3 className="font-semibold text-lg">
                    Upload CSV/Excel File
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Bulk import multiple users from a CSV or Excel file
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: User Type Selection - Removed, no longer needed */}

        {/* Step 3: Manual Entry */}
        {addUserStep === "manual" && (
          <>
            <div className="space-y-4 py-2 px-6 overflow-y-auto flex-1 min-h-0">
              {/* First Name and Last Name in same row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="user-first-name"
                    className="text-xs text-muted-foreground ml-2"
                  >
                    First Name
                  </Label>
                  <Input
                    id="user-first-name"
                    type="text"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="user-last-name"
                    className="text-xs text-muted-foreground ml-2"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="user-last-name"
                    type="text"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              {/* Email on its own row */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="user-email"
                  className="text-xs text-muted-foreground ml-2"
                >
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    email && !hasValidEmail
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {email && !hasValidEmail && (
                  <p className="text-sm text-red-500 ml-2">
                    Please enter a valid email address (e.g., name@domain.com)
                  </p>
                )}
              </div>

              {/* Roles Section */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs text-muted-foreground ml-2">
                  Roles
                </Label>
                
                {/* Staff Role - Always checked and disabled */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-background p-3 cursor-not-allowed opacity-60 shadow-sm">
                      <Checkbox
                        id="user-role-staff"
                        checked={true}
                        disabled={true}
                        className="data-[state=checked]:border-[#038493] data-[state=checked]:bg-[#038493] data-[state=checked]:text-white dark:data-[state=checked]:border-[#038493] dark:data-[state=checked]:bg-[#038493] rounded"
                      />
                      <span className="text-sm font-medium text-foreground">Staff</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>All new users to a school have the staff role by default</p>
                  </TooltipContent>
                </Tooltip>

                {/* AP Teacher Role */}
                <Label
                  htmlFor="user-role-ap-teacher"
                  className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-background p-3 has-[[aria-checked=true]]:border-[#038493] has-[[aria-checked=true]]:bg-[#038493]/10 dark:has-[[aria-checked=true]]:border-[#038493] dark:has-[[aria-checked=true]]:bg-[#038493]/20 cursor-pointer shadow-sm transition-colors"
                >
                  <Checkbox
                    id="user-role-ap-teacher"
                    checked={apTeacher}
                    onCheckedChange={(checked) =>
                      setApTeacher(checked === true)
                    }
                    className="data-[state=checked]:border-[#038493] data-[state=checked]:bg-[#038493] data-[state=checked]:text-white dark:data-[state=checked]:border-[#038493] dark:data-[state=checked]:bg-[#038493] rounded"
                  />
                  <span className="text-sm font-medium">AP Teacher</span>
                </Label>

                {/* School Admin Role */}
                <Label
                  htmlFor="user-role-school-admin"
                  className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-background p-3 has-[[aria-checked=true]]:border-[#038493] has-[[aria-checked=true]]:bg-[#038493]/10 dark:has-[[aria-checked=true]]:border-[#038493] dark:has-[[aria-checked=true]]:bg-[#038493]/20 cursor-pointer shadow-sm transition-colors"
                >
                  <Checkbox
                    id="user-role-school-admin"
                    checked={schoolAdmin}
                    onCheckedChange={(checked) =>
                      setSchoolAdmin(checked === true)
                    }
                    className="data-[state=checked]:border-[#038493] data-[state=checked]:bg-[#038493] data-[state=checked]:text-white dark:data-[state=checked]:border-[#038493] dark:data-[state=checked]:bg-[#038493] rounded"
                  />
                  <span className="text-sm font-medium">School Admin</span>
                </Label>
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
              {!skipToManual && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddUserStep("method");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleManualCreate}
                disabled={submitting || !hasValidEmail || addUserSuccess}
                className={
                  addUserSuccess
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : ""
                }
              >
                {addUserSuccess ? (
                  "Add Successful"
                ) : submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: CSV Upload */}
        {addUserStep === "csv" && (
          <>
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
                      (row) => !row.isValid && row.email && !row.isIncomplete
                    );
                    const duplicateRows = csvData.filter(
                      (row) => row.isDuplicate && !row.isIncomplete
                    );
                    const hasErrors =
                      incompleteRows.length > 0 ||
                      invalidRows.length > 0 ||
                      duplicateRows.length > 0;

                    const formatRowInfo = (row: (typeof csvData)[0]) => {
                      const presentFields: string[] = [];
                      if (row.firstName) presentFields.push(row.firstName);
                      if (row.lastName) presentFields.push(row.lastName);
                      if (row.email) presentFields.push(row.email);

                      const missingFields: string[] = [];
                      if (!row.email) missingFields.push("email");
                      if (!row.firstName) missingFields.push("firstName");
                      if (!row.lastName) missingFields.push("lastName");

                      let info = `Row ${row.rowIndex}: ${presentFields.join(", ")}`;
                      if (missingFields.length > 0) {
                        info += ` (missing ${missingFields.join(", ")})`;
                      }
                      return info;
                    };

                    // Combine all error rows into a single array with their error types
                    const allErrorRows = [
                      ...incompleteRows.map((row) => {
                        const missing: string[] = [];
                        if (!row.email) missing.push("email");
                        if (!row.firstName) missing.push("firstName");
                        if (!row.lastName) missing.push("lastName");
                        return {
                          row,
                          type: "incomplete" as const,
                          icon: XCircle,
                          status: "Missing",
                          missingFields: missing,
                        };
                      }),
                      ...invalidRows.map((row) => ({
                        row,
                        type: "invalid" as const,
                        icon: XCircle,
                        status: "Invalid",
                        missingFields: ["email"],
                      })),
                      ...duplicateRows.map((row) => ({
                        row,
                        type: "duplicate" as const,
                        icon: AlertTriangle,
                        status: "Duplicate",
                        missingFields: ["email"],
                      })),
                    ];

                    // Show 3 cards + "X more" if more than 4 issues, otherwise show all (up to 4)
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
                              const isIncomplete =
                                errorItem.type === "incomplete";
                              const isInvalid = errorItem.type === "invalid";
                              const isDuplicate =
                                errorItem.type === "duplicate";

                              // Generate unique identifier for this row
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

                              // Build name from firstName and lastName
                              const nameParts: string[] = [];
                              if (errorItem.row.firstName)
                                nameParts.push(errorItem.row.firstName);
                              if (errorItem.row.lastName)
                                nameParts.push(errorItem.row.lastName);
                              const fullName = nameParts.join(" ");

                              // Build title with status and missing fields
                              const capitalizeField = (field: string) => {
                                if (field === "firstName") return "First Name";
                                if (field === "lastName") return "Last Name";
                                return (
                                  field.charAt(0).toUpperCase() + field.slice(1)
                                );
                              };
                              const missingText =
                                errorItem.missingFields.length > 0
                                  ? ` ${errorItem.missingFields.map(capitalizeField).join(", ")}`
                                  : "";

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
                                    <span>
                                      {errorItem.status}
                                      {missingText && (
                                        <span className="font-bold">
                                          {missingText}
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-xs font-normal">
                                      {errorItem.row.rowIndex}
                                    </span>
                                  </AlertTitle>
                                  <AlertDescription className={titleClassName}>
                                    <div className="-space-y-0.5">
                                      {fullName && (
                                        <p className="text-xs truncate">
                                          {fullName}
                                        </p>
                                      )}
                                      <p className="text-[10px] opacity-70">
                                        {errorItem.row.email || "---"}
                                      </p>
                                    </div>
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
                                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
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
                        placeholder="Search by row number, name, or email..."
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
                          Delete ({csvTable.getSelectedRowModel().rows.length})
                        </Button>
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
                              prev.map((row) => {
                                if (
                                  row.rowIndex !== undefined &&
                                  selectedIndices.includes(row.rowIndex)
                                ) {
                                  return { ...row, apTeacher: "Y" };
                                }
                                return row;
                              })
                            );
                            csvTable.resetRowSelection();
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Mark as Teacher (
                          {csvTable.getSelectedRowModel().rows.length})
                        </Button>
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
                              prev.map((row) => {
                                if (
                                  row.rowIndex !== undefined &&
                                  selectedIndices.includes(row.rowIndex)
                                ) {
                                  return { ...row, apTeacher: undefined };
                                }
                                return row;
                              })
                            );
                            csvTable.resetRowSelection();
                          }}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Remove as Teacher (
                          {csvTable.getSelectedRowModel().rows.length})
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
                                  const isFirstNameColumn =
                                    header.column.id === "firstName";

                                  let className = "!text-left p-2";
                                  if (isStatusColumn) {
                                    className +=
                                      " !w-[30px] !min-w-[30px] !max-w-[30px]"; // Fixed width for status column
                                  } else if (isSelectColumn) {
                                    className +=
                                      " !w-[40px] !min-w-[40px] !max-w-[40px] pr-1"; // Smaller checkbox column
                                  } else if (isRowColumn) {
                                    className +=
                                      " !w-[67px] !min-w-[67px] !max-w-[67px] pl-2 !text-left"; // Fixed width for row column, left aligned
                                  } else if (isFirstNameColumn) {
                                    className +=
                                      " !w-[110px] !min-w-[110px] !max-w-[110px] pl-5 !text-left"; // Fixed width for first name column
                                  } else if (header.column.id === "lastName") {
                                    className +=
                                      " !w-[110px] !min-w-[110px] !max-w-[110px] pl-4 !text-left"; // Fixed width for last name column
                                  } else if (header.column.id === "email") {
                                    className +=
                                      " !w-[200px] !min-w-[200px] !max-w-[200px] pl-3 !text-left"; // Fixed width for email column
                                  } else if (header.column.id === "apTeacher") {
                                    className +=
                                      " !w-[100px] !min-w-[100px] !max-w-[100px] pl-1 !text-left"; // Fixed width for AP Teacher column
                                  } else if (header.column.id === "position") {
                                    className +=
                                      " !w-[120px] !min-w-[120px] !max-w-[120px] pl-0 !text-left"; // Fixed width for position column
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
                                        firstName: rowData.firstName || "",
                                        lastName: rowData.lastName || "",
                                        email: rowData.email || "",
                                        apTeacher:
                                          rowData.apTeacher
                                            ?.toUpperCase()
                                            .trim() === "Y",
                                        position: rowData.position || "",
                                      });
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
                                    const isFirstNameColumn =
                                      cell.column.id === "firstName";

                                    let className = "p-2 !text-left";
                                    if (isStatusColumn) {
                                      className +=
                                        " !w-[30px] !min-w-[30px] !max-w-[30px]"; // Fixed width for status column
                                    } else if (isSelectColumn) {
                                      className +=
                                        " !w-[40px] !min-w-[40px] !max-w-[40px] pr-1"; // Smaller checkbox column
                                    } else if (isRowColumn) {
                                      className +=
                                        " !w-[67px] !min-w-[67px] !max-w-[67px] pl-2 !text-left"; // Fixed width for row column, left aligned
                                    } else if (isFirstNameColumn) {
                                      className +=
                                        " !w-[110px] !min-w-[110px] !max-w-[110px] pl-3 !text-left"; // Fixed width for first name column
                                    } else if (cell.column.id === "lastName") {
                                      className +=
                                        " !w-[110px] !min-w-[110px] !max-w-[110px] pl-5 !text-left"; // Fixed width for last name column
                                    } else if (cell.column.id === "email") {
                                      className +=
                                        " !w-[200px] !min-w-[200px] !max-w-[200px] pl-5 !text-left"; // Fixed width for email column
                                    } else if (cell.column.id === "apTeacher") {
                                      className +=
                                        " !w-[100px] !min-w-[100px] !max-w-[100px] pl-3 !text-left"; // Fixed width for AP Teacher column
                                    } else if (cell.column.id === "position") {
                                      className +=
                                        " !w-[120px] !min-w-[120px] !max-w-[120px] pl-3 !text-left"; // Fixed width for position column
                                    }

                                    return (
                                      <TableCell
                                        key={cell.id}
                                        className={className}
                                        onClick={(e) => {
                                          // Prevent row click when clicking on checkbox or actions column
                                          if (
                                            cell.column.id === "select" ||
                                            cell.column.id === "actions"
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
                        <span>Processing users...</span>
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
                    {csvTable.getFilteredRowModel().rows.length} row(s)
                    selected.
                  </div>
                </>
              )}

              {!csvFile && (
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium">Upload CSV/Excel File</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select a CSV or Excel (.xlsx) file. Expected format:
                        firstName, lastName, email (first 3 columns)
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".csv,.xlsx,.xls";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
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
                onClick={handleBulkCreateUsers}
                disabled={
                  !csvFile ||
                  csvData.length === 0 ||
                  csvData.some(
                    (row) => !row.isValid || row.isDuplicate || row.isIncomplete
                  ) ||
                  bulkSubmitting ||
                  addUserSuccess
                }
                className={
                  addUserSuccess
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : ""
                }
              >
                {addUserSuccess
                  ? "Upload Successful"
                  : bulkSubmitting
                    ? `Adding... (${bulkProgress.completed}/${bulkProgress.total})`
                    : `Add ${csvData.filter((r) => r.isValid && !r.isDuplicate && !r.isIncomplete).length} User${csvData.filter((r) => r.isValid && !r.isDuplicate && !r.isIncomplete).length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      {/* Edit Row Dialog */}
      <Dialog
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRow(null);
            setEditRowForm({
              firstName: "",
              lastName: "",
              email: "",
              apTeacher: false,
              position: "",
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Row {editingRow?.rowIndex}</DialogTitle>
            <DialogDescription>
              Update the user information for this row
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* First Name and Last Name on same row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-firstName"
                  className={`text-xs pl-2 ${
                    !editRowForm.firstName.trim()
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  First Name
                </Label>
                <Input
                  id="edit-firstName"
                  value={editRowForm.firstName}
                  onChange={(e) =>
                    setEditRowForm({
                      ...editRowForm,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="Enter first name"
                  className={
                    !editRowForm.firstName.trim() ? "border-destructive" : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="edit-lastName"
                  className={`text-xs pl-2 ${
                    !editRowForm.lastName.trim()
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  Last Name
                </Label>
                <Input
                  id="edit-lastName"
                  value={editRowForm.lastName}
                  onChange={(e) =>
                    setEditRowForm({ ...editRowForm, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                  className={
                    !editRowForm.lastName.trim() ? "border-destructive" : ""
                  }
                />
              </div>
            </div>
            {/* Email on its own row */}
            <div className="space-y-2">
              <Label
                htmlFor="edit-email"
                className={`text-xs pl-2 ${
                  !editRowForm.email.trim()
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editRowForm.email}
                onChange={(e) =>
                  setEditRowForm({ ...editRowForm, email: e.target.value })
                }
                placeholder="Enter email address"
                className={
                  !editRowForm.email.trim() ? "border-destructive" : ""
                }
              />
            </div>
            {/* AP Teacher checkbox */}
            <Label
              htmlFor="edit-apTeacher"
              className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-[#038493] has-[[aria-checked=true]]:bg-[#038493]/10 dark:has-[[aria-checked=true]]:border-[#038493] dark:has-[[aria-checked=true]]:bg-[#038493]/20 cursor-pointer"
            >
              <Checkbox
                id="edit-apTeacher"
                checked={editRowForm.apTeacher}
                onCheckedChange={(checked) =>
                  setEditRowForm({
                    ...editRowForm,
                    apTeacher: checked === true,
                  })
                }
                className="data-[state=checked]:border-[#038493] data-[state=checked]:bg-[#038493] data-[state=checked]:text-white dark:data-[state=checked]:border-[#038493] dark:data-[state=checked]:bg-[#038493]"
              />
              <div className="grid gap-1.5 font-normal flex-1">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/ap-teacher-icon.svg"
                    alt="AP Teacher"
                    width={20}
                    height={20}
                    className="inline-block"
                  />
                  <p className="text-sm leading-none font-medium">AP Teacher</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Checking this box will allow this user to teach classes.
                </p>
              </div>
            </Label>
            {/* Separator */}
            <div className="border-t my-4" />
            {/* Position on its own row - Optional */}
            <div className="space-y-2">
              <Label
                htmlFor="edit-position"
                className="text-xs pl-2 text-muted-foreground"
              >
                Position (optional)
              </Label>
              <Input
                id="edit-position"
                value={editRowForm.position || ""}
                onChange={(e) =>
                  setEditRowForm({ ...editRowForm, position: e.target.value })
                }
                placeholder="Enter Position"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingRow(null);
                setEditRowForm({
                  firstName: "",
                  lastName: "",
                  email: "",
                  apTeacher: false,
                  position: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEditedRow}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
