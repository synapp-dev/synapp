"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import {
  useGlobalPermissionsQuery,
  useSchoolPermissionsQuery,
  useSchoolRolePermissionsQuery,
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
import { Globe, School, Unlock, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import type { Feature } from "./global-tab";

type SchoolRoleTabProps = {
  features: Feature[];
  onSetPermission: (data: {
    featureId: string;
    level: "school_role";
    targetId: string;
    schoolId: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    level: "school_role";
    targetId: string;
    schoolId: string;
  }) => void;
  isMutationPending: boolean;
  isRemovePending: boolean;
};

function InheritedBadge({
  enabled,
  visible,
  source,
}: {
  enabled: boolean;
  visible: boolean;
  source: "global" | "school";
}) {
  return (
    <Badge variant="outline" className="inline-flex items-center gap-1.5 px-2 py-1 text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            {source === "school" ? (
              <School className="h-4 w-4" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>{source === "school" ? "School" : "Global"}</TooltipContent>
      </Tooltip>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
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

export function SchoolRoleTab({
  features,
  onSetPermission,
  onRemovePermission,
  isMutationPending,
  isRemovePending,
}: SchoolRoleTabProps) {
  const [selectedSchoolId, setSelectedSchoolId] = React.useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null);
  const pending = isMutationPending || isRemovePending;

  const { data: schools = [], isLoading: isLoadingSchools } = useListSchoolsQuery(
    { limit: 100 },
    { enabled: true }
  );

  // Only show school-scoped roles (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF, SCHOOL_LICENCE)
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles", "school"],
    queryFn: async () => {
      const result = await rolesApi.get.list({ scope: "school" });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const { byFeatureId: globalByFeatureId, isLoading: globalLoading } =
    useGlobalPermissionsQuery();
  const { byFeatureId: schoolByFeatureId, isLoading: schoolLoading } =
    useSchoolPermissionsQuery(selectedSchoolId);
  const { byFeatureId: schoolRoleByFeatureId, isLoading: schoolRoleLoading } =
    useSchoolRolePermissionsQuery(selectedSchoolId, selectedRoleId);

  if (isLoadingSchools || isLoadingRoles) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Reset role when school changes
  const handleSchoolChange = (v: string | null) => {
    setSelectedSchoolId(v);
    setSelectedRoleId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Combobox
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
          value={selectedSchoolId}
          onValueChange={handleSchoolChange}
          placeholder="Choose a school..."
          searchPlaceholder="Search schools..."
          emptyText="No schools found."
          triggerClassName="w-[280px]"
        />
        <Combobox
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          value={selectedRoleId}
          onValueChange={(v) => setSelectedRoleId(v)}
          placeholder="Choose a role..."
          searchPlaceholder="Search roles..."
          emptyText="No school roles found."
          triggerClassName="w-[220px]"
        />
      </div>

      {!selectedSchoolId ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select a school first, then a role to manage features for that role within the school.
        </div>
      ) : !selectedRoleId ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select a role to manage its feature overrides within this school.
          School Role settings override School settings.
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
            const schoolA = schoolByFeatureId[a.id];
            const schoolB = schoolByFeatureId[b.id];
            const srA = schoolRoleByFeatureId[a.id];
            const srB = schoolRoleByFeatureId[b.id];
            const inheritedEnabledA = schoolA?.enabled ?? globalA?.enabled ?? false;
            const inheritedEnabledB = schoolB?.enabled ?? globalB?.enabled ?? false;
            const enabledA = srA != null ? srA.enabled : inheritedEnabledA;
            const enabledB = srB != null ? srB.enabled : inheritedEnabledB;
            const rankA = enabledA ? 0 : 1;
            const rankB = enabledB ? 0 : 1;
            if (rankA !== rankB) return rankA - rankB;
            return (a.name || a.key).localeCompare(b.name || b.key);
          });
          return (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Inherited (School / Global)</TableHead>
                    <TableHead className="text-center">Override for this school role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFeatures.map((feature) => {
                    const globalPerm = globalByFeatureId[feature.id];
                    const schoolPerm = schoolByFeatureId[feature.id];
                    const srPerm = schoolRoleByFeatureId[feature.id];
                    const globalEnabled = globalPerm?.enabled ?? false;
                    const globalVisible = globalPerm?.visible ?? globalEnabled;
                    const schoolEnabled = schoolPerm?.enabled;
                    const schoolVisible = schoolPerm?.visible ?? schoolPerm?.enabled;
                    const inheritedEnabled = schoolEnabled ?? globalEnabled;
                    const inheritedVisible = schoolVisible ?? globalVisible;
                    const inheritedSource = schoolPerm != null ? "school" as const : "global" as const;
                    const effectiveEnabled = srPerm != null ? srPerm.enabled : inheritedEnabled;
                    const effectiveVisible = srPerm != null ? (srPerm.visible ?? srPerm.enabled) : inheritedVisible;
                    const hasOverride = srPerm != null;
                    const rowClass = hasOverride
                      ? "bg-amber-500/10"
                      : effectiveEnabled && effectiveVisible
                        ? "bg-green-500/10"
                        : effectiveVisible
                          ? "bg-blue-500/10"
                          : undefined;

                    return (
                      <TableRow key={feature.id} className={rowClass}>
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
                                  This has been overridden for this school role.
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
                          {globalLoading || schoolLoading ? (
                            <Skeleton className="h-8 w-24" />
                          ) : (
                            <InheritedBadge
                              enabled={inheritedEnabled}
                              visible={inheritedVisible}
                              source={inheritedSource}
                            />
                          )}
                        </TableCell>
                        <TableCell className="w-[200px]">
                          {schoolRoleLoading ? (
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
                                      : (srPerm?.visible ?? effectiveVisible);
                                    const newVisibleNorm = newVisible ?? checked;
                                    if (
                                      selectedSchoolId &&
                                      selectedRoleId &&
                                      checked === inheritedEnabled &&
                                      newVisibleNorm === inheritedVisible
                                    ) {
                                      onRemovePermission({
                                        featureId: feature.id,
                                        level: "school_role",
                                        targetId: selectedRoleId,
                                        schoolId: selectedSchoolId,
                                      });
                                    } else {
                                      onSetPermission({
                                        featureId: feature.id,
                                        level: "school_role",
                                        targetId: selectedRoleId!,
                                        schoolId: selectedSchoolId!,
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
                                    const newEnabled = srPerm?.enabled ?? effectiveEnabled;
                                    const newVisibleNorm = checked ?? newEnabled;
                                    if (
                                      selectedSchoolId &&
                                      selectedRoleId &&
                                      newEnabled === inheritedEnabled &&
                                      newVisibleNorm === inheritedVisible
                                    ) {
                                      onRemovePermission({
                                        featureId: feature.id,
                                        level: "school_role",
                                        targetId: selectedRoleId,
                                        schoolId: selectedSchoolId,
                                      });
                                    } else {
                                      onSetPermission({
                                        featureId: feature.id,
                                        level: "school_role",
                                        targetId: selectedRoleId!,
                                        schoolId: selectedSchoolId!,
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
