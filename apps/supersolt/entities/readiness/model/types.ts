import type { SuperbotSuggestionIconId } from "@/entities/dashboard/model/dummy-superbot-suggestions";

export type ReadinessModuleId =
  | "menu-ingredients"
  | "purchasing-orders"
  | "stock-counts"
  | "stock-waste"
  | "workforce-roster";

export type ReadinessCheckId =
  | "has_suppliers"
  | "has_mapped_ingredients"
  | "has_team_members";

export type ModuleLockStatus = "unlocked" | "locked" | "hidden";

export type ReadinessBlockerDto = {
  checkId: ReadinessCheckId;
  taskId: string;
  title: string;
  description: string;
  pathSuffix: string;
  ctaLabel: string;
};

export type ReadinessModuleStateDto = {
  id: ReadinessModuleId;
  title: string;
  status: ModuleLockStatus;
  blockers: ReadinessBlockerDto[];
};

export type ReadinessSuggestionDto = {
  id: string;
  kind: "setup";
  moduleId: ReadinessModuleId | null;
  gridLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  pathSuffix: string;
  iconId: SuperbotSuggestionIconId;
  pageFollowUpQuestion?: string;
};

export type ReadinessCompactDto = {
  appliesGating: boolean;
  coreGreen: boolean;
  modules: Record<ReadinessModuleId, ModuleLockStatus>;
};

export type ReadinessPayloadDto = ReadinessCompactDto & {
  modulesDetailed: ReadinessModuleStateDto[];
  suggestions: ReadinessSuggestionDto[];
  pendingUnlockCelebrations: Array<{
    moduleId: ReadinessModuleId;
    title: string;
    pathSuffix: string;
    ctaLabel: string;
  }>;
};

export type ReadinessPatchBody =
  | { action: "dismiss_suggestion"; suggestionKey: string }
  | { action: "mark_unlock_seen"; moduleId: ReadinessModuleId };
