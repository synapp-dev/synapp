"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { rolesApi } from "@/entities/roles/api/endpoints";
import {
  featurePermissionsApi,
  type FeaturePermissionRow,
} from "@/entities/feature-permissions/api/endpoints";
import { RoleBadges } from "@/components/atoms/role-badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Badge } from "@workspace/ui/components/badge";
import { Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sortPlatformRoles } from "@/lib/role-keys";

const EMPTY_FEATURES: FeatureRow[] = [];
const EMPTY_PERMISSIONS: FeaturePermissionRow[] = [];
const EMPTY_ROLES: Array<{ id: string; name: string; key: string }> = [];

type FeatureRow = {
  id: string;
  key: string;
  name?: string;
};

type DraftPermission = {
  view: boolean;
  access: boolean;
};

interface FeatureRoleMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureKey: string;
  featureTitle: string;
}

function areDraftMapsEqual(
  a: Record<string, DraftPermission>,
  b: Record<string, DraftPermission>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const aValue = a[key];
    const bValue = b[key];
    if (!bValue) return false;
    if (aValue.access !== bValue.access || aValue.view !== bValue.view) {
      return false;
    }
  }
  return true;
}

export function FeatureRoleMatrixDialog({
  open,
  onOpenChange,
  featureKey,
  featureTitle,
}: FeatureRoleMatrixDialogProps) {
  const queryClient = useQueryClient();
  const [draftByRoleId, setDraftByRoleId] = useState<Record<string, DraftPermission>>(
    {}
  );

  const { data: featuresData, isLoading: isLoadingFeatures } = useQuery({
    queryKey: ["admin-card-permissions", "features"],
    enabled: open,
    queryFn: async () => {
      const result = await apiFetch<FeatureRow[]>("/features");
      if (result.error) return [];
      return result.data ?? [];
    },
  });
  const { data: platformRolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["admin-card-permissions", "roles", "platform"],
    enabled: open,
    queryFn: async () => {
      const result = await rolesApi.get.list({ scope: "platform" });
      if (result.error) return [];
      return result.data ?? [];
    },
  });
  const { data: globalPermissionsData, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ["admin-card-permissions", "permissions", "global"],
    enabled: open,
    queryFn: async () => {
      const result = await featurePermissionsApi.getBulkByLevel("global");
      if (result.error) return [];
      return result.data ?? [];
    },
  });
  const { data: rolePermissionsData, isLoading: isLoadingRolePermissions } = useQuery({
    queryKey: ["admin-card-permissions", "permissions", "role"],
    enabled: open,
    queryFn: async () => {
      const result = await featurePermissionsApi.getBulkByLevel("role");
      if (result.error) return [];
      return result.data ?? [];
    },
  });

  const features = featuresData ?? EMPTY_FEATURES;
  const platformRoles = platformRolesData ?? EMPTY_ROLES;
  const sortedPlatformRoles = useMemo(
    () => sortPlatformRoles(platformRoles),
    [platformRoles]
  );
  const globalPermissions = globalPermissionsData ?? EMPTY_PERMISSIONS;
  const rolePermissions = rolePermissionsData ?? EMPTY_PERMISSIONS;

  const feature = useMemo(
    () => features.find((row) => row.key === featureKey),
    [features, featureKey]
  );
  const featureId = feature?.id;
  const globalPermission = useMemo(
    () => globalPermissions.find((row) => row.featureId === featureId),
    [globalPermissions, featureId]
  );
  const roleOverrideByRoleId = useMemo(() => {
    const byRoleId = new Map<string, FeaturePermissionRow>();
    for (const row of rolePermissions) {
      if (row.featureId === featureId && row.targetId) {
        byRoleId.set(row.targetId, row);
      }
    }
    return byRoleId;
  }, [featureId, rolePermissions]);

  const inheritedDefault = useMemo(
    () => ({
      access: globalPermission?.enabled ?? false,
      view: globalPermission?.visible ?? globalPermission?.enabled ?? false,
    }),
    [globalPermission]
  );

  const currentEffectiveByRoleId = useMemo(() => {
    const current: Record<string, DraftPermission> = {};
    for (const role of sortedPlatformRoles) {
      const override = roleOverrideByRoleId.get(role.id);
      const access = override?.enabled ?? inheritedDefault.access;
      const view =
        override != null
          ? (override.visible ?? override.enabled)
          : inheritedDefault.view;
      current[role.id] = { access, view };
    }
    return current;
  }, [inheritedDefault.access, inheritedDefault.view, roleOverrideByRoleId, sortedPlatformRoles]);

  useEffect(() => {
    if (!open) return;
    setDraftByRoleId((prev) =>
      areDraftMapsEqual(prev, currentEffectiveByRoleId)
        ? prev
        : currentEffectiveByRoleId
    );
  }, [currentEffectiveByRoleId, open]);

  const hasUnsavedChanges = useMemo(() => {
    for (const role of sortedPlatformRoles) {
      const current = currentEffectiveByRoleId[role.id] ?? {
        access: false,
        view: false,
      };
      const draft = draftByRoleId[role.id] ?? current;
      if (draft.access !== current.access || draft.view !== current.view) {
        return true;
      }
    }
    return false;
  }, [currentEffectiveByRoleId, draftByRoleId, sortedPlatformRoles]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!featureId) throw new Error("Feature not found");

      const requests: Promise<unknown>[] = [];
      for (const role of sortedPlatformRoles) {
        const current = currentEffectiveByRoleId[role.id] ?? {
          access: inheritedDefault.access,
          view: inheritedDefault.view,
        };
        const draft = draftByRoleId[role.id] ?? current;
        const changed =
          draft.access !== current.access || draft.view !== current.view;
        if (!changed) continue;

        const hasOverride = roleOverrideByRoleId.has(role.id);
        const shouldInherit =
          draft.access === inheritedDefault.access &&
          draft.view === inheritedDefault.view;

        if (shouldInherit) {
          if (hasOverride) {
            const params = new URLSearchParams({
              level: "role",
              targetId: role.id,
            });
            requests.push(
              apiFetch(
                `/features/${featureId}/permissions?${params.toString()}`,
                { method: "DELETE" }
              ).then((result) => {
                if (result.error) {
                  throw new Error(result.error.message || "Failed to remove permission");
                }
              })
            );
          }
          continue;
        }

        requests.push(
          apiFetch(`/features/${featureId}/permissions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              level: "role",
              targetId: role.id,
              enabled: draft.access,
              visible: draft.view,
            }),
          }).then((result) => {
            if (result.error) {
              throw new Error(result.error.message || "Failed to save permission");
            }
          })
        );
      }

      await Promise.all(requests);
      return requests.length;
    },
    onSuccess: (changes) => {
      toast.success(
        changes > 0 ? "Role permissions saved" : "No permission changes to save"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-card-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["feature-permissions"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save role permissions");
    },
  });

  const isLoading =
    isLoadingFeatures ||
    isLoadingRoles ||
    isLoadingGlobal ||
    isLoadingRolePermissions;
  const isSaving = saveMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[39rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Manage Permissions
          </DialogTitle>
          <div>
            <Badge
              variant="outline"
              className="bg-muted text-primary border-transparent font-mono"
            >
              {featureKey}
            </Badge>
          </div>
        </DialogHeader>

        {!featureId && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            Feature mapping not found for <code>{featureKey}</code>.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[120px] text-center">View</TableHead>
                    <TableHead className="w-[120px] text-center">Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <TableRow key={`role-loading-${idx}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-36" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Skeleton className="mx-auto h-4 w-4" />
                        </TableCell>
                        <TableCell className="text-center">
                          <Skeleton className="mx-auto h-4 w-4" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    sortedPlatformRoles.map((role) => {
                      const current = draftByRoleId[role.id] ?? {
                        access: inheritedDefault.access,
                        view: inheritedDefault.view,
                      };
                      return (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1 py-1.5 px-2">
                              <RoleBadges
                                roles={[
                                  {
                                    roleKey: role.key ?? role.name,
                                    roleName: role.name,
                                    isPlatform: true,
                                  },
                                ]}
                                variant="pill"
                                size="sm"
                              />
                              <span className="inline-block text-[0.65rem] ml-2.5 font-mono text-muted-foreground">
                                {role.key}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={current.view}
                              disabled={isSaving}
                              onCheckedChange={(checked) => {
                                const isChecked = checked === true;
                                setDraftByRoleId((prev) => {
                                  const prevRole = prev[role.id] ?? current;
                                  return {
                                    ...prev,
                                    [role.id]: {
                                      view: isChecked,
                                      access: isChecked ? prevRole.access : false,
                                    },
                                  };
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={current.access}
                              disabled={isSaving}
                              onCheckedChange={(checked) => {
                                const isChecked = checked === true;
                                setDraftByRoleId((prev) => {
                                  const prevRole = prev[role.id] ?? current;
                                  return {
                                    ...prev,
                                    [role.id]: {
                                      access: isChecked,
                                      view: isChecked ? true : prevRole.view,
                                    },
                                  };
                                });
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={isSaving || !hasUnsavedChanges || !featureId}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
