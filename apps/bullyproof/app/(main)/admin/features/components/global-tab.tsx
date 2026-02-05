"use client";

import React from "react";
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
import { useGlobalPermissionsQuery } from "@/entities/feature-permissions/model/useAdminFeaturePermissions";

export type Feature = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeaturePermission = {
  id: string;
  featureId: string;
  level: "global" | "role" | "school" | "user";
  targetId: string | null;
  enabled: boolean;
  visible?: boolean | null;
};

type GlobalTabProps = {
  features: Feature[];
  isLoadingFeatures: boolean;
  onSetPermission: (data: {
    featureId: string;
    level: "global";
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  isMutationPending: boolean;
};

export function GlobalTab({
  features,
  isLoadingFeatures,
  onSetPermission,
  isMutationPending,
}: GlobalTabProps) {
  const { isLoading, byFeatureId } = useGlobalPermissionsQuery();
  const permissionByFeatureId = byFeatureId;

  const sortedFeatures = React.useMemo(() => {
    if (features.length === 0) return [];
    return [...features].sort((a, b) => {
      const permA = permissionByFeatureId[a.id];
      const permB = permissionByFeatureId[b.id];
      const enabledA = permA?.enabled ?? false;
      const enabledB = permB?.enabled ?? false;
      const visibleA = permA?.visible ?? enabledA;
      const visibleB = permB?.visible ?? enabledB;
      const rankA = enabledA ? 0 : visibleA ? 1 : 2;
      const rankB = enabledB ? 0 : visibleB ? 1 : 2;
      if (rankA !== rankB) return rankA - rankB;
      return (a.name || a.key).localeCompare(b.name || b.key);
    });
  }, [features, permissionByFeatureId]);

  if (isLoadingFeatures) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Global Access</TableHead>
              <TableHead>Global Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-6 w-14" /></TableCell>
                <TableCell><Skeleton className="h-6 w-14" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No features found. Create your first feature to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Global Access</TableHead>
            <TableHead className="text-center">Global Visible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFeatures.map((feature) => {
            const perm = permissionByFeatureId[feature.id];
            const enabled = perm?.enabled ?? false;
            const visible = perm?.visible ?? enabled;
            const permLoading = isLoading;
            const rowClass =
              enabled && visible
                ? "bg-green-500/10"
                : visible && !enabled
                  ? "bg-blue-500/10"
                  : undefined;

            return (
              <TableRow key={feature.id} className={rowClass}>
                <TableCell className="font-mono text-sm">{feature.key}</TableCell>
                <TableCell className="font-medium">{feature.name}</TableCell>
                <TableCell>
                  {feature.category && (
                    <Badge variant="outline">{feature.category}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {feature.description || "-"}
                </TableCell>
                <TableCell className="w-[120px]">
                  {permLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Label className="text-xs text-muted-foreground sr-only">Access</Label>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          onSetPermission({
                            featureId: feature.id,
                            level: "global",
                            enabled: checked,
                            visible: perm?.visible ?? checked,
                          })
                        }
                        disabled={isMutationPending}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell className="w-[120px]">
                  {permLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Label className="text-xs text-muted-foreground sr-only">Visible</Label>
                      <Switch
                        checked={visible}
                        onCheckedChange={(checked) =>
                          onSetPermission({
                            featureId: feature.id,
                            level: "global",
                            enabled: perm?.enabled ?? false,
                            visible: checked,
                          })
                        }
                        disabled={isMutationPending}
                      />
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
