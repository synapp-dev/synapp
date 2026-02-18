import { db } from "@/server/db/drizzle";
import {
  permissionTemplates,
  permissionTemplateRules,
  features,
  roles,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export type PermissionTemplateRuleLevel = "school" | "school_role";

export type PermissionTemplateRule = {
  id: string;
  templateId: string;
  featureKey: string;
  level: PermissionTemplateRuleLevel;
  roleKey: string | null;
  enabled: boolean;
  visible: boolean | null;
};

export type PermissionTemplateRuleInput = {
  featureKey: string;
  level: PermissionTemplateRuleLevel;
  roleKey?: string | null;
  enabled?: boolean;
  visible?: boolean | null;
};

export type PermissionTemplate = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export const permissionTemplatesRepo = {
  getAll: () =>
    db.select().from(permissionTemplates).orderBy(permissionTemplates.name),

  getById: (id: string) =>
    db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.id, id))
      .limit(1),

  getByName: (name: string) =>
    db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.name, name))
      .limit(1),

  getWithRules: async (templateId: string) => {
    const templateRows = await db
      .select()
      .from(permissionTemplates)
      .where(eq(permissionTemplates.id, templateId))
      .limit(1);

    const template = templateRows[0];
    if (!template) return null;

    const rules = await db
      .select()
      .from(permissionTemplateRules)
      .where(eq(permissionTemplateRules.templateId, templateId));

    return { ...template, rules };
  },

  create: (data: {
    name: string;
    description?: string;
    createdBy?: string;
  }) =>
    db
      .insert(permissionTemplates)
      .values({
        name: data.name,
        description: data.description ?? null,
        createdBy: data.createdBy ?? null,
      })
      .returning(),

  update: (
    id: string,
    data: { name?: string; description?: string | null }
  ) =>
    db
      .update(permissionTemplates)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(permissionTemplates.id, id))
      .returning(),

  delete: (id: string) =>
    db.delete(permissionTemplates).where(eq(permissionTemplates.id, id)),

  addRule: (data: {
    templateId: string;
    featureKey: string;
    level: PermissionTemplateRuleLevel;
    roleKey?: string | null;
    enabled?: boolean;
    visible?: boolean | null;
  }) =>
    db
      .insert(permissionTemplateRules)
      .values({
        templateId: data.templateId,
        featureKey: data.featureKey,
        level: data.level,
        roleKey: data.level === "school_role" ? data.roleKey ?? null : null,
        enabled: data.enabled ?? true,
        visible: data.visible ?? null,
      })
      .returning(),

  deleteRule: (id: string) =>
    db
      .delete(permissionTemplateRules)
      .where(eq(permissionTemplateRules.id, id)),

  setRules: async (
    templateId: string,
    rules: PermissionTemplateRuleInput[]
  ) => {
    await db
      .delete(permissionTemplateRules)
      .where(eq(permissionTemplateRules.templateId, templateId));

    if (rules.length === 0) return [];

    return db
      .insert(permissionTemplateRules)
      .values(
        rules.map((r) => ({
          templateId,
          featureKey: r.featureKey,
          level: r.level,
          roleKey: r.level === "school_role" ? r.roleKey ?? null : null,
          enabled: r.enabled ?? true,
          visible: r.visible ?? null,
        }))
      )
      .returning();
  },

  getFeatureByKey: (key: string) =>
    db.select().from(features).where(eq(features.key, key)).limit(1),

  getRoleByKey: (key: string) =>
    db.select().from(roles).where(eq(roles.key, key)).limit(1),
};
