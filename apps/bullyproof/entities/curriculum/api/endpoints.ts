import type { CurriculumStageRow, SchoolLevelRow, SchoolYearRow } from "@/types/db";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

type Stage = CurriculumStageRow;
type Year = SchoolYearRow;
type Level = SchoolLevelRow;

type StageWithYears = Stage & {
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

/**
 * Client-side curriculum API endpoints.
 *
 * Groups stage, year, and level endpoints behind a typed interface that
 * returns the shared `ApiResult` envelope from `apiFetch`.
 */
export const curriculumApi = {
  stages: {
    /**
     * Lists curriculum stages.
     *
     * @param params Optional pagination controls.
     * @returns Stages with optional year and level details.
     */
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<StageWithYears[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<StageWithYears[]>(`/curriculum/stages${query ? `?${query}` : ""}`);
    },
    /**
     * Fetches a single stage by ID.
     *
     * @param id Stage identifier.
     * @returns Stage details with optional years.
     */
    byId(id: string): Promise<ApiResult<Stage & { years?: any[] }>> {
      return apiFetch<Stage & { years?: any[] }>(
        `/curriculum/stages/${encodeURIComponent(id)}`
      );
    },
    /**
     * Fetches a single stage by stage code.
     *
     * @param code Stage code.
     * @returns Stage details with optional years.
     */
    byCode(code: string): Promise<ApiResult<Stage & { years?: any[] }>> {
      return apiFetch<Stage & { years?: any[] }>(
        `/curriculum/stages/by-code/${encodeURIComponent(code)}`
      );
    },
    /**
     * Fetches a single stage by URL slug.
     *
     * @param slug Stage slug.
     * @returns Stage details with optional years.
     */
    bySlug(slug: string): Promise<ApiResult<Stage & { years?: any[] }>> {
      return apiFetch<Stage & { years?: any[] }>(
        `/curriculum/stages/by-slug/${encodeURIComponent(slug)}`
      );
    },
    /**
     * Creates a new curriculum stage.
     *
     * @param data Stage payload.
     * @returns Newly created stage.
     */
    create(data: {
      code: string;
      name: string;
      minimumYearLevelIds: string[];
    }): Promise<ApiResult<Stage>> {
      return apiFetch<Stage>("/curriculum/stages", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    /**
     * Updates an existing curriculum stage.
     *
     * @param id Stage identifier.
     * @param data Mutable stage fields.
     * @returns Updated stage.
     */
    update(
      id: string,
      data: { name: string; minimumYearLevelIds: string[] }
    ): Promise<ApiResult<Stage>> {
      return apiFetch<Stage>(`/curriculum/stages/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    /**
     * Deletes a curriculum stage.
     *
     * @param id Stage identifier.
     * @returns Deletion status payload.
     */
    delete(id: string): Promise<ApiResult<{ success: boolean }>> {
      return apiFetch<{ success: boolean }>(
        `/curriculum/stages/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        }
      );
    },
  },
  years: {
    /**
     * Lists school years.
     *
     * @param params Optional filters and pagination controls.
     * @returns Matching school years.
     */
    list(params?: {
      levelId?: string;
      levelIds?: string[];
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Year[]>> {
      const searchParams = new URLSearchParams();
      if (params?.levelId) searchParams.set("levelId", params.levelId);
      if (params?.levelIds && params.levelIds.length > 0) {
        searchParams.set("levelIds", params.levelIds.join(","));
      }
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Year[]>(`/curriculum/years${query ? `?${query}` : ""}`);
    },
    /**
     * Fetches a single school year by ID.
     *
     * @param id Year identifier.
     * @returns Year details with optional level and stage relations.
     */
    byId(
      id: string
    ): Promise<ApiResult<Year & { level?: any; stages?: any[] }>> {
      return apiFetch<Year & { level?: any; stages?: any[] }>(
        `/curriculum/years/${encodeURIComponent(id)}`
      );
    },
  },
  levels: {
    /**
     * Lists school levels.
     *
     * @param params Optional pagination controls.
     * @returns Matching school levels.
     */
    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<ApiResult<Level[]>> {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());

      const query = searchParams.toString();
      return apiFetch<Level[]>(`/curriculum/levels${query ? `?${query}` : ""}`);
    },
  },
};
