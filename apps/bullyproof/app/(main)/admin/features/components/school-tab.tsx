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

/** Sentinel value for the "Global (School-wide)" option in the role filter */
const SCHOOL_GLOBAL = "__school_global__";

type SchoolTabProps = {
  features: Feature[];
  onSetPermission: (data: {
    featureId: string;
    level: "school" | "school_role";
    targetId: string;
    schoolId?: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    level: "school" | "school_role";
    targetId: string;
    schoolId?: string;
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

export function SchoolTab({
  features,
  onSetPermission,
  onRemovePermission,
  isMutationPending,
  isRemovePending,
}: SchoolTabProps) {
  const [selectedSchoolId, setSelectedSchoolId] = React.useState<string | null>(null);
  // SCHOOL_GLOBAL = school-level permissions; any other value = role id (school_role level)
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState<string>(SCHOOL_GLOBAL);
  const pending = isMutationPending || isRemovePending;

  const isSchoolGlobal = selectedRoleFilter === SCHOOL_GLOBAL;
  const selectedRoleId = isSchoolGlobal ? null : selectedRoleFilter;

  const { data: schools = [], isLoading: isLoadingSchools } = useListSchoolsQuery(
    { limit: 100 },
    { enabled: true }
  );

  // Fetch school-scoped roles for the secondary filter
  const { data: schoolRoles = [], isLoading: isLoadingRoles } = useQuery({
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

  // Reset role filter when school changes
  const handleSchoolChange = (v: string | null) => {
    setSelectedSchoolId(v);
    setSelectedRoleFilter(SCHOOL_GLOBAL);
  };

  // Build role filter options
  const roleFilterOptions = React.useMemo(
    () => [
      { value: SCHOOL_GLOBAL, label: "Global (School-wide)" },
      ...schoolRoles.map((r) => ({ value: r.id, label: r.name })),
    ],
    [schoolRoles]
  );

  if (isLoadingSchools || isLoadingRoles) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
          triggerClassName="w-[320px]"
        />
        {selectedSchoolId && (
          <Combobox
            options={roleFilterOptions}
            value={selectedRoleFilter}
            onValueChange={(v) => setSelectedRoleFilter(v ?? SCHOOL_GLOBAL)}
            placeholder="Filter by role..."
            searchPlaceholder="Search roles..."
            emptyText="No roles found."
            triggerClassName="w-[260px]"
          />
        )}
      </div>

      {!selectedSchoolId ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select a school to manage feature permissions. School settings override Global.
        </div>
      ) : features.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No features found.
        </div>
      ) : isSchoolGlobal ? (
        /* ── School-level permissions (level: "school") ── */
        <SchoolGlobalTable
          features={features}
          selectedSchoolId={selectedSchoolId}
          globalByFeatureId={globalByFeatureId}
          schoolByFeatureId={schoolByFeatureId}
          globalLoading={globalLoading}
          schoolLoading={schoolLoading}
          pending={pending}
          onSetPermission={(data) =>
            onSetPermission({ ...data, level: "school" })
          }
          onRemovePermission={(data) =>
            onRemovePermission({ ...data, level: "school" })
          }
        />
      ) : (
        /* ── School-role-level permissions (level: "school_role") ── */
        <SchoolRoleTable
          features={features}
          selectedSchoolId={selectedSchoolId}
          selectedRoleId={selectedRoleFilter}
          globalByFeatureId={globalByFeatureId}
          schoolByFeatureId={schoolByFeatureId}
          schoolRoleByFeatureId={schoolRoleByFeatureId}
          globalLoading={globalLoading}
          schoolLoading={schoolLoading}
          schoolRoleLoading={schoolRoleLoading}
          pending={pending}
          onSetPermission={(data) =>
            onSetPermission({
              ...data,
              level: "school_role",
              schoolId: selectedSchoolId,
            })
          }
          onRemovePermission={(data) =>
            onRemovePermission({
              ...data,
              level: "school_role",
              schoolId: selectedSchoolId,
            })
          }
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sub-table: School-level ("Global" filter selected)
 * Shows global inherited values + school-level overrides
 * ────────────────────────────────────────────────────────────────────────── */

type PermRow = { enabled: boolean; visible?: boolean | null };
type ByFeatureId = Record<string, PermRow>;

function SchoolGlobalTable({
  features,
  selectedSchoolId,
  globalByFeatureId,
  schoolByFeatureId,
  globalLoading,
  schoolLoading,
  pending,
  onSetPermission,
  onRemovePermission,
}: {
  features: Feature[];
  selectedSchoolId: string;
  globalByFeatureId: ByFeatureId;
  schoolByFeatureId: ByFeatureId;
  globalLoading: boolean;
  schoolLoading: boolean;
  pending: boolean;
  onSetPermission: (data: {
    featureId: string;
    targetId: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    targetId: string;
  }) => void;
}) {
  const sortedFeatures = React.useMemo(() => {
    return [...features].sort((a, b) => {
      const globalA = globalByFeatureId[a.id];
      const globalB = globalByFeatureId[b.id];
      const schoolA = schoolByFeatureId[a.id];
      const schoolB = schoolByFeatureId[b.id];
      const enabledA = schoolA != null ? schoolA.enabled : (globalA?.enabled ?? false);
      const enabledB = schoolB != null ? schoolB.enabled : (globalB?.enabled ?? false);
      const visibleA =
        schoolA != null
          ? (schoolA.visible ?? schoolA.enabled)
          : (globalA?.visible ?? enabledA);
      const visibleB =
        schoolB != null
          ? (schoolB.visible ?? schoolB.enabled)
          : (globalB?.visible ?? enabledB);
      const rankA = enabledA ? 0 : visibleA ? 1 : 2;
      const rankB = enabledB ? 0 : visibleB ? 1 : 2;
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || a.key).localeCompare(b.name || b.key);
    });
  }, [features, globalByFeatureId, schoolByFeatureId]);

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature</TableHead>
            <TableHead>Inherited (Global)</TableHead>
            <TableHead className="text-center">Override for this school</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFeatures.map((feature) => {
            const globalPerm = globalByFeatureId[feature.id];
            const schoolPerm = schoolByFeatureId[feature.id];
            const globalEnabled = globalPerm?.enabled ?? false;
            const globalVisible = globalPerm?.visible ?? globalEnabled;
            const effectiveEnabled =
              schoolPerm != null ? schoolPerm.enabled : globalEnabled;
            const effectiveVisible =
              schoolPerm != null
                ? (schoolPerm.visible ?? schoolPerm.enabled)
                : globalVisible;
            const hasOverride = schoolPerm != null;
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
                          This has been overridden for this school.
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
                    <InheritedBadge
                      enabled={globalEnabled}
                      visible={globalVisible}
                      source="global"
                    />
                  )}
                </TableCell>
                <TableCell className="w-[200px]">
                  {schoolLoading ? (
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
                              : (schoolPerm?.visible ?? effectiveVisible);
                            const newVisibleNorm = newVisible ?? checked;
                            if (
                              checked === globalEnabled &&
                              newVisibleNorm === globalVisible
                            ) {
                              onRemovePermission({
                                featureId: feature.id,
                                targetId: selectedSchoolId,
                              });
                            } else {
                              onSetPermission({
                                featureId: feature.id,
                                targetId: selectedSchoolId,
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
                            const newEnabled = schoolPerm?.enabled ?? effectiveEnabled;
                            const newVisibleNorm = checked ?? newEnabled;
                            if (
                              newEnabled === globalEnabled &&
                              newVisibleNorm === globalVisible
                            ) {
                              onRemovePermission({
                                featureId: feature.id,
                                targetId: selectedSchoolId,
                              });
                            } else {
                              onSetPermission({
                                featureId: feature.id,
                                targetId: selectedSchoolId,
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
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sub-table: School-role level (a specific role selected)
 * Shows inherited (school > global) values + school_role-level overrides
 * ────────────────────────────────────────────────────────────────────────── */

function SchoolRoleTable({
  features,
  selectedSchoolId,
  selectedRoleId,
  globalByFeatureId,
  schoolByFeatureId,
  schoolRoleByFeatureId,
  globalLoading,
  schoolLoading,
  schoolRoleLoading,
  pending,
  onSetPermission,
  onRemovePermission,
}: {
  features: Feature[];
  selectedSchoolId: string;
  selectedRoleId: string;
  globalByFeatureId: ByFeatureId;
  schoolByFeatureId: ByFeatureId;
  schoolRoleByFeatureId: ByFeatureId;
  globalLoading: boolean;
  schoolLoading: boolean;
  schoolRoleLoading: boolean;
  pending: boolean;
  onSetPermission: (data: {
    featureId: string;
    targetId: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    targetId: string;
  }) => void;
}) {
  const sortedFeatures = React.useMemo(() => {
    return [...features].sort((a, b) => {
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
  }, [features, globalByFeatureId, schoolByFeatureId, schoolRoleByFeatureId]);

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
            const inheritedSource =
              schoolPerm != null ? ("school" as const) : ("global" as const);
            const effectiveEnabled =
              srPerm != null ? srPerm.enabled : inheritedEnabled;
            const effectiveVisible =
              srPerm != null
                ? (srPerm.visible ?? srPerm.enabled)
                : inheritedVisible;
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
                              checked === inheritedEnabled &&
                              newVisibleNorm === inheritedVisible
                            ) {
                              onRemovePermission({
                                featureId: feature.id,
                                targetId: selectedRoleId,
                              });
                            } else {
                              onSetPermission({
                                featureId: feature.id,
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
                            const newEnabled = srPerm?.enabled ?? effectiveEnabled;
                            const newVisibleNorm = checked ?? newEnabled;
                            if (
                              newEnabled === inheritedEnabled &&
                              newVisibleNorm === inheritedVisible
                            ) {
                              onRemovePermission({
                                featureId: feature.id,
                                targetId: selectedRoleId,
                              });
                            } else {
                              onSetPermission({
                                featureId: feature.id,
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
}
