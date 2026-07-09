"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { meApi } from "@/entities/me/api/endpoints";
import { useUserPermissionsQuery } from "@/entities/feature-permissions/model/useAdminFeaturePermissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { UserFeaturePermissionRow } from "@/entities/feature-permissions/model/useAdminFeaturePermissions";
import type { ComboboxOption } from "@/components/molecules/combobox";

type PermissionRow = UserFeaturePermissionRow;

type UserTabProps = {
  features: Feature[];
  onSetPermission: (data: {
    featureId: string;
    level: "user";
    targetId: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    level: "user";
    targetId: string;
  }) => void;
  isMutationPending: boolean;
  isRemovePending: boolean;
};

function resolveInherited(rows: PermissionRow[]): { enabled: boolean; visible: boolean } {
  const byLevel = { user: null as PermissionRow | null, school: null as PermissionRow | null, role: null as PermissionRow | null, global: null as PermissionRow | null };
  rows.forEach((r) => {
    if (r.permission.level in byLevel) {
      byLevel[r.permission.level as keyof typeof byLevel] = r;
    }
  });
  const school = byLevel.school;
  const role = byLevel.role;
  const global = byLevel.global;
  const enabled = school?.permission.enabled ?? role?.permission.enabled ?? global?.permission.enabled ?? false;
  const visible = school?.permission.visible ?? role?.permission.visible ?? global?.permission.visible ?? enabled;
  return { enabled: !!enabled, visible: visible === true };
}

function InheritedBadge({ enabled, visible }: { enabled: boolean; visible: boolean }) {
  return (
    <Badge variant="outline" className="inline-flex items-center gap-1.5 px-2 py-1 text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Globe className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Inherited (Global)</TooltipContent>
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

function userToOption(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): ComboboxOption {
  const namePart =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "";
  const label = user.email ? `${namePart} (${user.email})` : namePart;
  return { value: user.id, label };
}

export function UserTab({
  features,
  onSetPermission,
  onRemovePermission,
  isMutationPending,
  isRemovePending,
}: UserTabProps) {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [selectedUserLabel, setSelectedUserLabel] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [comboboxOpen, setComboboxOpen] = React.useState(false);
  const pending = isMutationPending || isRemovePending;

  const debouncedSearch = useDebouncedValue(searchQuery, 500);

  const { data: searchResult } = useQuery({
    queryKey: ["users", "search", debouncedSearch],
    queryFn: async () => {
      const result = await meApi.get.listAllUsers({
        limit: 50,
        offset: 0,
        search: debouncedSearch.trim() || undefined,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? { users: [], totalCount: 0 };
    },
    enabled: comboboxOpen && debouncedSearch.trim().length >= 1,
  });

  const userOptions: ComboboxOption[] = React.useMemo(
    () => (searchResult?.users ?? []).map(userToOption),
    [searchResult?.users]
  );

  const { rows: userPermissionsRaw, isLoading: isLoadingUserPerms } =
    useUserPermissionsQuery(selectedUserId);

  const permissionsByFeatureId = React.useMemo(() => {
    const map: Record<string, { inherited: { enabled: boolean; visible: boolean }; user: { enabled: boolean; visible: boolean } | null }> = {};
    features.forEach((f) => {
      const rows = userPermissionsRaw.filter((r) => r.feature.id === f.id);
      const userRow = rows.find((r) => r.permission.level === "user");
      const inherited = resolveInherited(rows.filter((r) => r.permission.level !== "user"));
      map[f.id] = {
        inherited,
        user: userRow
          ? { enabled: userRow.permission.enabled, visible: userRow.permission.visible ?? userRow.permission.enabled }
          : null,
      };
    });
    return map;
  }, [features, userPermissionsRaw]);

  const handleComboboxOpenChange = (open: boolean) => {
    setComboboxOpen(open);
    setSearchQuery("");
  };

  const handleUserSelect = (value: string | null) => {
    setSelectedUserId(value);
    const option = userOptions.find((o) => o.value === value);
    setSelectedUserLabel(option?.label ?? null);
  };

  return (
    <div className="space-y-4">
      <Combobox
        options={userOptions}
        value={selectedUserId}
        onValueChange={handleUserSelect}
        placeholder="Choose a user..."
        searchPlaceholder="Search users..."
        emptyText={
          searchQuery.trim() === ""
            ? "Type to search users..."
            : "No users found."
        }
        triggerClassName="w-[320px]"
        displayLabel={selectedUserLabel ?? undefined}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        open={comboboxOpen}
        onOpenChange={handleComboboxOpenChange}
      />

      {!selectedUserId ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select a user to manage feature overrides. User settings override School, Role, and Global.
        </div>
      ) : features.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No features found.
        </div>
      ) : (
        (() => {
          const sortedFeatures = [...features].sort((a, b) => {
            const dataA = permissionsByFeatureId[a.id] ?? {
              inherited: { enabled: false, visible: false },
              user: null,
            };
            const dataB = permissionsByFeatureId[b.id] ?? {
              inherited: { enabled: false, visible: false },
              user: null,
            };
            const enabledA =
              dataA.user != null ? dataA.user.enabled : dataA.inherited.enabled;
            const enabledB =
              dataB.user != null ? dataB.user.enabled : dataB.inherited.enabled;
            const visibleA =
              dataA.user != null
                ? (dataA.user.visible ?? dataA.user.enabled)
                : dataA.inherited.visible;
            const visibleB =
              dataB.user != null
                ? (dataB.user.visible ?? dataB.user.enabled)
                : dataB.inherited.visible;
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
                <TableHead>Inherited (School / Role / Global)</TableHead>
                <TableHead className="text-center">Override for this user</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFeatures.map((feature) => {
                const { inherited, user } = permissionsByFeatureId[feature.id] ?? {
                  inherited: { enabled: false, visible: false },
                  user: null,
                };
                const effectiveEnabled =
                  user != null ? user.enabled : inherited.enabled;
                const effectiveVisible =
                  user != null ? (user.visible ?? user.enabled) : inherited.visible;
                const hasOverride = user != null;
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
                              This has been overridden for this user.
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
                    <TableCell className="w-[200px]">
                      <InheritedBadge
                        enabled={inherited.enabled}
                        visible={inherited.visible}
                      />
                    </TableCell>
                    <TableCell className="w-[200px]">
                      {isLoadingUserPerms ? (
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
                                  : (user?.visible ?? effectiveVisible);
                                const newVisibleNorm = newVisible ?? checked;
                                if (
                                  selectedUserId &&
                                  checked === inherited.enabled &&
                                  newVisibleNorm === inherited.visible
                                ) {
                                  onRemovePermission({
                                    featureId: feature.id,
                                    level: "user",
                                    targetId: selectedUserId,
                                  });
                                } else {
                                  onSetPermission({
                                    featureId: feature.id,
                                    level: "user",
                                    targetId: selectedUserId,
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
                                  user?.enabled ?? effectiveEnabled;
                                const newVisibleNorm = checked ?? newEnabled;
                                if (
                                  selectedUserId &&
                                  newEnabled === inherited.enabled &&
                                  newVisibleNorm === inherited.visible
                                ) {
                                  onRemovePermission({
                                    featureId: feature.id,
                                    level: "user",
                                    targetId: selectedUserId,
                                  });
                                } else {
                                  onSetPermission({
                                    featureId: feature.id,
                                    level: "user",
                                    targetId: selectedUserId,
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
