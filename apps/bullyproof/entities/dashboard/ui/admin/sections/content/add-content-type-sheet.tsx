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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Layers,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { contentTypesApi } from "@/entities/content-types/api/endpoints";

interface AddContentTypeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTypes: ContentTypeRow[];
  onCreated?: (created: ContentTypeRow) => void;
}

const BLANK = "__blank__";

export function AddContentTypeSheet({
  open,
  onOpenChange,
  existingTypes,
  onCreated,
}: AddContentTypeSheetProps) {
  const [name, setName] = useState("");
  const [levelNames, setLevelNames] = useState<string[]>(["Level 1"]);
  const [sourceId, setSourceId] = useState<string>(BLANK);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyingFrom =
    sourceId !== BLANK ? existingTypes.find((t) => t.id === sourceId) : null;
  const locked = !!copyingFrom;

  useEffect(() => {
    if (open) {
      setName("");
      setLevelNames(["Level 1"]);
      setSourceId(BLANK);
      setError(null);
    }
  }, [open]);

  // When a template is chosen, prefill and lock the level rows (copy exact,
  // then edit with the normal tools afterwards).
  useEffect(() => {
    if (copyingFrom) {
      const names = Array.isArray(copyingFrom.levelNames)
        ? (copyingFrom.levelNames as string[])
        : [];
      setLevelNames(names.length > 0 ? names : ["Level 1"]);
    }
  }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLevelAt = (i: number, value: string) => {
    setLevelNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  };
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
  const validationError = (): string | null => {
    if (!name.trim()) return "Name is required";
    if (trimmedLevels.length < 1) return "At least one level is required";
    if (trimmedLevels.some((n) => n.length === 0))
      return "Every level needs a name";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const invalid = validationError();
    if (invalid) {
      setError(invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await contentTypesApi.create({
        name: name.trim(),
        levelCount: trimmedLevels.length,
        levelNames: trimmedLevels,
        sourceContentTypeId: copyingFrom ? copyingFrom.id : undefined,
      });
      if (result.error) {
        setError(result.error.message || "Failed to create content type");
        return;
      }
      if (result.data) {
        onCreated?.(result.data);
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create content type",
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
              <Layers className="h-5 w-5" />
              Add Content Type
            </SheetTitle>
            <SheetDescription className="text-sm">
              Define a new curriculum: its name and the levels it runs through.
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

              <div className="space-y-2">
                <Label htmlFor="ct-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ct-name"
                  placeholder="e.g., Thursday Island"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {existingTypes.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="ct-source">Start from</Label>
                  <Select
                    value={sourceId}
                    onValueChange={setSourceId}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="ct-source" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BLANK}>Blank</SelectItem>
                      {existingTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          Copy of {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {locked && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Copy className="h-3.5 w-3.5" />
                      Levels, topics and slides copy exactly from{" "}
                      {copyingFrom?.name}. Edit them after creating.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Levels <span className="text-destructive">*</span>
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {trimmedLevels.length}
                    </span>
                  </Label>
                  {!locked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLevel}
                      disabled={isSubmitting}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add level
                    </Button>
                  )}
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
                        disabled={isSubmitting || locked}
                      />
                      {!locked && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => move(i, -1)}
                            disabled={isSubmitting || i === 0}
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
                            disabled={isSubmitting || i === levelNames.length - 1}
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
                            disabled={isSubmitting || levelNames.length <= 1}
                            aria-label="Remove level"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                  Create Content Type
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
