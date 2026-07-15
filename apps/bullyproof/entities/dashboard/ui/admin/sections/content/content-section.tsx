"use client";

import type { ContentTypeRow, CurriculumStageRow } from "@/types/db";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StageCards } from "@/entities/curriculum/ui/stage-cards";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Layers, Loader2, Pencil, Plus } from "lucide-react";
import { AddStageSheet } from "./add-stage-sheet";
import { AddContentTypeSheet } from "./add-content-type-sheet";
import { EditContentTypeSheet } from "./edit-content-type-sheet";
import { useStages, useInvalidateStage } from "@/entities/stages/model/store";
import {
  useContentTypes,
  useInvalidateContentTypes,
} from "@/entities/content-types/api/hooks";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { PAGE_FEATURES } from "@/lib/feature-keys";

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

interface ContentSectionProps {
  /** Whether this is admin mode (shows add button) */
  isAdmin?: boolean;
  /** The title to display */
  title: string;
  /** The description to display */
  description: string;
  /** Base path for navigation */
  basePath: string;
  /** Optional school ID for school-specific routes */
  schoolId?: string;
  /** When true, hide the header (used when parent provides its own header) */
  hideHeader?: boolean;
}

export function ContentSection({
  isAdmin = false,
  title,
  description,
  basePath,
  hideHeader = false,
}: ContentSectionProps) {
  const router = useRouter();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Content Types: a dark-launched feature (INTRADARK_DEV only). When the viewer
  // lacks the gate this whole block is inert and the tree behaves exactly as
  // before, scoped to the Default type.
  const { hasAccess: canManageTypes } = useFeatureAccess(
    PAGE_FEATURES.ADMIN_CONTENT_TYPES,
  );
  const showTypes = isAdmin && canManageTypes;

  const { contentTypes } = useContentTypes(showTypes);
  const invalidateContentTypes = useInvalidateContentTypes();
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>();
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false);

  // Default the switcher to the Default type once the list loads.
  useEffect(() => {
    if (showTypes && !selectedTypeId && contentTypes.length > 0) {
      const fallback =
        contentTypes.find((t) => t.isDefault) ?? contentTypes[0];
      setSelectedTypeId(fallback?.id);
    }
  }, [showTypes, selectedTypeId, contentTypes]);

  const selectedType: ContentTypeRow | undefined = contentTypes.find(
    (t) => t.id === selectedTypeId,
  );
  const isSelectedDefault = selectedType?.isDefault ?? true;

  // Use the cached React Query hook; scope to the selected type when gated on.
  const { stages, isLoading, error, refetch } = useStages(
    showTypes ? selectedTypeId : undefined,
  );
  const { invalidateAllStages } = useInvalidateStage();

  // Trigger background refetch on mount to ensure complete data
  // This ensures that even if we navigated from a topic page that only cached
  // a single stage, we'll fetch all stages in the background while showing cached data
  useEffect(() => {
    // Refetch in the background without blocking the UI
    // The cached data will display immediately, and the UI will update when fresh data arrives
    refetch();
  }, [refetch]);

  const handleStageClick = (stage: Stage) => {
    // Navigate to stage detail page using the stage slug (pretty URL)
    router.push(`${basePath}/${stage.slug}`);
  };

  const handleAddNewClick = () => {
    setIsAddSheetOpen(true);
  };

  const handleStageCreated = () => {
    // Invalidate cache and refetch after creating a new stage
    invalidateAllStages();
    refetch();
  };

  const handleTypeCreated = (created: ContentTypeRow) => {
    invalidateContentTypes();
    setSelectedTypeId(created.id);
  };

  const handleTypeSaved = () => {
    invalidateContentTypes();
  };

  const handleTypeDeleted = () => {
    invalidateContentTypes();
    setSelectedTypeId(contentTypes.find((t) => t.isDefault)?.id);
  };

  const loadingText = isAdmin
    ? "Loading curriculum stages..."
    : "Loading lesson levels...";
  const errorText = isAdmin
    ? "Error loading curriculum stages"
    : "Error loading lesson levels";
  const emptyText = isAdmin
    ? "No curriculum stages found"
    : "No lesson levels found";
  const emptyDescription = isAdmin
    ? 'There are no curriculum stages available. Click "Add new stage" to create one.'
    : "There are no lesson levels available at this time.";

  if (isLoading && stages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p className="font-medium">{errorText}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : `Failed to fetch ${isAdmin ? "curriculum stages" : "lesson levels"}`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {!hideHeader && (
          <div className={isAdmin ? "flex items-center justify-between" : ""}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
            </div>
            {isAdmin && (!showTypes || isSelectedDefault) && (
              <Button onClick={handleAddNewClick} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add new stage
              </Button>
            )}
          </div>
        )}

        {showTypes && (
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Content Type</span>
              <Select
                value={selectedTypeId}
                onValueChange={setSelectedTypeId}
              >
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Select a content type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {selectedType && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditTypeOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button size="sm" onClick={() => setIsAddTypeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Content Type
              </Button>
            </div>
          </div>
        )}

        {stages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="font-medium mb-2">{emptyText}</p>
            <p className="text-sm">{emptyDescription}</p>
          </div>
        ) : (
          <StageCards
            stages={stages}
            onStageClick={handleStageClick}
            basePath={basePath}
            thumbnailClicksGoToStage={!isAdmin}
          />
        )}
      </div>
      {isAdmin && (
        <AddStageSheet
          open={isAddSheetOpen}
          onOpenChange={setIsAddSheetOpen}
          onStageCreated={handleStageCreated}
        />
      )}
      {showTypes && (
        <>
          <AddContentTypeSheet
            open={isAddTypeOpen}
            onOpenChange={setIsAddTypeOpen}
            existingTypes={contentTypes}
            onCreated={handleTypeCreated}
          />
          <EditContentTypeSheet
            open={isEditTypeOpen}
            onOpenChange={setIsEditTypeOpen}
            contentType={selectedType ?? null}
            onSaved={handleTypeSaved}
            onDeleted={handleTypeDeleted}
          />
        </>
      )}
    </>
  );
}
