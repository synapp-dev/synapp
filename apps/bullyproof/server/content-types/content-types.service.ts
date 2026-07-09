import { db } from "@/server/db/drizzle";
import { assertFeature } from "@/server/features/features.service";
import { contentTypesRepo } from "./content-types.repo";
import {
  createContentTypeSchema,
  updateContentTypeSchema,
} from "./content-types.validators";

type AuthContext = {
  userId: string | null;
  roles?: string[];
};

export type ContentTypeErrorCode =
  | "not_found"
  | "duplicate_name"
  | "in_use"
  | "default_protected"
  | "level_in_use"
  | "source_not_found";

/** Domain error carrying a stable code so routes can pick the HTTP status. */
export class ContentTypeError extends Error {
  code: ContentTypeErrorCode;
  constructor(code: ContentTypeErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ContentTypeError";
    this.code = code;
  }
}

async function assertCanManage(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/content");
}

export const contentTypesService = {
  /** Reference data: any authenticated user may list types (switcher, dropdown). */
  async list(ctx: AuthContext) {
    if (!ctx.userId) throw new Error("Unauthorized");
    return contentTypesRepo.list();
  },

  async getById(ctx: AuthContext, id: string) {
    if (!ctx.userId) throw new Error("Unauthorized");
    const row = await contentTypesRepo.getById(id);
    if (!row) throw new ContentTypeError("not_found");
    return row;
  },

  async create(ctx: AuthContext, body: unknown) {
    await assertCanManage(ctx);
    const params = createContentTypeSchema.parse(body);

    const clash = await contentTypesRepo.findByNameInsensitive(params.name);
    if (clash) throw new ContentTypeError("duplicate_name");

    if (params.sourceContentTypeId) {
      const source = await contentTypesRepo.getById(params.sourceContentTypeId);
      if (!source) throw new ContentTypeError("source_not_found");
      const created = await contentTypesRepo.duplicateFromSource(
        params.name,
        params.sourceContentTypeId,
      );
      if (!created) throw new ContentTypeError("source_not_found");
      return contentTypesRepo.getById(created.id);
    }

    const type = await db.transaction((tx) =>
      contentTypesRepo.insertWithLevels(tx, {
        name: params.name,
        levelNames: params.levelNames,
      }),
    );
    return type;
  },

  async update(ctx: AuthContext, id: string, body: unknown) {
    await assertCanManage(ctx);
    const params = updateContentTypeSchema.parse(body);

    const existing = await contentTypesRepo.getById(id);
    if (!existing) throw new ContentTypeError("not_found");

    if (params.name !== undefined) {
      const clash = await contentTypesRepo.findByNameInsensitive(
        params.name,
        id,
      );
      if (clash) throw new ContentTypeError("duplicate_name");
    }

    // Sync materialised stages to the edited level list before persisting the
    // level_names, so the tree and the type row never diverge.
    if (params.levelNames !== undefined) {
      await this.syncLevels(id, params.levelNames);
    }

    return contentTypesRepo.update(id, {
      name: params.name,
      levelNames: params.levelNames,
    });
  },

  /** Rename-by-position, append new levels, block removing a level with topics. */
  async syncLevels(contentTypeId: string, levelNames: string[]) {
    const stages = await contentTypesRepo.listStages(contentTypeId);

    // Removals: trailing stages beyond the new length must be empty.
    if (levelNames.length < stages.length) {
      const removed = stages.slice(levelNames.length);
      for (const stage of removed) {
        if (await contentTypesRepo.stageHasTopics(stage.id)) {
          throw new ContentTypeError(
            "level_in_use",
            "A removed level still has topics",
          );
        }
      }
      await contentTypesRepo.deleteStages(removed.map((s) => s.id));
    }

    // Renames for existing slots.
    const renamePairs = stages
      .slice(0, levelNames.length)
      .map((stage, i) => ({ stage, name: levelNames[i] }))
      .filter(({ stage, name }) => stage.name !== name);
    for (const { stage, name } of renamePairs) {
      await contentTypesRepo.renameStage(stage.id, name);
    }

    // Appends for new slots.
    if (levelNames.length > stages.length) {
      const startIndex = stages.length;
      const appended = levelNames.slice(startIndex);
      await contentTypesRepo.appendStages(contentTypeId, startIndex, appended);
    }
  },

  async delete(ctx: AuthContext, id: string) {
    await assertCanManage(ctx);

    const existing = await contentTypesRepo.getById(id);
    if (!existing) throw new ContentTypeError("not_found");
    if (existing.isDefault) {
      throw new ContentTypeError("default_protected", "The Default type cannot be deleted");
    }

    const schoolCount = await contentTypesRepo.countSchoolsUsing(id);
    if (schoolCount > 0) {
      throw new ContentTypeError(
        "in_use",
        `In use by ${schoolCount} school${schoolCount === 1 ? "" : "s"}`,
      );
    }
    if (await contentTypesRepo.hasTopics(id)) {
      throw new ContentTypeError("in_use", "This type has authored topics");
    }

    await contentTypesRepo.delete(id);
    return { id };
  },
};
