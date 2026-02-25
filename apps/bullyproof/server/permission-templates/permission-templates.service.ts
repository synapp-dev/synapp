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
};
