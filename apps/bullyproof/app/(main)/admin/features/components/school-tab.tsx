"use client";

import React from "react";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import {
  useGlobalPermissionsQuery,
  useSchoolPermissionsQuery,
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

type SchoolTabProps = {
  features: Feature[];
  onSetPermission: (data: {
    featureId: string;
    level: "school";
    targetId: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    level: "school";
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

export function SchoolTab({
  features,
  onSetPermission,
  onRemovePermission,
  isMutationPending,
  isRemovePending,
}: SchoolTabProps) {
  const [selectedSchoolId, setSelectedSchoolId] = React.useState<string | null>(null);
  const pending = isMutationPending || isRemovePending;

  const { data: schools = [], isLoading: isLoadingSchools } = useListSchoolsQuery(
    { limit: 100 },
    { enabled: true }
  );

  const { byFeatureId: globalByFeatureId, isLoading: globalLoading } =
    useGlobalPermissionsQuery();
  const { byFeatureId: schoolByFeatureId, isLoading: schoolLoading } =
    useSchoolPermissionsQuery(selectedSchoolId);

  if (isLoadingSchools) {
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
        options={schools.map((s) => ({ value: s.id, label: s.name }))}
        value={selectedSchoolId}
        onValueChange={(v) => setSelectedSchoolId(v)}
        placeholder="Choose a school..."
        searchPlaceholder="Search schools..."
        emptyText="No schools found."
        triggerClassName="w-[320px]"
      />

      {!selectedSchoolId ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select a school to manage feature overrides. School settings override Global.
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
            const enabledA =
              schoolA != null ? schoolA.enabled : (globalA?.enabled ?? false);
            const enabledB =
              schoolB != null ? schoolB.enabled : (globalB?.enabled ?? false);
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
                        <InheritedBadge enabled={globalEnabled} visible={globalVisible} />
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
                                  selectedSchoolId &&
                                  checked === globalEnabled &&
                                  newVisibleNorm === globalVisible
                                ) {
                                  onRemovePermission({
                                    featureId: feature.id,
                                    level: "school",
                                    targetId: selectedSchoolId,
                                  });
                                } else {
                                  onSetPermission({
                                    featureId: feature.id,
                                    level: "school",
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
                                const newEnabled =
                                  schoolPerm?.enabled ?? effectiveEnabled;
                                const newVisibleNorm = checked ?? newEnabled;
                                if (
                                  selectedSchoolId &&
                                  newEnabled === globalEnabled &&
                                  newVisibleNorm === globalVisible
                                ) {
                                  onRemovePermission({
                                    featureId: feature.id,
                                    level: "school",
                                    targetId: selectedSchoolId,
                                  });
                                } else {
                                  onSetPermission({
                                    featureId: feature.id,
                                    level: "school",
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
        })()
      )}
    </div>
  );
}
