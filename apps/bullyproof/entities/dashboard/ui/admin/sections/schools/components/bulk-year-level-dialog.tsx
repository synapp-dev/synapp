"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { School as SchoolType } from "./schools-table-columns";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { schoolApi } from "@/entities/school/api/endpoints";
import { classesApi } from "@/entities/classes/api/endpoints";

interface BulkYearLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolType | null;
  selectedClassIds: string[];
  onSuccess?: () => void;
}

type BulkYearLevelResult = {
  classId: string;
  className: string;
  success: boolean;
  message: string;
};

type BulkYearLevelResponse = {
  success: boolean;
  results: BulkYearLevelResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
};

export function BulkYearLevelDialog({
  open,
  onOpenChange,
  school,
  selectedClassIds,
  onSuccess,
}: BulkYearLevelDialogProps) {
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);
  const [action, setAction] = useState<"assign" | "replace">("assign");
  const [runningYear, setRunningYear] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkYearLevelResponse | null>(null);
  const [availableYears, setAvailableYears] = useState<any[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);

  // Load year levels when dialog opens
  useEffect(() => {
    if (open && school) {
      loadYearLevels();
    }
  }, [open, school]);

  // Reset all form state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedYearIds([]);
      setAction("assign");
      setRunningYear("");
      setError(null);
      setResult(null);
      setSubmitting(false);
    }
  }, [open]);

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

  // Can submit if we have classes selected and at least one update (year levels OR running year)
  const canSubmit =
    selectedClassIds.length > 0 &&
    (selectedYearIds.length > 0 || runningYear.length > 0) &&
    school &&
    !submitting;

  // Reset state when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedYearIds([]);
      setAction("assign");
      setRunningYear("");
      setError(null);
      setResult(null);
      setSubmitting(false);
    }
    onOpenChange(open);
  };

  // Toggle year level selection
  const toggleYearLevel = (yearId: string) => {
    setSelectedYearIds((prev) =>
      prev.includes(yearId)
        ? prev.filter((id) => id !== yearId)
        : [...prev, yearId]
    );
  };

  // Handle bulk year level operation
  const handleSubmit = async () => {
    if (!canSubmit || !school) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // Convert running year to datetime string (January 1st of that year) if provided
      const startYearDate = runningYear
        ? new Date(`${runningYear}-01-01T00:00:00.000Z`).toISOString()
        : undefined;

      // Build payload - only include yearIds/action if year levels are selected
      // Running year is a separate operation
      const payload: {
        classIds: string[];
        yearIds?: string[];
        action?: "assign" | "replace";
        startYear?: string;
      } = {
        classIds: selectedClassIds,
      };

      // Only include year level updates if year levels are selected
      if (selectedYearIds.length > 0) {
        payload.yearIds = selectedYearIds;
        payload.action = action;
      }

      // Include running year if provided (separate operation)
      if (startYearDate) {
        payload.startYear = startYearDate;
      }

      const response = await classesApi.put.bulkUpdateYearLevels(payload);

      if (response.error) {
        setError(response.error.message || "Failed to process bulk year level operation");
        setSubmitting(false);
        return;
      }

      if (response.data) {
        setResult(response.data);
        if (response.data.summary.succeeded > 0 && onSuccess) {
          // Small delay to show results before closing
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Edit Classes</DialogTitle>
          <DialogDescription>
            Update year levels and/or running year for {selectedClassIds.length}{" "}
            selected class{selectedClassIds.length !== 1 ? "es" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Action Selection */}
          <div className="space-y-2">
            <Label>Action</Label>
            <RadioGroup
              value={action}
              onValueChange={(value) =>
                setAction(value as "assign" | "replace")
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assign" id="action-assign" />
                <Label
                  htmlFor="action-assign"
                  className="font-normal cursor-pointer"
                >
                  Assign Year Levels (Add to existing)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="action-replace" />
                <Label
                  htmlFor="action-replace"
                  className="font-normal cursor-pointer"
                >
                  Replace Year Levels (Remove existing, then add new)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Year Level Selection */}
          <div className="space-y-2">
            <Label>Select Year Levels</Label>
            {loadingYears ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Loading year levels...
                </span>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {availableYears.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No year levels available for this school
                    </p>
                  ) : (
                    availableYears.map((year) => (
                      <div key={year.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`year-${year.id}`}
                          checked={selectedYearIds.includes(year.id)}
                          onCheckedChange={() => toggleYearLevel(year.id)}
                        />
                        <Label
                          htmlFor={`year-${year.id}`}
                          className="font-normal cursor-pointer"
                        >
                          {year.displayName || year.name || year.code}
                          {year.code && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({year.code})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
            {selectedYearIds.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedYearIds.length} year level
                {selectedYearIds.length !== 1 ? "s" : ""} selected
              </div>
            )}
          </div>

          {/* Running Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="running-year">Running Year (Optional)</Label>
            <Select value={runningYear} onValueChange={setRunningYear}>
              <SelectTrigger id="running-year" className="w-full">
                <SelectValue placeholder="Select running year (optional)" />
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
            {runningYear && (
              <div className="text-sm text-muted-foreground">
                Running year will be set to {runningYear} for all selected
                classes
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-2">
              <Alert
                variant={
                  result.summary.failed === 0 ? "default" : "destructive"
                }
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Operation Complete</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1 mt-2">
                    <div>
                      Total: {result.summary.total} • Succeeded:{" "}
                      {result.summary.succeeded} • Failed:{" "}
                      {result.summary.failed}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {result.results.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-sm p-2 rounded",
                        item.success
                          ? "bg-green-50 dark:bg-green-950/20"
                          : "bg-red-50 dark:bg-red-950/20"
                      )}
                    >
                      {item.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="font-medium">{item.className}</span>
                      <span className="text-muted-foreground ml-auto">
                        {item.message}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Classes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
