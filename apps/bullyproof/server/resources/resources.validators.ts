import { z } from "zod";

export const resourceScopeSchema = z.enum(["global", "school"]);

export const listResourceTreeSchema = z.object({
  schoolId: z.string().uuid().optional(),
});

export const createResourceFolderSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  parentId: z.string().uuid().nullable().optional(),
  scopeType: resourceScopeSchema,
  schoolId: z.string().uuid().nullable().optional(),
});

export const renameResourceFolderSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const uploadResourceFileSchema = z.object({
  folderId: z.string().uuid(),
});

export const renameResourceFileSchema = z.object({
  displayName: z.string().trim().min(1).max(255),
});

export const listTopicResourceFilesSchema = z.object({
  topicId: z.string().uuid(),
  schoolId: z.string().uuid(),
});

export const assignResourceFileTopicSchema = z.object({
  topicId: z.string().uuid(),
});

export type ResourceScope = z.infer<typeof resourceScopeSchema>;
export type ListResourceTreeParams = z.infer<typeof listResourceTreeSchema>;
export type CreateResourceFolderParams = z.infer<
  typeof createResourceFolderSchema
>;
export type RenameResourceFolderParams = z.infer<
  typeof renameResourceFolderSchema
>;
export type UploadResourceFileParams = z.infer<typeof uploadResourceFileSchema>;
export type RenameResourceFileParams = z.infer<typeof renameResourceFileSchema>;
export type ListTopicResourceFilesParams = z.infer<
  typeof listTopicResourceFilesSchema
>;
export type AssignResourceFileTopicParams = z.infer<
  typeof assignResourceFileTopicSchema
>;
