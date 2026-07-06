"use client";

import type { SchoolYearRow } from "@/types/db";

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
import { Loader2, Plus, Check, ChevronDown } from "lucide-react";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";

interface AddStageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageCreated?: () => void;
}

export function AddStageSheet({
  open,
  onOpenChange,
  onStageCreated,
}: AddStageSheetProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<
    Array<SchoolYearRow & { level?: { id: string; name: string; key: string } }>
  >([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [yearComboboxOpen, setYearComboboxOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available years when sheet opens
  useEffect(() => {
    if (open) {
      loadYears();
    }
  }, [open]);

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setSelectedYearIds([]);
      setError(null);
    }
  }, [open]);

  const loadYears = async () => {
    setLoadingYears(true);
    try {
      const result = await curriculumApi.years.list();
      if (!result.error && result.data) {
        // Extract year objects from the nested response structure
        // Response format: [{ year: {...}, level: {...} }, ...]
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
    if (!code.trim()) {
      return { isValid: false, message: "Code is required" };
    }
    if (!/^S[0-9]+$/.test(code.trim())) {
      return {
        isValid: false,
        message: "Code must match pattern S[0-9]+ (e.g., S1, S2, S10)",
      };
    }
    if (!name.trim()) {
      return { isValid: false, message: "Name is required" };
    }
    if (selectedYearIds.length === 0) {
      return { isValid: false, message: "At least one year level must be selected" };
    }
    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.message || "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await curriculumApi.stages.create({
        code: code.trim(),
        name: name.trim(),
        minimumYearLevelIds: selectedYearIds,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create stage");
        return;
      }

      // Success - close sheet and refresh
      onOpenChange(false);
      onStageCreated?.();
    } catch (err) {
      console.error("Failed to create stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create stage. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[95vh] w-full max-w-2xl mx-auto rounded-t-2xl border-t-2 border-l-2 border-r-2 border-border/50 shadow-2xl p-0 flex flex-col"
      >
        <div className="p-6 pb-4 border-b">
          <SheetHeader className="space-y-1">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5" />
              Add New Stage
            </SheetTitle>
            <SheetDescription className="text-sm">
              Create a new curriculum stage by filling in the details below.
            </SheetDescription>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 max-w-2xl mx-auto">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="e.g., S1, S2, S10"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isSubmitting}
                  pattern="^S[0-9]+$"
                />
                <p className="text-xs text-muted-foreground">
                  Must match pattern S[0-9]+ (e.g., S1, S2, S10)
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
                  Minimum Year Levels <span className="text-destructive">*</span>
                </Label>
                <Popover open={yearComboboxOpen} onOpenChange={setYearComboboxOpen}>
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
                            const isSelected = selectedYearIds.includes(year.id);
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
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    isSelected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span>{year.displayName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {year.code} {year.level ? `• ${year.level.name}` : ""}
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
                  Select the year levels this stage applies to. The sort index will be automatically calculated based on the minimum year level.
                </p>
                {selectedYearIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedYearIds.map((yearId) => {
                      const year = availableYears.find((y) => y.id === yearId);
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
                                selectedYearIds.filter((id) => id !== yearId)
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
            </div>
          </div>

          <div className="p-6 border-t flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Stage
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

