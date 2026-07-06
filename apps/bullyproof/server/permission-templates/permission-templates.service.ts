import { permissionTemplatesRepo } from "./permission-templates.repo";
import { featuresRepo } from "@/server/features/features.repo";

type AuthContext = {
  userId: string | null;
};

type PermissionTemplateRuleInput = {
  featureKey: string;
  level: "school" | "school_role" | "role";
  roleKey?: string;
  enabled?: boolean;
  visible?: boolean | null;
};

const ADMIN_FEATURES_KEY = "/admin/features";
const ADMIN_SCHOOL_ACTIVATION_KEY = "admin:school-activation";

async function assertCanAccessFeature(
  ctx: AuthContext,
  featureKey: string,
  unauthorizedMessage: string
) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const { checkFeatureAccess } = await import("@/server/features/features.service");
  const canAccess = await checkFeatureAccess(ctx.userId, featureKey);
  if (!canAccess) {
    throw new Error(unauthorizedMessage);
  }
}

async function assertCanManageFeatures(ctx: AuthContext) {
  return assertCanAccessFeature(
    ctx,
    ADMIN_FEATURES_KEY,
    "Unauthorized to manage permission templates"
  );
}

async function assertCanManageSchoolActivation(ctx: AuthContext) {
  return assertCanAccessFeature(
    ctx,
    ADMIN_SCHOOL_ACTIVATION_KEY,
    "Unauthorized to access school activation"
  );
}

export const permissionTemplatesService = {
  async list(ctx: AuthContext) {
    await assertCanManageFeatures(ctx);
    return permissionTemplatesRepo.getAll();
  },

  async getById(ctx: AuthContext, id: string) {
    await assertCanManageFeatures(ctx);
    return permissionTemplatesRepo.getWithRules(id);
  },

  async create(
    ctx: AuthContext,
    data: {
      name: string;
      scope?: "school" | "platform_role";
      description?: string;
      rules?: PermissionTemplateRuleInput[];
    }
  ) {
    await assertCanManageFeatures(ctx);
    const [template] = await permissionTemplatesRepo.create({
      name: data.name,
      scope: data.scope ?? "school",
      description: data.description,
      createdBy: ctx.userId ?? undefined,
    });
    if (!template) throw new Error("Failed to create template");
    if (data.rules && data.rules.length > 0) {
      await permissionTemplatesRepo.setRules(template.id, data.rules);
    }
    return permissionTemplatesRepo.getWithRules(template.id);
  },

  async update(
    ctx: AuthContext,
    id: string,
    data: {
      name?: string;
      scope?: "school" | "platform_role";
      description?: string | null;
      rules?: PermissionTemplateRuleInput[];
    }
  ) {
    await assertCanManageFeatures(ctx);
    if (
      data.name !== undefined ||
      data.scope !== undefined ||
      data.description !== undefined
    ) {
      await permissionTemplatesRepo.update(id, {
        name: data.name,
        scope: data.scope,
        description: data.description,
      });
    }
    if (data.rules !== undefined) {
      await permissionTemplatesRepo.setRules(id, data.rules);
    }
    return permissionTemplatesRepo.getWithRules(id);
  },

  async delete(ctx: AuthContext, id: string) {
    await assertCanManageFeatures(ctx);
    await permissionTemplatesRepo.delete(id);
  },

  async applyToSchools(
    ctx: AuthContext,
    templateId: string,
    schoolIds: string[]
  ) {
    await assertCanManageFeatures(ctx);
    if (!ctx.userId) throw new Error("Unauthorized");

    const template = await permissionTemplatesRepo.getWithRules(templateId);
    if (!template) throw new Error("Template not found");
    if (template.scope !== "school") {
      throw new Error("Template is not a school template");
    }
    if (!template.rules || template.rules.length === 0) {
      throw new Error("Template has no rules");
    }

    for (const schoolId of schoolIds) {
      // Replace mode: wipe school-scoped permissions before applying this template.
      await featuresRepo.clearSchoolScopedPermissions(schoolId);

      for (const rule of template.rules) {
        const [feature] = await permissionTemplatesRepo.getFeatureByKey(
          rule.featureKey
        );
        if (!feature) continue;

        if (rule.level === "school") {
          await featuresRepo.setPermission({
            featureId: feature.id,
            level: "school",
            targetId: schoolId,
            enabled: rule.enabled,
            visible: rule.visible ?? rule.enabled,
            createdBy: ctx.userId,
          });
        } else if (rule.level === "school_role" && rule.roleKey) {
          const [role] = await permissionTemplatesRepo.getRoleByKey(rule.roleKey);
          if (!role) continue;
          await featuresRepo.setPermission({
            featureId: feature.id,
            level: "school_role",
            targetId: role.id,
            schoolId,
            enabled: rule.enabled,
            visible: rule.visible ?? rule.enabled,
            createdBy: ctx.userId,
          });
        }
      }
    }

    return { applied: schoolIds.length };
  },

  async revokeFromSchools(
    ctx: AuthContext,
    templateId: string,
    schoolIds: string[]
  ) {
    await assertCanManageFeatures(ctx);

    const template = await permissionTemplatesRepo.getWithRules(templateId);
    if (!template) throw new Error("Template not found");
    if (template.scope !== "school") {
      throw new Error("Template is not a school template");
    }
    if (!template.rules || template.rules.length === 0) {
      throw new Error("Template has no rules");
    }

    for (const schoolId of schoolIds) {
      for (const rule of template.rules) {
        const [feature] = await permissionTemplatesRepo.getFeatureByKey(
          rule.featureKey
        );
        if (!feature) continue;

        if (rule.level === "school") {
          await featuresRepo.removePermission(
            feature.id,
            "school",
            schoolId
          );
        } else if (rule.level === "school_role" && rule.roleKey) {
          const [role] = await permissionTemplatesRepo.getRoleByKey(rule.roleKey);
          if (!role) continue;
          await featuresRepo.removePermission(
            feature.id,
            "school_role",
            role.id,
            schoolId
          );
        }
      }
    }

    return { revoked: schoolIds.length };
  },

  async applyToPlatformRoles(
    ctx: AuthContext,
    templateId: string,
    roleIds: string[]
  ) {
    await assertCanManageFeatures(ctx);
    if (!ctx.userId) throw new Error("Unauthorized");

    const template = await permissionTemplatesRepo.getWithRules(templateId);
    if (!template) throw new Error("Template not found");
    if (template.scope !== "platform_role") {
      throw new Error("Template is not a platform role template");
    }
    if (!template.rules || template.rules.length === 0) {
      throw new Error("Template has no rules");
    }

    for (const roleId of roleIds) {
      // Replace mode: wipe role-scoped permissions before applying this template.
      await featuresRepo.clearRoleScopedPermissions(roleId);

      for (const rule of template.rules) {
        if (rule.level !== "role") continue;
        const [feature] = await permissionTemplatesRepo.getFeatureByKey(
          rule.featureKey
        );
        if (!feature) continue;

        await featuresRepo.setPermission({
          featureId: feature.id,
          level: "role",
          targetId: roleId,
          enabled: rule.enabled,
          visible: rule.visible ?? rule.enabled,
          createdBy: ctx.userId,
        });
      }
    }

    return { applied: roleIds.length };
  },

  async revokeFromPlatformRoles(
    ctx: AuthContext,
    templateId: string,
    roleIds: string[]
  ) {
    await assertCanManageFeatures(ctx);

    const template = await permissionTemplatesRepo.getWithRules(templateId);
    if (!template) throw new Error("Template not found");
    if (template.scope !== "platform_role") {
      throw new Error("Template is not a platform role template");
    }
    if (!template.rules || template.rules.length === 0) {
      throw new Error("Template has no rules");
    }

    for (const roleId of roleIds) {
      for (const rule of template.rules) {
        if (rule.level !== "role") continue;
        const [feature] = await permissionTemplatesRepo.getFeatureByKey(
          rule.featureKey
        );
        if (!feature) continue;

        await featuresRepo.removePermission(feature.id, "role", roleId);
      }
    }

    return { revoked: roleIds.length };
  },

  async listActivationTemplates(ctx: AuthContext) {
    await assertCanManageSchoolActivation(ctx);
    const templates = await permissionTemplatesRepo.getByScope("school");
    const templatesWithRules = await Promise.all(
      templates.map((template) => permissionTemplatesRepo.getWithRules(template.id))
    );
    return templatesWithRules.filter((template) => template !== null);
  },

  async applyActivationTemplate(
    ctx: AuthContext,
    templateId: string,
    schoolId: string
  ) {
    await assertCanManageSchoolActivation(ctx);
    if (!ctx.userId) throw new Error("Unauthorized");
    const template = await permissionTemplatesRepo.getWithRules(templateId);
    if (!template) throw new Error("Template not found");
    if (template.scope !== "school") {
      throw new Error("Template is not a school template");
    }
    if (!template.rules || template.rules.length === 0) {
      throw new Error("Template has no rules");
    }

    const featureIds = new Map<string, string>();
    const roleIds = new Map<string, string>();
    for (const rule of template.rules) {
      if (!featureIds.has(rule.featureKey)) {
        const [feature] = await permissionTemplatesRepo.getFeatureByKey(
          rule.featureKey
        );
        if (feature) featureIds.set(rule.featureKey, feature.id);
      }
      if (rule.level === "school_role" && rule.roleKey && !roleIds.has(rule.roleKey)) {
        const [role] = await permissionTemplatesRepo.getRoleByKey(rule.roleKey);
        if (role) roleIds.set(rule.roleKey, role.id);
      }
    }

    await featuresRepo.clearSchoolScopedPermissions(schoolId);
    for (const rule of template.rules) {
      const featureId = featureIds.get(rule.featureKey);
      if (!featureId) continue;

      if (rule.level === "school") {
        await featuresRepo.setPermission({
          featureId,
          level: "school",
          targetId: schoolId,
          enabled: rule.enabled,
          visible: rule.visible ?? rule.enabled,
          createdBy: ctx.userId,
        });
      } else if (rule.level === "school_role" && rule.roleKey) {
        const roleId = roleIds.get(rule.roleKey);
        if (!roleId) continue;
        await featuresRepo.setPermission({
          featureId,
          level: "school_role",
          targetId: roleId,
          schoolId,
          enabled: rule.enabled,
          visible: rule.visible ?? rule.enabled,
          createdBy: ctx.userId,
        });
      }
    }

    return {
      applied: 1,
      templateId: template.id,
      templateName: template.name,
    };
  },

  async getFullSchoolUnlockActiveBySchoolIds(schoolIds: string[]) {
    return this.getTemplateActiveBySchoolIds("full-school-unlock", schoolIds);
  },

  async getCertificationUnlockActiveBySchoolIds(schoolIds: string[]) {
    return this.getTemplateActiveBySchoolIds(
      "enable-courses-certification",
      schoolIds
    );
  },

  async getTemplateActiveBySchoolIds(templateKey: string, schoolIds: string[]) {
    const uniqueSchoolIds = [...new Set(schoolIds.filter(Boolean))];
    const statusBySchoolId: Record<string, boolean> = Object.fromEntries(
      uniqueSchoolIds.map((schoolId) => [schoolId, false])
    );

    if (uniqueSchoolIds.length === 0) {
      return statusBySchoolId;
    }

    const templateRows = await permissionTemplatesRepo.getByScopeAndTemplateKey(
      "school",
      templateKey
    );
    const template = templateRows[0];
    if (!template) {
      return statusBySchoolId;
    }

    return this.computeTemplateActiveBySchoolIds(template.id, uniqueSchoolIds);
  },

  /** Admin surface: per-school active status + count across all schools. */
  async getSchoolActiveStatus(ctx: AuthContext, templateId: string) {
    await assertCanManageFeatures(ctx);
    const [template] = await permissionTemplatesRepo.getById(templateId);
    if (!template) throw new Error("Template not found");
    if (template.scope !== "school") {
      return { statusBySchoolId: {} as Record<string, boolean>, activeCount: 0 };
    }
    const schoolRows = await permissionTemplatesRepo.getAllSchoolIds();
    const statusBySchoolId = await this.computeTemplateActiveBySchoolIds(
      templateId,
      schoolRows.map((row) => row.id)
    );
    const activeCount = Object.values(statusBySchoolId).filter(Boolean).length;
    return { statusBySchoolId, activeCount };
  },

  /** True per school when every rule in the template matches its live permissions. */
  async computeTemplateActiveBySchoolIds(templateId: string, schoolIds: string[]) {
    const uniqueSchoolIds = [...new Set(schoolIds.filter(Boolean))];
    const statusBySchoolId: Record<string, boolean> = Object.fromEntries(
      uniqueSchoolIds.map((schoolId) => [schoolId, false])
    );

    if (uniqueSchoolIds.length === 0) {
      return statusBySchoolId;
    }

    const templateWithRules = await permissionTemplatesRepo.getWithRules(templateId);
    const rules = templateWithRules?.rules ?? [];
    if (rules.length === 0) {
      return statusBySchoolId;
    }

    const featureIdByKey = new Map<string, string>();
    const roleIdByKey = new Map<string, string>();
    const roleKeys = new Set<string>();

    for (const rule of rules) {
      if (!featureIdByKey.has(rule.featureKey)) {
        const [feature] = await permissionTemplatesRepo.getFeatureByKey(
          rule.featureKey
        );
        if (feature) {
          featureIdByKey.set(rule.featureKey, feature.id);
        }
      }
      if (rule.level === "school_role" && rule.roleKey) {
        roleKeys.add(rule.roleKey);
      }
    }

    for (const roleKey of roleKeys) {
      const [role] = await permissionTemplatesRepo.getRoleByKey(roleKey);
      if (role) {
        roleIdByKey.set(roleKey, role.id);
      }
    }

    const featureIds = [...new Set(featureIdByKey.values())];
    const roleIds = [...new Set(roleIdByKey.values())];
    if (featureIds.length === 0) {
      return statusBySchoolId;
    }

    const permissions = await permissionTemplatesRepo.getSchoolTemplatePermissions({
      schoolIds: uniqueSchoolIds,
      featureIds,
      roleIds,
    });

    const schoolPermissionBySchoolAndFeature = new Map<string, { enabled: boolean; visible: boolean | null }>();
    const schoolRolePermissionBySchoolRoleAndFeature = new Map<
      string,
      { enabled: boolean; visible: boolean | null }
    >();

    for (const permission of permissions) {
      if (permission.level === "school" && permission.targetId) {
        schoolPermissionBySchoolAndFeature.set(
          `${permission.targetId}:${permission.featureId}`,
          { enabled: permission.enabled, visible: permission.visible }
        );
      } else if (
        permission.level === "school_role" &&
        permission.schoolId &&
        permission.targetId
      ) {
        schoolRolePermissionBySchoolRoleAndFeature.set(
          `${permission.schoolId}:${permission.targetId}:${permission.featureId}`,
          { enabled: permission.enabled, visible: permission.visible }
        );
      }
    }

    for (const schoolId of uniqueSchoolIds) {
      const isActive = rules.every((rule) => {
        const featureId = featureIdByKey.get(rule.featureKey);
        if (!featureId) return false;

        const permission =
          rule.level === "school"
            ? schoolPermissionBySchoolAndFeature.get(`${schoolId}:${featureId}`)
            : rule.level === "school_role" && rule.roleKey
              ? (() => {
                  const roleId = roleIdByKey.get(rule.roleKey);
                  if (!roleId) return undefined;
                  return schoolRolePermissionBySchoolRoleAndFeature.get(
                    `${schoolId}:${roleId}:${featureId}`
                  );
                })()
              : undefined;

        if (!permission) return false;

        const expectedVisible = rule.visible ?? rule.enabled;
        const actualVisible =
          permission.visible === null || permission.visible === undefined
            ? permission.enabled
            : permission.visible;

        return (
          permission.enabled === rule.enabled && actualVisible === expectedVisible
        );
      });

      statusBySchoolId[schoolId] = isActive;
    }

    return statusBySchoolId;
  },
};
