import { db } from "@/server/db/drizzle";
import {
  resourceFiles,
  resourceFileTopics,
  resourceFolders,
  topics,
} from "@/server/db/schema";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

export const resourcesRepo = {
  async listFoldersForSchool(schoolId: string) {
    return db
      .select()
      .from(resourceFolders)
      .where(
        or(
          and(
            eq(resourceFolders.scopeType, "global"),
            isNull(resourceFolders.schoolId)
          ),
          and(
            eq(resourceFolders.scopeType, "school"),
            eq(resourceFolders.schoolId, schoolId)
          )
        )
      )
      .orderBy(
        asc(resourceFolders.scopeType),
        asc(resourceFolders.parentId),
        asc(resourceFolders.name)
      );
  },

  async listFilesForSchool(schoolId: string) {
    return db
      .select()
      .from(resourceFiles)
      .where(
        or(
          and(
            eq(resourceFiles.scopeType, "global"),
            isNull(resourceFiles.schoolId)
          ),
          and(
            eq(resourceFiles.scopeType, "school"),
            eq(resourceFiles.schoolId, schoolId)
          )
        )
      )
      .orderBy(asc(resourceFiles.folderId), asc(resourceFiles.displayName));
  },

  async listFilesByScope(scopeType: "global" | "school", schoolId?: string) {
    if (scopeType === "global") {
      return db
        .select()
        .from(resourceFiles)
        .where(
          and(eq(resourceFiles.scopeType, "global"), isNull(resourceFiles.schoolId))
        )
        .orderBy(asc(resourceFiles.folderId), asc(resourceFiles.displayName));
    }

    if (!schoolId) {
      throw new Error("schoolId is required for school scope");
    }

    return db
      .select()
      .from(resourceFiles)
      .where(
        and(
          eq(resourceFiles.scopeType, "school"),
          eq(resourceFiles.schoolId, schoolId)
        )
      )
      .orderBy(asc(resourceFiles.folderId), asc(resourceFiles.displayName));
  },

  async listFoldersByScope(scopeType: "global" | "school", schoolId?: string) {
    if (scopeType === "global") {
      return db
        .select()
        .from(resourceFolders)
        .where(
          and(
            eq(resourceFolders.scopeType, "global"),
            isNull(resourceFolders.schoolId)
          )
        );
    }

    if (!schoolId) {
      throw new Error("schoolId is required for school scope");
    }

    return db
      .select()
      .from(resourceFolders)
      .where(
        and(
          eq(resourceFolders.scopeType, "school"),
          eq(resourceFolders.schoolId, schoolId)
        )
      );
  },

  async getFolderById(id: string) {
    const rows = await db
      .select()
      .from(resourceFolders)
      .where(eq(resourceFolders.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async getFileById(id: string) {
    const rows = await db
      .select()
      .from(resourceFiles)
      .where(eq(resourceFiles.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async getTopicById(id: string) {
    const rows = await db.select().from(topics).where(eq(topics.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async createFolder(
    data: {
      name: string;
      slug: string;
      description?: string | null;
      parentId?: string | null;
      scopeType: "global" | "school";
      schoolId?: string | null;
      createdBy?: string | null;
    },
    tx?: any
  ) {
    const executor = tx ?? db;
    return executor.insert(resourceFolders).values(data).returning();
  },

  async updateFolder(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      updatedAt?: string;
    },
    tx?: any
  ) {
    const executor = tx ?? db;
    return executor
      .update(resourceFolders)
      .set(data)
      .where(eq(resourceFolders.id, id))
      .returning();
  },

  async deleteFolderById(id: string, tx?: any) {
    const executor = tx ?? db;
    return executor
      .delete(resourceFolders)
      .where(eq(resourceFolders.id, id))
      .returning();
  },

  async createFile(
    data: {
      folderId: string;
      displayName: string;
      storagePath: string;
      mimeType?: string | null;
      sizeBytes: number;
      scopeType: "global" | "school";
      schoolId?: string | null;
      uploadedBy?: string | null;
    },
    tx?: any
  ) {
    const executor = tx ?? db;
    return executor.insert(resourceFiles).values(data).returning();
  },

  async updateFile(
    id: string,
    data: {
      displayName?: string;
      storagePath?: string;
      mimeType?: string | null;
      sizeBytes?: number;
      updatedAt?: string;
    },
    tx?: any
  ) {
    const executor = tx ?? db;
    return executor
      .update(resourceFiles)
      .set(data)
      .where(eq(resourceFiles.id, id))
      .returning();
  },

  async deleteFileById(id: string, tx?: any) {
    const executor = tx ?? db;
    return executor.delete(resourceFiles).where(eq(resourceFiles.id, id));
  },

  async listFilesByFolderIds(folderIds: string[]) {
    if (folderIds.length === 0) return [];
    return db
      .select()
      .from(resourceFiles)
      .where(inArray(resourceFiles.folderId, folderIds));
  },

  async listFilesMappedToTopic(topicId: string, schoolId: string) {
    return db
      .select({
        id: resourceFiles.id,
        displayName: resourceFiles.displayName,
        mimeType: resourceFiles.mimeType,
        sizeBytes: resourceFiles.sizeBytes,
        createdAt: resourceFiles.createdAt,
      })
      .from(resourceFileTopics)
      .innerJoin(resourceFiles, eq(resourceFiles.id, resourceFileTopics.fileId))
      .where(
        and(
          eq(resourceFileTopics.topicId, topicId),
          or(
            and(
              eq(resourceFiles.scopeType, "global"),
              isNull(resourceFiles.schoolId)
            ),
            and(
              eq(resourceFiles.scopeType, "school"),
              eq(resourceFiles.schoolId, schoolId)
            )
          )
        )
      )
      .orderBy(asc(resourceFiles.displayName));
  },

  async listTopicsForFile(fileId: string) {
    return db
      .select({
        topicId: topics.id,
        topicTitle: topics.title,
      })
      .from(resourceFileTopics)
      .innerJoin(topics, eq(topics.id, resourceFileTopics.topicId))
      .where(eq(resourceFileTopics.fileId, fileId))
      .orderBy(asc(topics.title));
  },

  async getFileTopicLink(fileId: string, topicId: string) {
    const rows = await db
      .select()
      .from(resourceFileTopics)
      .where(
        and(
          eq(resourceFileTopics.fileId, fileId),
          eq(resourceFileTopics.topicId, topicId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async addFileTopic(
    data: {
      fileId: string;
      topicId: string;
      createdBy?: string | null;
    },
    tx?: any
  ) {
    const executor = tx ?? db;
    return executor
      .insert(resourceFileTopics)
      .values(data)
      .onConflictDoNothing()
      .returning();
  },

  async removeFileTopic(fileId: string, topicId: string, tx?: any) {
    const executor = tx ?? db;
    return executor
      .delete(resourceFileTopics)
      .where(
        and(
          eq(resourceFileTopics.fileId, fileId),
          eq(resourceFileTopics.topicId, topicId)
        )
      )
      .returning();
  },
};
