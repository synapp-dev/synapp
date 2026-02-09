"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { rolesApi } from "@/entities/roles/api/endpoints";
import type { roles } from "@/server/db/schema";
import {
  useGlobalPermissionsQuery,
  useRolePermissionsQuery,
} from "@/entities/feature-permissions/model/useAdminFeaturePermissions";
import { Combobox } from "@/components/molecules/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Globe, Unlock, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import type { Feature } from "./global-tab";

type Role = typeof roles.$inferSelect;

type RoleTabProps = {
  features: Feature[];
  onSetPermission: (data: {
    featureId: string;
    level: "role";
    targetId: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    level: "role";
    targetId: string;
  }) => void;
  isMutationPending: boolean;
  isRemovePending: boolean;
};

function InheritedBadge({ enabled, visible }: { enabled: boolean; visible: boolean }) {
  return (
    <Badge variant="outline" className="inline-flex items-center gap-1.5 px-2 py-1 text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Globe className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Global</TooltipContent>
      </Tooltip>
      <span className="text-muted-foreground" aria-hidden>·</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            {enabled ? (
              <Unlock className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>Access: {enabled ? "On" : "Off"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            {visible ? (
              <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>Visible: {visible ? "On" : "Off"}</TooltipContent>
      </Tooltip>
    </Badge>
  );
}

export function RoleTab({
  features,
  onSetPermission,
  onRemovePermission,
  isMutationPending,
  isRemovePending,
}: RoleTabProps) {
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null);
  const pending = isMutationPending || isRemovePending;

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles", "platform"],
    queryFn: async () => {
      const result = await rolesApi.get.list({ scope: "platform" });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const { byFeatureId: globalByFeatureId, isLoading: globalLoading } =
    useGlobalPermissionsQuery();
  const { byFeatureId: roleByFeatureId, isLoading: roleLoading } =
    useRolePermissionsQuery(selectedRoleId);

  if (isLoadingRoles) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Combobox
        options={roles.map((r) => ({ value: r.id, label: r.name }))}
        value={selectedRoleId}
        onValueChange={(v) => setSelectedRoleId(v)}
        placeholder="Choose a role..."
        searchPlaceholder="Search roles..."
        emptyText="No roles found."
        triggerClassName="w-[280px]"
      />

      {!selectedRoleId ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select a role to manage feature overrides. Role settings override Global.
        </div>
      ) : features.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No features found.
        </div>
      ) : (
        (() => {
          const sortedFeatures = [...features].sort((a, b) => {
            const globalA = globalByFeatureId[a.id];
            const globalB = globalByFeatureId[b.id];
            const roleA = roleByFeatureId[a.id];
            const roleB = roleByFeatureId[b.id];
            const enabledA =
              roleA != null ? roleA.enabled : (globalA?.enabled ?? false);
            const enabledB =
              roleB != null ? roleB.enabled : (globalB?.enabled ?? false);
            const visibleA =
              roleA != null
                ? (roleA.visible ?? roleA.enabled)
                : (globalA?.visible ?? enabledA);
            const visibleB =
              roleB != null
                ? (roleB.visible ?? roleB.enabled)
                : (globalB?.visible ?? enabledB);
            const rankA = enabledA ? 0 : visibleA ? 1 : 2;
            const rankB = enabledB ? 0 : visibleB ? 1 : 2;
            if (rankA !== rankB) return rankA - rankB;
            return (a.name || a.key).localeCompare(b.name || b.key);
          });
          return (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Global (default)</TableHead>
                <TableHead className="text-center">Override for this role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFeatures.map((feature) => {
                const globalPerm = globalByFeatureId[feature.id];
                const rolePerm = roleByFeatureId[feature.id];
                const globalEnabled = globalPerm?.enabled ?? false;
                const globalVisible = globalPerm?.visible ?? globalEnabled;
                const effectiveEnabled =
                  rolePerm != null ? rolePerm.enabled : globalEnabled;
                const effectiveVisible =
                  rolePerm != null
                    ? (rolePerm.visible ?? rolePerm.enabled)
                    : globalVisible;
                const hasOverride = rolePerm != null;
                const rowClass = hasOverride
                  ? "bg-amber-500/10"
                  : effectiveEnabled && effectiveVisible
                    ? "bg-green-500/10"
                    : effectiveVisible
                      ? "bg-blue-500/10"
                      : undefined;
                return (
                  <TableRow
                    key={feature.id}
                    className={rowClass}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasOverride && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex text-amber-600 dark:text-amber-500">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              This has been overridden for this role.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <div>
                          <span className="font-medium">{feature.name}</span>
                          <span className="text-muted-foreground font-mono text-xs ml-2">
                            {feature.key}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-[180px]">
                      {globalLoading ? (
                        <Skeleton className="h-8 w-24" />
                      ) : (
                        <InheritedBadge enabled={globalEnabled} visible={globalVisible} />
                      )}
                    </TableCell>
                    <TableCell className="w-[200px]">
                      {roleLoading ? (
                        <Skeleton className="h-8 w-28" />
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-muted-foreground">Access</Label>
                            <Switch
                              checked={effectiveEnabled}
                              onCheckedChange={(checked) => {
                                const newVisible = checked
                                  ? true
                                  : (rolePerm?.visible ?? effectiveVisible);
                                const newVisibleNorm = newVisible ?? checked;
                                if (
                                  selectedRoleId &&
                                  checked === globalEnabled &&
                                  newVisibleNorm === globalVisible
                                ) {
                                  onRemovePermission({
                                    featureId: feature.id,
                                    level: "role",
                                    targetId: selectedRoleId,
                                  });
                                } else {
                                  onSetPermission({
                                    featureId: feature.id,
                                    level: "role",
                                    targetId: selectedRoleId,
                                    enabled: checked,
                                    visible: newVisible,
                                  });
                                }
                              }}
                              disabled={pending}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-muted-foreground">Visible</Label>
                            <Switch
                              checked={effectiveVisible}
                              onCheckedChange={(checked) => {
                                const newEnabled =
                                  rolePerm?.enabled ?? effectiveEnabled;
                                const newVisibleNorm = checked ?? newEnabled;
                                if (
                                  selectedRoleId &&
                                  newEnabled === globalEnabled &&
                                  newVisibleNorm === globalVisible
                                ) {
                                  onRemovePermission({
                                    featureId: feature.id,
                                    level: "role",
                                    targetId: selectedRoleId,
                                  });
                                } else {
                                  onSetPermission({
                                    featureId: feature.id,
                                    level: "role",
                                    targetId: selectedRoleId,
                                    enabled: newEnabled,
                                    visible: checked,
                                  });
                                }
                              }}
                              disabled={pending}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
          );
        })()
      )}
    </div>
  );
}
