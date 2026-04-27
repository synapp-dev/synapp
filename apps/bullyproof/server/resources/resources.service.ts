import { db } from "@/server/db/drizzle";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import { resourcesRepo } from "./resources.repo";
import {
  assignResourceFileTopicSchema,
  createResourceFolderSchema,
  listResourceTreeSchema,
  listTopicResourceFilesSchema,
  renameResourceFileSchema,
  renameResourceFolderSchema,
  uploadResourceFileSchema,
  type AssignResourceFileTopicParams,
  type CreateResourceFolderParams,
  type ListTopicResourceFilesParams,
} from "./resources.validators";
import { createSlug } from "@/utils/slug";
import { createServerClient } from "@/utils/supabase/server";
import { toStorageUrl } from "@/utils/supabase/storage-url";

const BUCKET = "content";
const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const RESOURCE_MANAGER_PLATFORM_KEYS = [
  "INTRADARK_DEV",
  "PLATFORM_ADMIN",
  "PLATFORM_MODERATOR",
] as const;

/** Effective user for permissions; actorUserId for audit columns (real JWT user). */
export type ResourcesAuthContext = {
  userId: string;
  actorUserId: string;
};

type FolderRow = Awaited<ReturnType<typeof resourcesRepo.getFolderById>>;

export type ResourceTreeFile = {
  id: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
};

export type TopicResourceFile = {
  id: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
};

export type ResourceTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  scopeType: "global" | "school";
  schoolId: string | null;
  children: ResourceTreeNode[];
  files: ResourceTreeFile[];
};

function asScope(scopeType: string): "global" | "school" {
  return scopeType === "school" ? "school" : "global";
}

function sanitizeFileNameForPath(fileName: string): string {
  const extension = fileName.includes(".")
    ? fileName.substring(fileName.lastIndexOf("."))
    : "";
  const baseName = extension
    ? fileName.slice(0, fileName.length - extension.length)
    : fileName;
  const slug = createSlug(baseName).replace(/[^a-z0-9-_]/gi, "") || "file";
  return `${slug}${extension.toLowerCase()}`;
}

function buildFolderPath(folderId: string, folders: NonNullable<FolderRow>[]): string {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const slugs: string[] = [];
  let currentId: string | null = folderId;
  let safetyCounter = 0;

  while (currentId) {
    const folder = byId.get(currentId);
    if (!folder) {
      break;
    }

    slugs.push(folder.slug);
    currentId = folder.parentId;
    safetyCounter += 1;
    if (safetyCounter > 200) {
      throw new Error("Folder hierarchy is too deep or cyclic");
    }
  }

  return slugs.reverse().join("/");
}

async function canManageResourcesForUser(userId: string): Promise<boolean> {
  const scopedRoles = await getUserScopedRoles(userId);
  return RESOURCE_MANAGER_PLATFORM_KEYS.some((key) =>
    scopedRoles.platform.includes(key)
  );
}

async function canManageResources(ctx: ResourcesAuthContext): Promise<boolean> {
  return canManageResourcesForUser(ctx.userId);
}

async function assertCanManageResources(ctx: ResourcesAuthContext): Promise<void> {
  if (!(await canManageResources(ctx))) {
    throw new Error("Forbidden");
  }
}

async function assertCanReadSchoolResources(
  ctx: ResourcesAuthContext,
  schoolId: string
): Promise<void> {
  const canManage = await canManageResources(ctx);
  if (canManage) {
    return;
  }
  const hasAccess = await checkFeatureAccess(
    ctx.userId,
    "/school/resources",
    schoolId
  );
  if (!hasAccess) {
    throw new Error("Forbidden");
  }
}

function assertScopeConsistency(
  scopeType: "global" | "school",
  schoolId: string | null
) {
  if (scopeType === "global" && schoolId) {
    throw new Error("Global scope cannot include schoolId");
  }
  if (scopeType === "school" && !schoolId) {
    throw new Error("School scope requires schoolId");
  }
}

function assertFolderMatchesScope(
  folder: NonNullable<FolderRow>,
  scopeType: "global" | "school",
  schoolId: string | null
) {
  if (folder.scopeType !== scopeType) {
    throw new Error("Parent folder scope does not match");
  }
  if ((folder.schoolId ?? null) !== schoolId) {
    throw new Error("Parent folder school scope does not match");
  }
}

function folderDeletePayload(
  rootFolderId: string,
  allFoldersInScope: NonNullable<FolderRow>[]
) {
  const childrenByParent = new Map<string, string[]>();
  for (const folder of allFoldersInScope) {
    if (!folder.parentId) continue;
    const existing = childrenByParent.get(folder.parentId) ?? [];
    existing.push(folder.id);
    childrenByParent.set(folder.parentId, existing);
  }

  const toVisit = [rootFolderId];
  const collected: string[] = [];
  while (toVisit.length > 0) {
    const current = toVisit.pop() as string;
    collected.push(current);
    const children = childrenByParent.get(current) ?? [];
    toVisit.push(...children);
  }

  return collected;
}

export const resourcesService = {
  async listTree(ctx: ResourcesAuthContext, query: unknown) {
    const { schoolId } = listResourceTreeSchema.parse(query);
    if (schoolId) {
      await assertCanReadSchoolResources(ctx, schoolId);
    } else {
      const effectiveManage = await canManageResources(ctx);
      const actorManage = await canManageResourcesForUser(ctx.actorUserId);
      if (!effectiveManage && !actorManage) {
        throw new Error("Forbidden");
      }
    }

    const [folders, files, canManage] = await Promise.all([
      schoolId
        ? resourcesRepo.listFoldersForSchool(schoolId)
        : resourcesRepo.listFoldersByScope("global"),
      schoolId
        ? resourcesRepo.listFilesForSchool(schoolId)
        : resourcesRepo.listFilesByScope("global"),
      canManageResources(ctx),
    ]);

    const nodesById = new Map<string, ResourceTreeNode>();
    for (const folder of folders) {
      nodesById.set(folder.id, {
        id: folder.id,
        parentId: folder.parentId,
        name: folder.name,
        slug: folder.slug,
        description: folder.description,
        scopeType: asScope(folder.scopeType),
        schoolId: folder.schoolId,
        children: [],
        files: [],
      });
    }

    for (const file of files) {
      const folderNode = nodesById.get(file.folderId);
      if (!folderNode) continue;
      folderNode.files.push({
        id: file.id,
        displayName: file.displayName,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        createdAt: file.createdAt ?? new Date().toISOString(),
      });
    }

    const roots: ResourceTreeNode[] = [];
    for (const folder of nodesById.values()) {
      if (folder.parentId && nodesById.has(folder.parentId)) {
        nodesById.get(folder.parentId)?.children.push(folder);
      } else {
        roots.push(folder);
      }
    }

    const sortNode = (node: ResourceTreeNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      node.files.sort((a, b) => a.displayName.localeCompare(b.displayName));
      node.children.forEach(sortNode);
    };
    roots.sort((a, b) => a.name.localeCompare(b.name));
    roots.forEach(sortNode);

    return { canManage, roots };
  },

  async createFolder(ctx: ResourcesAuthContext, payload: unknown) {
    await assertCanManageResources(ctx);
    const parsed: CreateResourceFolderParams =
      createResourceFolderSchema.parse(payload);

    const scopeType = parsed.scopeType;
    const schoolId = parsed.schoolId ?? null;
    assertScopeConsistency(scopeType, schoolId);

    if (parsed.parentId) {
      const parent = await resourcesRepo.getFolderById(parsed.parentId);
      if (!parent) throw new Error("Parent folder not found");
      assertFolderMatchesScope(parent, scopeType, schoolId);
    }

    const slug = createSlug(parsed.name) || "folder";
    const [created] = await resourcesRepo.createFolder({
      name: parsed.name,
      slug,
      description: parsed.description ?? null,
      parentId: parsed.parentId ?? null,
      scopeType,
      schoolId,
      createdBy: ctx.actorUserId,
    });

    return created;
  },

  async renameFolder(ctx: ResourcesAuthContext, folderId: string, payload: unknown) {
    await assertCanManageResources(ctx);
    const { name } = renameResourceFolderSchema.parse(payload);

    const existing = await resourcesRepo.getFolderById(folderId);
    if (!existing) {
      throw new Error("Folder not found");
    }

    const [updated] = await resourcesRepo.updateFolder(folderId, {
      name,
      slug: createSlug(name) || "folder",
      updatedAt: new Date().toISOString(),
    });

    return updated;
  },

  async deleteFolder(ctx: ResourcesAuthContext, folderId: string) {
    await assertCanManageResources(ctx);

    const folder = await resourcesRepo.getFolderById(folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const scopeType = asScope(folder.scopeType);
    const allScopeFolders = await resourcesRepo.listFoldersByScope(
      scopeType,
      folder.schoolId ?? undefined
    );
    const descendantFolderIds = folderDeletePayload(folder.id, allScopeFolders);
    const filesToDelete = await resourcesRepo.listFilesByFolderIds(
      descendantFolderIds
    );
    const storagePaths = filesToDelete
      .map((file) => file.storagePath)
      .filter((path): path is string => !!path);

    await db.transaction(async (tx) => {
      await resourcesRepo.deleteFolderById(folder.id, tx);
    });

    if (storagePaths.length > 0) {
      const supabase = await createServerClient();
      // Supabase remove supports multiple paths; chunk to keep payload size modest.
      const CHUNK_SIZE = 100;
      for (let i = 0; i < storagePaths.length; i += CHUNK_SIZE) {
        const chunk = storagePaths.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.storage.from(BUCKET).remove(chunk);
        if (error) {
          console.warn("[resources] failed to remove storage chunk:", error.message);
        }
      }
    }

    return {
      success: true,
      deletedFolderCount: descendantFolderIds.length,
      deletedFileCount: storagePaths.length,
    };
  },

  async uploadFile(ctx: ResourcesAuthContext, formData: FormData) {
    await assertCanManageResources(ctx);
    const folderId = formData.get("folderId");
    const file = formData.get("file");

    const { folderId: parsedFolderId } = uploadResourceFileSchema.parse({
      folderId,
    });
    if (!(file instanceof File)) {
      throw new Error("File is required");
    }
    if (file.size <= 0) {
      throw new Error("File is empty");
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error("File exceeds 100 MB size limit");
    }

    const folder = await resourcesRepo.getFolderById(parsedFolderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const scopeType = asScope(folder.scopeType);
    const schoolId = folder.schoolId ?? null;
    const allFoldersInScope = await resourcesRepo.listFoldersByScope(
      scopeType,
      schoolId ?? undefined
    );
    const folderPath = buildFolderPath(folder.id, allFoldersInScope);

    const [created] = await resourcesRepo.createFile({
      folderId: folder.id,
      displayName: file.name,
      storagePath: "__pending__",
      mimeType: file.type || null,
      sizeBytes: file.size,
      scopeType,
      schoolId,
      uploadedBy: ctx.actorUserId,
    });

    const prefix =
      scopeType === "global" ? "resources/global" : `resources/schools/${schoolId}`;
    const safeFileName = sanitizeFileNameForPath(file.name);
    const storagePath = `${prefix}/${folderPath}/${created.id}-${safeFileName}`;

    try {
      const supabase = await createServerClient();
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      const [updated] = await resourcesRepo.updateFile(created.id, {
        storagePath,
        mimeType: file.type || null,
        sizeBytes: file.size,
        updatedAt: new Date().toISOString(),
      });

      return updated;
    } catch (error) {
      await resourcesRepo.deleteFileById(created.id);
      throw error;
    }
  },

  async renameFile(ctx: ResourcesAuthContext, fileId: string, payload: unknown) {
    await assertCanManageResources(ctx);
    const { displayName } = renameResourceFileSchema.parse(payload);

    const file = await resourcesRepo.getFileById(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const [updated] = await resourcesRepo.updateFile(fileId, {
      displayName,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  },

  async deleteFile(ctx: ResourcesAuthContext, fileId: string) {
    await assertCanManageResources(ctx);
    const file = await resourcesRepo.getFileById(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    await resourcesRepo.deleteFileById(fileId);

    if (file.storagePath) {
      const supabase = await createServerClient();
      const { error } = await supabase.storage.from(BUCKET).remove([file.storagePath]);
      if (error) {
        console.warn(
          `[resources] failed to delete storage file ${file.storagePath}: ${error.message}`
        );
      }
    }

    return { success: true };
  },

  async listTopicFiles(ctx: ResourcesAuthContext, query: unknown) {
    const { topicId, schoolId }: ListTopicResourceFilesParams =
      listTopicResourceFilesSchema.parse(query);
    await assertCanReadSchoolResources(ctx, schoolId);

    const topic = await resourcesRepo.getTopicById(topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    const files = await resourcesRepo.listFilesMappedToTopic(topicId, schoolId);
    return files.map<TopicResourceFile>((file) => ({
      id: file.id,
      displayName: file.displayName,
      mimeType: file.mimeType,
      sizeBytes: Number(file.sizeBytes),
      createdAt: file.createdAt ?? new Date().toISOString(),
    }));
  },

  async listFileTopics(ctx: ResourcesAuthContext, fileId: string) {
    await assertCanManageResources(ctx);
    const file = await resourcesRepo.getFileById(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    return resourcesRepo.listTopicsForFile(fileId);
  },

  async assignFileTopic(ctx: ResourcesAuthContext, fileId: string, payload: unknown) {
    await assertCanManageResources(ctx);
    const { topicId }: AssignResourceFileTopicParams =
      assignResourceFileTopicSchema.parse(payload);

    const [file, topic] = await Promise.all([
      resourcesRepo.getFileById(fileId),
      resourcesRepo.getTopicById(topicId),
    ]);
    if (!file) {
      throw new Error("File not found");
    }
    if (!topic) {
      throw new Error("Topic not found");
    }

    await resourcesRepo.addFileTopic({
      fileId,
      topicId,
      createdBy: ctx.actorUserId,
    });

    return { success: true };
  },

  async removeFileTopic(ctx: ResourcesAuthContext, fileId: string, topicId: string) {
    await assertCanManageResources(ctx);
    const [file, topic] = await Promise.all([
      resourcesRepo.getFileById(fileId),
      resourcesRepo.getTopicById(topicId),
    ]);
    if (!file) {
      throw new Error("File not found");
    }
    if (!topic) {
      throw new Error("Topic not found");
    }

    await resourcesRepo.removeFileTopic(fileId, topicId);
    return { success: true };
  },

  async getDownloadUrl(ctx: ResourcesAuthContext, fileId: string) {
    const file = await resourcesRepo.getFileById(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    if (file.scopeType === "school") {
      if (!file.schoolId) {
        throw new Error("File scope is invalid");
      }
      await assertCanReadSchoolResources(ctx, file.schoolId);
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.storagePath, 3600);

    if (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }

    return {
      url: toStorageUrl(data.signedUrl) ?? data.signedUrl,
      fileName: file.displayName,
    };
  },
};
