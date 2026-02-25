"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useRoles } from "@/entities/users/model/store";
import type { School } from "./schools-table-columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import { AlertCircle, Layers, Loader2 } from "lucide-react";

type Feature = {
  id: string;
  key: string;
};

type FeaturePermission = {
  featureId: string;
  level: "school" | "school_role";
  targetId: string | null;
  schoolId?: string | null;
  enabled: boolean;
  visible?: boolean | null;
};

type ActivationTemplateRule = {
  id: string;
  templateId: string;
  featureKey: string;
  level: "school" | "school_role" | "role";
  roleKey: string | null;
  enabled: boolean;
  visible: boolean | null;
};

type ActivationTemplate = {
  id: string;
  name: string;
  templateKey: string | null;
  description: string | null;
  scope: "school" | "platform_role";
  rules: ActivationTemplateRule[];
};

interface SchoolActivationTabProps {
  school: School;
}

const ACTIVATION_TEMPLATE_PRIORITY: Record<string, number> = {
  "school-locked": 0,
  "enable-courses-certification": 1,
  "school-certification-enabled": 1,
  "full-school-unlock": 2,
  "school-lessons-enabled": 2,
};

function toTemplateKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

export function SchoolActivationTab({ school }: SchoolActivationTabProps) {
  const queryClient = useQueryClient();
  const { roles } = useRoles();
  const [pendingTemplate, setPendingTemplate] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    hasAccess: canAccessActivation,
    isLoading: isLoadingActivationAccess,
  } = useFeatureAccess("admin:school-activation");

  const { data: features = [], isLoading: isLoadingFeatures } = useQuery<Feature[]>({
    queryKey: ["features", "activation"],
    queryFn: async () => {
      const result = await apiFetch<Feature[]>("/features");
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const featureIdByKey = useMemo(
    () => new Map(features.map((feature) => [feature.key, feature.id])),
    [features]
  );

  const roleIdByKey = useMemo(
    () => new Map(roles.map((role) => [role.key, role.id])),
    [roles]
  );

  const {
    data: activationTemplates = [],
    isLoading: isLoadingActivationTemplates,
    error: activationTemplatesError,
  } = useQuery<ActivationTemplate[]>({
    queryKey: ["activation-templates"],
    queryFn: async () => {
      const result = await apiFetch<{ templates: ActivationTemplate[] }>(
        "/permission-templates/activation"
      );
      if (result.error) throw new Error(result.error.message);
      return result.data?.templates ?? [];
    },
  });

  const templateRoleKeys = useMemo(() => {
    const roleKeys = new Set<string>();
    for (const template of activationTemplates) {
      for (const rule of template.rules ?? []) {
        if (rule.level === "school_role" && rule.roleKey) {
          roleKeys.add(rule.roleKey);
        }
      }
    }
    return [...roleKeys];
  }, [activationTemplates]);

  const sortedTemplates = useMemo(() => {
    return [...activationTemplates].sort((a, b) => {
      const keyA = a.templateKey ?? toTemplateKey(a.name);
      const keyB = b.templateKey ?? toTemplateKey(b.name);
      const priorityA =
        ACTIVATION_TEMPLATE_PRIORITY[keyA] ?? Number.MAX_SAFE_INTEGER;
      const priorityB =
        ACTIVATION_TEMPLATE_PRIORITY[keyB] ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return keyA.localeCompare(keyB);
    });
  }, [activationTemplates]);

  const { data: schoolPermissions = [], isLoading: isLoadingSchoolPermissions } =
    useQuery<FeaturePermission[]>({
      queryKey: ["activation-school-permissions", school.id],
      queryFn: async () => {
        const result = await apiFetch<FeaturePermission[]>(
          `/features/permissions?level=school&targetId=${school.id}`
        );
        if (result.error) throw new Error(result.error.message);
        return result.data ?? [];
      },
    });

  const {
    data: schoolRolePermissionsByRole = {},
    isLoading: isLoadingSchoolRolePermissions,
  } = useQuery<Record<string, FeaturePermission[]>>({
    queryKey: [
      "activation-school-role-permissions",
      school.id,
      templateRoleKeys.join(","),
      roleIdByKey.size,
    ],
    enabled: roleIdByKey.size > 0 && templateRoleKeys.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        templateRoleKeys
          .filter((roleKey) => roleIdByKey.has(roleKey))
          .map(async (roleKey) => {
            const roleId = roleIdByKey.get(roleKey)!;
            const result = await apiFetch<FeaturePermission[]>(
              `/features/permissions?level=school_role&targetId=${roleId}&schoolId=${school.id}`
            );
            if (result.error) throw new Error(result.error.message);
            return [roleKey, result.data ?? []] as const;
          })
      );
      return Object.fromEntries(entries);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const result = await apiFetch<{
        templateId: string;
        templateName: string;
      }>("/permission-templates/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.id, templateId }),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`Applied ${data?.templateName ?? "permission template"}`);
      queryClient.invalidateQueries({ queryKey: ["activation-templates"] });
      queryClient.invalidateQueries({
        queryKey: ["activation-school-permissions", school.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["activation-school-role-permissions", school.id],
      });
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to apply activation template");
    },
  });

  const templateActiveById = useMemo(() => {
    const result = new Map<string, boolean>();
    if (featureIdByKey.size === 0) return result;

    const schoolPermissionByFeatureId = new Map(
      schoolPermissions.map((permission) => [permission.featureId, permission])
    );
    const rolePermissionByRoleAndFeatureId = new Map<string, FeaturePermission>();
    for (const [roleKey, permissions] of Object.entries(
      schoolRolePermissionsByRole
    )) {
      for (const permission of permissions) {
        rolePermissionByRoleAndFeatureId.set(
          `${roleKey}:${permission.featureId}`,
          permission
        );
      }
    }

    const doesRuleMatch = (rule: ActivationTemplateRule) => {
      const featureId = featureIdByKey.get(rule.featureKey);
      if (!featureId) return false;

      const permission =
        rule.level === "school"
          ? schoolPermissionByFeatureId.get(featureId)
          : rule.level === "school_role" && rule.roleKey
            ? rolePermissionByRoleAndFeatureId.get(`${rule.roleKey}:${featureId}`)
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
    };

    for (const template of activationTemplates) {
      if (!template.rules || template.rules.length === 0) {
        result.set(template.id, false);
        continue;
      }
      result.set(template.id, template.rules.every(doesRuleMatch));
    }

    return result;
  }, [
    activationTemplates,
    featureIdByKey,
    schoolPermissions,
    schoolRolePermissionsByRole,
  ]);

  const isLoading =
    isLoadingActivationAccess ||
    isLoadingFeatures ||
    isLoadingActivationTemplates ||
    isLoadingSchoolPermissions ||
    isLoadingSchoolRolePermissions;

  if (!isLoadingActivationAccess && !canAccessActivation) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Activation unavailable</AlertTitle>
        <AlertDescription>
          You do not have permission to use school activation templates.
        </AlertDescription>
      </Alert>
    );
  }

  if (activationTemplatesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Activation unavailable</AlertTitle>
        <AlertDescription>
          {activationTemplatesError instanceof Error
            ? activationTemplatesError.message
            : "Failed to load activation templates"}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const handleConfirmApply = () => {
    if (!pendingTemplate) return;
    applyMutation.mutate(pendingTemplate.id);
    setPendingTemplate(null);
  };

  return (
    <div className="space-y-6 pb-6">
      <Card>
        <CardHeader>
          <CardTitle>Activation</CardTitle>
          <CardDescription>
            Apply school permission templates. A template is marked as active when all
            of its rules match this school&apos;s current permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedTemplates.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No school templates found</AlertTitle>
              <AlertDescription>
                Create school-scoped permission templates in Admin Features.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedTemplates.map((template) => {
                const isActive = templateActiveById.get(template.id) ?? false;
                const isPending =
                  applyMutation.isPending && applyMutation.variables === template.id;
                const templateKey = template.templateKey ?? toTemplateKey(template.name);
                const displayName = toTitleCase(template.name);

                return (
                  <Card
                    key={template.id}
                    className={`h-full flex flex-col ${
                      isActive
                        ? "border-green-500 bg-green-50/40 dark:bg-green-950/20"
                        : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {displayName}
                      </CardTitle>
                      <CardDescription>
                        {template.description || "No description"}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground font-mono">
                        {templateKey}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1" />
                    <CardFooter className="border-t flex flex-col items-stretch gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Rules: {template.rules?.length ?? 0}
                        </span>
                        {isActive ? (
                          <Badge variant="secondary">Template active</Badge>
                        ) : (
                          <Badge variant="outline">Not active</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className={`w-full ${
                          isActive
                            ? "bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90"
                            : ""
                        }`}
                        variant={isActive ? "outline" : "default"}
                        onClick={() =>
                          setPendingTemplate({ id: template.id, name: template.name })
                        }
                        disabled={applyMutation.isPending}
                        data-template-id={template.id}
                      >
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {isActive ? "Re-apply template" : "Apply template"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pendingTemplate !== null}
        onOpenChange={(open) => {
          if (!open && !applyMutation.isPending) {
            setPendingTemplate(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply template</DialogTitle>
            <DialogDescription>
              {pendingTemplate
                ? `You're about to apply the ${toTitleCase(
                    pendingTemplate.name
                  )} template to ${school.name}.`
                : "You're about to apply a template."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingTemplate(null)}
              disabled={applyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApply}
              disabled={applyMutation.isPending || !pendingTemplate}
            >
              {applyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
