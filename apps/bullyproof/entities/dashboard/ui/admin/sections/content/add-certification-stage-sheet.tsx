"use client";

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
import { Loader2, Plus } from "lucide-react";
import { certificationApi } from "@/entities/certification/api/endpoints";

interface AddCertificationStageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageCreated?: () => void;
}

export function AddCertificationStageSheet({
  open,
  onOpenChange,
  onStageCreated,
}: AddCertificationStageSheetProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sortIndex, setSortIndex] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setSortIndex("");
      setError(null);
    }
  }, [open]);

  const validateForm = (): { isValid: boolean; message?: string } => {
    if (!code.trim()) {
      return { isValid: false, message: "Code is required" };
    }
    // Removed pattern validation - code can be any string (used as URL slug)
    if (!name.trim()) {
      return { isValid: false, message: "Name is required" };
    }
    if (sortIndex && (isNaN(Number(sortIndex)) || Number(sortIndex) < 0 || Number(sortIndex) > 32767)) {
      return {
        isValid: false,
        message: "Sort index must be a number between 0 and 32767",
      };
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
      const result = await certificationApi.stages.create({
        code: code.trim(),
        name: name.trim(),
        sortIndex: sortIndex ? Number(sortIndex) : undefined,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create stage");
        return;
      }

      // Success - close sheet and refresh
      onOpenChange(false);
      onStageCreated?.();
    } catch (err) {
      console.error("Failed to create certification stage:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create certification stage. Please try again."
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
              Add New Certification Stage
            </SheetTitle>
            <SheetDescription className="text-sm">
              Create a new certification stage by filling in the details below.
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
                  placeholder="e.g., introduction-to-bullying, advanced-certification"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  A unique identifier used in URLs (e.g., introduction-to-bullying)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Certification Course, Advanced Certification"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  The display name for this certification stage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortIndex">
                  Sort Index <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="sortIndex"
                  type="number"
                  placeholder="Auto-calculated if not provided"
                  value={sortIndex}
                  onChange={(e) => setSortIndex(e.target.value)}
                  disabled={isSubmitting}
                  min={0}
                  max={32767}
                />
                <p className="text-xs text-muted-foreground">
                  Optional sort order. If not provided, will be automatically set to the next available value.
                </p>
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
