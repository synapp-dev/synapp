"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { useRoles } from "@/entities/users/model/store";
import type { School } from "./schools-table-columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import {
  AlertCircle,
  BadgeCheck,
  FileLock2,
  Loader2,
  Lock,
  Presentation,
} from "lucide-react";

type ActivationStageKey =
  | "school-locked"
  | "school-certification-enabled"
  | "school-lessons-enabled";

type ActivationTemplateSummary = {
  key: ActivationStageKey;
  templateId: string;
  name: string;
  description: string | null;
  ruleCount: number;
};

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

interface SchoolActivationTabProps {
  school: School;
}

const ACTIVATION_FEATURE_KEYS = [
  "/courses",
  "/school/home",
  "/school/teachers",
  "/school/classes",
  "/school/lessons",
  "/school/resources",
] as const;

const STAGE_ORDER: ActivationStageKey[] = [
  "school-locked",
  "school-certification-enabled",
  "school-lessons-enabled",
];

const STAGE_META: Record<
  ActivationStageKey,
  {
    title: string;
    description: string;
    icon: typeof Lock;
  }
> = {
  "school-locked": {
    title: "Fully locked",
    description:
      "Users can access dashboard, but AP Certification and school navigation are locked.",
    icon: Lock,
  },
  "school-certification-enabled": {
    title: "Certification access",
    description:
      "AP Certification and core school navigation are enabled, while lessons stay role-limited.",
    icon: BadgeCheck,
  },
  "school-lessons-enabled": {
    title: "Lessons and Resource access",
    description:
      "AP Certification plus school lessons/resources and school navigation are enabled.",
    icon: Presentation,
  },
};

type StageExpectation = {
  level: "school" | "school_role";
  roleKey?: "TEACHER" | "SCHOOL_ADMIN" | "SCHOOL_STAFF";
  featureKey: string;
  enabled: boolean;
  visible: boolean;
};

function buildExpectations(stage: ActivationStageKey): StageExpectation[] {
  if (stage === "school-locked") {
    const result: StageExpectation[] = ACTIVATION_FEATURE_KEYS.map((featureKey) => ({
      level: "school",
      featureKey,
      enabled: false,
      visible: false,
    }));
    for (const roleKey of ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"] as const) {
      for (const featureKey of ACTIVATION_FEATURE_KEYS) {
        result.push({
          level: "school_role",
          roleKey,
          featureKey,
          enabled: false,
          visible: false,
        });
      }
    }
    return result;
  }

  if (stage === "school-certification-enabled") {
    const baselineEnabled = [
      "/courses",
      "/school/home",
      "/school/teachers",
      "/school/classes",
      "/school/resources",
    ];
    return [
      ...baselineEnabled.map((featureKey) => ({
        level: "school" as const,
        featureKey,
        enabled: true,
        visible: true,
      })),
      {
        level: "school" as const,
        featureKey: "/school/lessons",
        enabled: false,
        visible: true,
      },
      {
        level: "school_role" as const,
        roleKey: "TEACHER" as const,
        featureKey: "/school/lessons",
        enabled: true,
        visible: true,
      },
      {
        level: "school_role" as const,
        roleKey: "SCHOOL_ADMIN" as const,
        featureKey: "/school/lessons",
        enabled: false,
        visible: true,
      },
      {
        level: "school_role" as const,
        roleKey: "SCHOOL_STAFF" as const,
        featureKey: "/school/lessons",
        enabled: false,
        visible: true,
      },
    ];
  }

  const result: StageExpectation[] = ACTIVATION_FEATURE_KEYS.map((featureKey) => ({
    level: "school",
    featureKey,
    enabled: true,
    visible: true,
  }));
  for (const roleKey of ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"] as const) {
    for (const featureKey of ACTIVATION_FEATURE_KEYS) {
      result.push({
        level: "school_role",
        roleKey,
        featureKey,
        enabled: true,
        visible: true,
      });
    }
  }
  return result;
}

export function SchoolActivationTab({ school }: SchoolActivationTabProps) {
  const queryClient = useQueryClient();
  const { roles } = useRoles();

  const { data: features = [], isLoading: isLoadingFeatures } = useQuery<Feature[]>({
    queryKey: ["features", "activation"],
    queryFn: async () => {
      const result = await apiFetch<Feature[]>("/features");
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const featureIdByKey = useMemo(() => {
    return new Map(features.map((feature) => [feature.key, feature.id]));
  }, [features]);

  const roleIdByKey = useMemo(() => {
    return new Map(
      roles
        .filter((role) =>
          ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"].includes(role.key)
        )
        .map((role) => [role.key, role.id])
    );
  }, [roles]);

  const {
    data: activationTemplates = [],
    isLoading: isLoadingActivationTemplates,
    error: activationTemplatesError,
  } = useQuery<ActivationTemplateSummary[]>({
    queryKey: ["activation-templates"],
    queryFn: async () => {
      const result = await apiFetch<{ templates: ActivationTemplateSummary[] }>(
        "/permission-templates/activation"
      );
      if (result.error) throw new Error(result.error.message);
      return result.data?.templates ?? [];
    },
  });

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
    queryKey: ["activation-school-role-permissions", school.id, roleIdByKey.size],
    enabled: roleIdByKey.size > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        (["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"] as const)
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
    mutationFn: async (activationKey: ActivationStageKey) => {
      const result = await apiFetch<{
        activationKey: ActivationStageKey;
        templateName: string;
      }>("/permission-templates/activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.id, activationKey }),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(`Applied ${data?.templateName ?? "activation template"}`);
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
      toast.error(err.message ?? "Failed to apply activation stage");
    },
  });

  const currentStage = useMemo<ActivationStageKey | null>(() => {
    if (featureIdByKey.size === 0) return null;

    const schoolPermissionByFeatureId = new Map(
      schoolPermissions.map((permission) => [permission.featureId, permission])
    );
    const rolePermissionByRoleAndFeatureId = new Map<string, FeaturePermission>();
    for (const [roleKey, permissions] of Object.entries(schoolRolePermissionsByRole)) {
      for (const permission of permissions) {
        rolePermissionByRoleAndFeatureId.set(
          `${roleKey}:${permission.featureId}`,
          permission
        );
      }
    }

    const matchesStage = (stage: ActivationStageKey) => {
      const expectations = buildExpectations(stage);
      for (const expectation of expectations) {
        const featureId = featureIdByKey.get(expectation.featureKey);
        if (!featureId) return false;

        const permission =
          expectation.level === "school"
            ? schoolPermissionByFeatureId.get(featureId)
            : rolePermissionByRoleAndFeatureId.get(
                `${expectation.roleKey}:${featureId}`
              );
        if (!permission) return false;

        const effectiveVisible =
          permission.visible === null || permission.visible === undefined
            ? permission.enabled
            : permission.visible;
        if (
          permission.enabled !== expectation.enabled ||
          effectiveVisible !== expectation.visible
        ) {
          return false;
        }
      }
      return true;
    };

    for (const stage of STAGE_ORDER) {
      if (matchesStage(stage)) return stage;
    }
    return null;
  }, [featureIdByKey, schoolPermissions, schoolRolePermissionsByRole]);

  const isLoading =
    isLoadingFeatures ||
    isLoadingActivationTemplates ||
    isLoadingSchoolPermissions ||
    isLoadingSchoolRolePermissions;

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

  const templateByKey = new Map(
    activationTemplates.map((template) => [template.key, template])
  );

  return (
    <div className="space-y-6 pb-6">
      <Card>
        <CardHeader>
          <CardTitle>Activation</CardTitle>
          <CardDescription>
            Apply named role-aware templates to control AP Certification and school
            navigation access for this school.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStage ? (
            <Badge variant="secondary">
              Current stage: {STAGE_META[currentStage].title}
            </Badge>
          ) : (
            <Badge variant="outline">Current stage: custom/unknown</Badge>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {STAGE_ORDER.map((stageKey) => {
              const meta = STAGE_META[stageKey];
              const template = templateByKey.get(stageKey);
              const Icon = meta.icon;
              const isCurrent = currentStage === stageKey;
              const isPending =
                applyMutation.isPending && applyMutation.variables === stageKey;

              return (
                <Card
                  key={stageKey}
                  className={isCurrent ? "border-primary ring-1 ring-primary/30" : ""}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {meta.title}
                    </CardTitle>
                    <CardDescription>{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Template: {template?.name ?? stageKey}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      onClick={() => applyMutation.mutate(stageKey)}
                      disabled={applyMutation.isPending}
                    >
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isCurrent ? "Re-apply current stage" : "Apply stage"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileLock2 className="h-4 w-4" />
            Content access
          </CardTitle>
          <CardDescription>
            Reserved for later. Content-specific activation logic will be added in a
            future iteration.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
