import { permissionTemplatesRepo } from "./permission-templates.repo";
import { featuresRepo } from "@/server/features/features.repo";

type AuthContext = {
  userId: string | null;
};

type PermissionTemplateRuleInput = {
  featureKey: string;
  level: "school" | "school_role";
  roleKey?: string;
  enabled?: boolean;
  visible?: boolean | null;
};

export type ActivationTemplateKey =
  | "school-locked"
  | "school-certification-enabled"
  | "school-lessons-enabled";

type ActivationTemplateDefinition = {
  key: ActivationTemplateKey;
  name: string;
  description: string;
  rules: PermissionTemplateRuleInput[];
};

const ADMIN_FEATURES_KEY = "/admin/features";
const SCHOOL_ROLE_KEYS = ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"] as const;
const ACTIVATION_FEATURE_KEYS = [
  "/courses",
  "/school/home",
  "/school/teachers",
  "/school/classes",
  "/school/lessons",
  "/school/resources",
] as const;

function buildSchoolRules(
  featureKeys: readonly string[],
  enabled: boolean,
  visible: boolean
): PermissionTemplateRuleInput[] {
  return featureKeys.map((featureKey) => ({
    featureKey,
    level: "school",
    enabled,
    visible,
  }));
}

function buildRoleRules(
  roleKey: (typeof SCHOOL_ROLE_KEYS)[number],
  featureKeys: readonly string[],
  enabled: boolean,
  visible: boolean
): PermissionTemplateRuleInput[] {
  return featureKeys.map((featureKey) => ({
    featureKey,
    level: "school_role",
    roleKey,
    enabled,
    visible,
  }));
}

const ACTIVATION_TEMPLATE_DEFINITIONS: ActivationTemplateDefinition[] = [
  {
    key: "school-locked",
    name: "school-locked",
    description:
      "Activation stage: school locked. AP certification and school navigation are hidden for all school roles.",
    rules: [
      ...buildSchoolRules(ACTIVATION_FEATURE_KEYS, false, false),
      ...buildRoleRules("TEACHER", ACTIVATION_FEATURE_KEYS, false, false),
      ...buildRoleRules("SCHOOL_ADMIN", ACTIVATION_FEATURE_KEYS, false, false),
      ...buildRoleRules("SCHOOL_STAFF", ACTIVATION_FEATURE_KEYS, false, false),
    ],
  },
  {
    key: "school-certification-enabled",
    name: "school-certification-enabled",
    description:
      "Activation stage: certification enabled. AP certification and core school navigation are enabled; lessons remain visible but locked for non-teachers.",
    rules: [
      // Baseline school-level behavior
      ...buildSchoolRules(["/courses", "/school/home", "/school/teachers", "/school/classes", "/school/resources"], true, true),
      ...buildSchoolRules(["/school/lessons"], false, true),
      // Teacher gets lessons access
      ...buildRoleRules("TEACHER", ["/school/lessons"], true, true),
      // Staff/admin keep lessons visible but disabled
      ...buildRoleRules("SCHOOL_ADMIN", ["/school/lessons"], false, true),
      ...buildRoleRules("SCHOOL_STAFF", ["/school/lessons"], false, true),
    ],
  },
  {
    key: "school-lessons-enabled",
    name: "school-lessons-enabled",
    description:
      "Activation stage: lessons enabled. AP certification and school navigation are enabled for all school roles.",
    rules: [
      ...buildSchoolRules(ACTIVATION_FEATURE_KEYS, true, true),
      ...buildRoleRules("TEACHER", ACTIVATION_FEATURE_KEYS, true, true),
      ...buildRoleRules("SCHOOL_ADMIN", ACTIVATION_FEATURE_KEYS, true, true),
      ...buildRoleRules("SCHOOL_STAFF", ACTIVATION_FEATURE_KEYS, true, true),
    ],
  },
];

async function assertCanManageFeatures(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const { checkFeatureAccess } = await import("@/server/features/features.service");
  const canManage = await checkFeatureAccess(ctx.userId, ADMIN_FEATURES_KEY);
  if (!canManage) {
    throw new Error("Unauthorized to manage permission templates");
  }
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
      description?: string;
      rules?: PermissionTemplateRuleInput[];
    }
  ) {
    await assertCanManageFeatures(ctx);
    const [template] = await permissionTemplatesRepo.create({
      name: data.name,
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
      description?: string | null;
      rules?: PermissionTemplateRuleInput[];
    }
  ) {
    await assertCanManageFeatures(ctx);
    if (data.name !== undefined || data.description !== undefined) {
      await permissionTemplatesRepo.update(id, {
        name: data.name,
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

  async ensureActivationTemplates(ctx: AuthContext) {
    await assertCanManageFeatures(ctx);

    const missingFeatureKeys: string[] = [];
    for (const featureKey of ACTIVATION_FEATURE_KEYS) {
      const [feature] = await permissionTemplatesRepo.getFeatureByKey(featureKey);
      if (!feature) {
        missingFeatureKeys.push(featureKey);
      }
    }
    if (missingFeatureKeys.length > 0) {
      throw new Error(
        `Missing activation features: ${missingFeatureKeys.join(", ")}`
      );
    }

    for (const roleKey of SCHOOL_ROLE_KEYS) {
      const [role] = await permissionTemplatesRepo.getRoleByKey(roleKey);
      if (!role) {
        throw new Error(`Missing school role: ${roleKey}`);
      }
    }

    const resolved: Array<{
      key: ActivationTemplateKey;
      templateId: string;
      name: string;
      description: string | null;
      ruleCount: number;
    }> = [];

    for (const definition of ACTIVATION_TEMPLATE_DEFINITIONS) {
      const [existing] = await permissionTemplatesRepo.getByName(definition.name);
      let templateId = existing?.id;
      if (!templateId) {
        const [created] = await permissionTemplatesRepo.create({
          name: definition.name,
          description: definition.description,
          createdBy: ctx.userId ?? undefined,
        });
        if (!created) {
          throw new Error(`Failed to create activation template: ${definition.key}`);
        }
        templateId = created.id;
      } else {
        await permissionTemplatesRepo.update(templateId, {
          description: definition.description,
        });
      }

      await permissionTemplatesRepo.setRules(templateId, definition.rules);
      resolved.push({
        key: definition.key,
        templateId,
        name: definition.name,
        description: definition.description,
        ruleCount: definition.rules.length,
      });
    }

    return resolved;
  },

  async listActivationTemplates(ctx: AuthContext) {
    const ensured = await permissionTemplatesService.ensureActivationTemplates(ctx);
    return ensured;
  },

  async applyActivationStage(
    ctx: AuthContext,
    activationKey: ActivationTemplateKey,
    schoolId: string
  ) {
    const ensured = await permissionTemplatesService.ensureActivationTemplates(ctx);
    const match = ensured.find((template) => template.key === activationKey);
    if (!match) {
      throw new Error(`Unknown activation stage: ${activationKey}`);
    }
    const result = await permissionTemplatesService.applyToSchools(
      ctx,
      match.templateId,
      [schoolId]
    );
    return {
      ...result,
      activationKey,
      templateId: match.templateId,
      templateName: match.name,
    };
  },
};
