"use client";

import type { CurriculumStageRow, SchoolYearRow } from "@/types/db";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Loader2, Edit, Check, ChevronDown, Trash2 } from "lucide-react";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";

type Stage = CurriculumStageRow & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: {
      id: string;
      name: string;
      key: string;
    };
  }>;
};

interface EditStageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  onStageUpdated?: () => void;
  onStageDeleted?: () => void;
}

export function EditStageSheet({
  open,
  onOpenChange,
  stage,
  onStageUpdated,
  onStageDeleted,
}: EditStageSheetProps) {
  const [name, setName] = useState("");
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<
    Array<
      SchoolYearRow & {
        level?: { id: string; name: string; key: string };
      }
    >
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearComboboxOpen, setYearComboboxOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load stage data when sheet opens
  useEffect(() => {
    if (open && stage) {
      setName(stage.name || "");
      setSelectedYearIds(stage.years?.map((y) => y.id) || []);
      setError(null);
      loadYears();
    }
  }, [open, stage]);

  const loadYears = async () => {
    setLoadingYears(true);
    try {
      const result = await curriculumApi.years.list();
      if (!result.error && result.data) {
        // Extract year objects from the nested response structure
        const years = result.data
          .map((item: any) => ({
            ...item.year,
            level: item.level,
          }))
          .filter((year: any) => year != null && year.id != null);

        // Sort by sortIndex if available, otherwise by code
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
    } catch (err) {
      console.error("Failed to fetch school years:", err);
      setAvailableYears([]);
    } finally {
      setLoadingYears(false);
    }
  };

  const validateForm = (): { isValid: boolean; message?: string } => {
    if (!name.trim()) {
      return { isValid: false, message: "Name is required" };
    }
    if (selectedYearIds.length === 0) {
      return {
        isValid: false,
        message: "At least one year level must be selected",
      };
    }
    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage) return;

    setError(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.message || "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await curriculumApi.stages.update(stage.id, {
        name: name.trim(),
        minimumYearLevelIds: selectedYearIds,
      });

      if (result.error) {
        setError(result.error.message || "Failed to update stage");
        return;
      }

      // Success - close sheet and refresh
      onOpenChange(false);
      onStageUpdated?.();
    } catch (err) {
      console.error("Failed to update stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update stage. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!stage) return;

    setIsDeleting(true);
    try {
      const result = await curriculumApi.stages.delete(stage.id);

      if (result.error) {
        setError(result.error.message || "Failed to delete stage");
        setShowDeleteDialog(false);
        return;
      }

      // Success - close sheet and refresh
      setShowDeleteDialog(false);
      onOpenChange(false);
      onStageDeleted?.();
    } catch (err) {
      console.error("Failed to delete stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete stage. Please try again.",
      );
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!stage) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[95vh] w-full max-w-2xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 flex flex-col"
        >
          <div className="p-6 pb-4 border-b">
            <SheetHeader className="space-y-1">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Edit className="h-5 w-5" />
                Edit Stage Information
              </SheetTitle>
              <SheetDescription className="text-sm">
                Update the stage details below. Changes will be saved
                immediately.
              </SheetDescription>
            </SheetHeader>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 max-w-2xl mx-auto">
                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      {error}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={stage.code}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Stage code cannot be changed after creation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Stage 1, Foundation Stage"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    The display name for this curriculum stage
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    Year Levels <span className="text-destructive">*</span>
                  </Label>
                  <Popover
                    open={yearComboboxOpen}
                    onOpenChange={setYearComboboxOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={yearComboboxOpen}
                        className="w-full justify-between"
                        disabled={isSubmitting || loadingYears}
                      >
                        {selectedYearIds.length === 0
                          ? "Select year levels..."
                          : `${selectedYearIds.length} year level${selectedYearIds.length === 1 ? "" : "s"} selected`}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search years..." />
                        <CommandList>
                          <CommandEmpty>
                            {loadingYears ? "Loading..." : "No years found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {availableYears.map((year) => {
                              const isSelected = selectedYearIds.includes(
                                year.id,
                              );
                              return (
                                <CommandItem
                                  key={year.id}
                                  value={`${year.displayName} ${year.code || ""}`}
                                  onSelect={() => {
                                    if (isSelected) {
                                      setSelectedYearIds(
                                        selectedYearIds.filter(
                                          (id) => id !== year.id,
                                        ),
                                      );
                                    } else {
                                      setSelectedYearIds([
                                        ...selectedYearIds,
                                        year.id,
                                      ]);
                                    }
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      isSelected ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span>{year.displayName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {year.code}{" "}
                                      {year.level ? `• ${year.level.name}` : ""}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Select the year levels this stage applies to. The sort index
                    will be automatically recalculated.
                  </p>
                  {selectedYearIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedYearIds.map((yearId) => {
                        const year = availableYears.find(
                          (y) => y.id === yearId,
                        );
                        return year ? (
                          <div
                            key={yearId}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                          >
                            {year.displayName}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedYearIds(
                                  selectedYearIds.filter((id) => id !== yearId),
                                );
                              }}
                              className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                              disabled={isSubmitting}
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isSubmitting || isDeleting}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Stage
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Permanently delete this stage. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the stage &quot;{stage.name}&quot;. This action
              cannot be undone. All topics associated with this stage will also
              be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
