"use client";

import type { ContentTypeRow } from "@/types/db";

import { useEffect, useState } from "react";
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
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { contentTypesApi } from "@/entities/content-types/api/endpoints";

interface EditContentTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentTypeRow | null;
  onSaved?: (saved: ContentTypeRow) => void;
  onDeleted?: (id: string) => void;
}

export function EditContentTypeSheet({
  open,
  onOpenChange,
  contentType,
  onSaved,
  onDeleted,
}: EditContentTypeSheetProps) {
  const [name, setName] = useState("");
  const [levelNames, setLevelNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDefault = contentType?.isDefault ?? false;

  useEffect(() => {
    if (open && contentType) {
      setName(contentType.name);
      setLevelNames(
        Array.isArray(contentType.levelNames)
          ? (contentType.levelNames as string[])
          : [],
      );
      setError(null);
    }
  }, [open, contentType]);

  const setLevelAt = (i: number, value: string) =>
    setLevelNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  const addLevel = () =>
    setLevelNames((prev) => [...prev, `Level ${prev.length + 1}`]);
  const removeLevel = (i: number) =>
    setLevelNames((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setLevelNames((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const trimmedLevels = levelNames.map((n) => n.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentType) return;
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (trimmedLevels.length < 1 || trimmedLevels.some((n) => n.length === 0)) {
      setError("Every level needs a name");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await contentTypesApi.update(contentType.id, {
        name: name.trim(),
        levelCount: trimmedLevels.length,
        levelNames: trimmedLevels,
      });
      if (result.error) {
        setError(result.error.message || "Failed to save content type");
        return;
      }
      if (result.data) onSaved?.(result.data);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save content type",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!contentType) return;
    setError(null);
    setIsDeleting(true);
    try {
      const result = await contentTypesApi.delete(contentType.id);
      if (result.error) {
        setError(
          result.error.message ||
            "This content type is in use and cannot be deleted.",
        );
        return;
      }
      onDeleted?.(contentType.id);
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete content type",
      );
    } finally {
      setIsDeleting(false);
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
              <Pencil className="h-5 w-5" />
              Edit Content Type
            </SheetTitle>
            <SheetDescription className="text-sm">
              Rename the type or adjust its levels. Removing a level that still
              has topics is blocked.
            </SheetDescription>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 max-w-2xl mx-auto">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    {error}
                  </p>
                </div>
              )}

              {isDefault && (
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-sm text-muted-foreground">
                    This is the Default type. It can be renamed but not deleted.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="ect-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ect-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting || isDeleting}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Levels
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {trimmedLevels.length}
                    </span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLevel}
                    disabled={isSubmitting || isDeleting}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add level
                  </Button>
                </div>

                <div className="space-y-2">
                  {levelNames.map((levelName, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-8 shrink-0 text-xs text-muted-foreground text-center">
                        S{i + 1}
                      </span>
                      <Input
                        value={levelName}
                        placeholder={`Level ${i + 1}`}
                        onChange={(e) => setLevelAt(i, e.target.value)}
                        disabled={isSubmitting || isDeleting}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => move(i, -1)}
                          disabled={isSubmitting || isDeleting || i === 0}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => move(i, 1)}
                          disabled={
                            isSubmitting ||
                            isDeleting ||
                            i === levelNames.length - 1
                          }
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLevel(i)}
                          disabled={
                            isSubmitting || isDeleting || levelNames.length <= 1
                          }
                          aria-label="Remove level"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t flex items-center justify-between gap-3">
            {!isDefault ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
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
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
