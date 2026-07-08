"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import type { School } from "./schools-table-columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

type Feature = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
};

type FeaturePermission = {
  id: string;
  featureId: string;
  level: "global" | "role" | "school" | "user";
  targetId: string | null;
  enabled: boolean;
  visible?: boolean | null;
};

interface SchoolFeaturesTabProps {
  school: School;
}

export function SchoolFeaturesTab({ school }: SchoolFeaturesTabProps) {
  const queryClient = useQueryClient();
  // Editing requires /admin/features (platform engineering level);
  // school overseers get a read-only view of the current state.
  const { hasAccess: canManageFeatures } = useFeatureAccess("/admin/features");

  // Fetch all features
  const {
    data: features = [],
    isLoading: isLoadingFeatures,
    error: featuresError,
  } = useQuery<Feature[]>({
    queryKey: ["features"],
    queryFn: async () => {
      const result = await apiFetch<Feature[]>("/features");
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch features");
      }
      return result.data || [];
    },
  });

  // Fetch school's feature permissions
  const {
    data: schoolPermissions = [],
    isLoading: isLoadingPermissions,
  } = useQuery<FeaturePermission[]>({
    queryKey: ["school-features", school.id],
    queryFn: async () => {
      // Get permissions for this school by checking feature permissions at school level
      const allFeatures = await apiFetch<Feature[]>("/features");
      if (allFeatures.error || !allFeatures.data) {
        return [];
      }

      // Fetch permissions for each feature at school level
      const permissionPromises = allFeatures.data.map(async (feature) => {
        const result = await apiFetch<FeaturePermission[]>(
          `/features/${feature.id}/permissions?level=school&targetId=${school.id}`
        );
        if (result.error || !result.data || result.data.length === 0) {
          return null;
        }
        return result.data[0];
      });

      const permissions = await Promise.all(permissionPromises);
      return permissions.filter((p): p is FeaturePermission => p !== null);
    },
  });

  // Set permission mutation (sends both enabled and visible)
  const setPermissionMutation = useMutation({
    mutationFn: async (data: {
      featureId: string;
      enabled: boolean;
      visible?: boolean | null;
    }) => {
      const body: { level: string; targetId: string; enabled: boolean; visible?: boolean | null } = {
        level: "school",
        targetId: school.id,
        enabled: data.enabled,
      };
      if (data.visible !== undefined) {
        body.visible = data.visible;
      }

      const result = await apiFetch<FeaturePermission>(
        `/features/${data.featureId}/permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to set permission");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-features", school.id] });
    },
  });

  const getSchoolPermissionForFeature = (featureId: string): FeaturePermission | undefined => {
    return schoolPermissions.find(
      (p) => p.featureId === featureId && p.level === "school" && p.targetId === school.id
    );
  };

  const handleToggleAccess = (featureId: string, enabled: boolean) => {
    const permission = getSchoolPermissionForFeature(featureId);
    setPermissionMutation.mutate({
      featureId,
      enabled,
      visible: permission?.visible ?? enabled,
    });
  };

  const handleToggleVisible = (featureId: string, visible: boolean) => {
    const permission = getSchoolPermissionForFeature(featureId);
    setPermissionMutation.mutate({
      featureId,
      enabled: permission?.enabled ?? false,
      visible,
    });
  };

  if (featuresError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {featuresError instanceof Error
                ? featuresError.message
                : "Failed to load features"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Read-only oversight view for school administrators: a high-level summary
  // of what the school can use, without the underlying permission machinery.
  if (!canManageFeatures) {
    const enabledFeatures = features.filter((feature) => {
      const permission = getSchoolPermissionForFeature(feature.id);
      return permission?.enabled === true;
    });
    const lockedFeatures = features.filter((feature) => {
      const permission = getSchoolPermissionForFeature(feature.id);
      return permission?.enabled === false && permission?.visible === true;
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
          <CardDescription>
            What this school can currently see and use on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Managed by the platform team</AlertTitle>
            <AlertDescription>
              This view is provided for oversight. Feature access is configured
              at the platform engineering level, normally by applying a
              permission template from the school&apos;s Activation tab.
            </AlertDescription>
          </Alert>

          {isLoadingFeatures || isLoadingPermissions ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">
                  Available to this school
                </h4>
                {enabledFeatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No features are enabled for this school yet. Apply a
                    permission template from the Activation tab to activate it.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {enabledFeatures.map((feature) => (
                      <Badge
                        key={feature.id}
                        variant="secondary"
                        className="text-sm font-normal py-1 px-3"
                      >
                        {feature.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {lockedFeatures.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Visible but locked
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {lockedFeatures.map((feature) => (
                      <Badge
                        key={feature.id}
                        variant="outline"
                        className="text-sm font-normal py-1 px-3 text-muted-foreground"
                      >
                        {feature.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Access</CardTitle>
        <CardDescription>
          Control which features are available to all users in this school.
          School-level permissions override role and global permissions, but
          are overridden by user-level permissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Permission Hierarchy</AlertTitle>
          <AlertDescription>
            School-level permissions apply to all users in this school. They
            override role and global permissions, but individual user
            permissions take precedence.
          </AlertDescription>
        </Alert>

        {isLoadingFeatures || isLoadingPermissions ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        ) : features.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No features found. Create features in the Features admin page.
          </div>
        ) : (
          <div className="space-y-3">
            {features.map((feature) => {
              const permission = getSchoolPermissionForFeature(feature.id);
              const isEnabled = permission?.enabled ?? false;
              const isVisible = permission?.visible ?? isEnabled;
              const hasOverride = permission !== undefined;
              const isPending =
                setPermissionMutation.isPending &&
                setPermissionMutation.variables?.featureId === feature.id;

              return (
                <div
                  key={feature.id}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label
                        htmlFor={`feature-access-${feature.id}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {feature.name}
                      </Label>
                      {hasOverride && (
                        <Badge variant="outline" className="text-xs">
                          Override
                        </Badge>
                      )}
                      {feature.category && (
                        <Badge variant="secondary" className="text-xs">
                          {feature.category}
                        </Badge>
                      )}
                    </div>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {feature.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {isPending && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`feature-visible-${feature.id}`}
                          className="text-xs text-muted-foreground whitespace-nowrap"
                        >
                          Visible
                        </Label>
                        <Switch
                          id={`feature-visible-${feature.id}`}
                          checked={isVisible}
                          onCheckedChange={(checked) =>
                            handleToggleVisible(feature.id, checked)
                          }
                          disabled={!canManageFeatures || setPermissionMutation.isPending}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`feature-access-${feature.id}`}
                          className="text-xs text-muted-foreground whitespace-nowrap"
                        >
                          Access
                        </Label>
                        <Switch
                          id={`feature-access-${feature.id}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleToggleAccess(feature.id, checked)
                          }
                          disabled={!canManageFeatures || setPermissionMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
