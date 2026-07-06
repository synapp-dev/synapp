"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiFetch } from "@/lib/api/fetcher.client";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Unlock,
  Lock,
  Loader2,
  AlertCircle,
  School,
  Users,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { toast } from "sonner";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";
import { rolesApi } from "@/entities/roles/api/endpoints";

type PermissionTemplate = {
  id: string;
  name: string;
  scope: "school" | "platform_role";
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

type PermissionTemplateWithRules = PermissionTemplate & {
  rules: Array<{
    id: string;
    featureKey: string;
    level: "school" | "school_role" | "role";
    roleKey: string | null;
    enabled: boolean;
    visible: boolean | null;
  }>;
};

export default function PermissionTemplatesPage() {
  usePageTitle(["admin", "features", "Permission Templates"]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [applyDialog, setApplyDialog] = useState<{
    template: PermissionTemplateWithRules;
    action: "apply" | "revoke";
  } | null>(null);

  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery<PermissionTemplate[]>({
    queryKey: ["permission-templates"],
    queryFn: async () => {
      const result = await apiFetch<PermissionTemplate[]>("/permission-templates");
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async ({
      templateId,
      targetIds,
      targetType,
      action,
    }: {
      templateId: string;
      targetIds: string[];
      targetType: "school" | "platform_role";
      action: "apply" | "revoke";
    }) => {
      const path =
        action === "apply"
          ? `/permission-templates/${templateId}/apply`
          : `/permission-templates/${templateId}/revoke`;
      const result = await apiFetch<{ applied?: number; revoked?: number }>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          targetType === "school"
            ? { schoolIds: targetIds }
            : { roleIds: targetIds }
        ),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (_, vars) => {
      const targetLabel = vars.targetType === "school" ? "school" : "platform role";
      toast.success(
        vars.action === "apply"
          ? `Template applied to ${vars.targetIds.length} ${targetLabel}(s)`
          : `Template revoked from ${vars.targetIds.length} ${targetLabel}(s)`
      );
      setApplyDialog(null);
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
      queryClient.invalidateQueries({ queryKey: ["feature-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to apply/revoke template");
    },
  });

  const schoolTemplates = templates.filter((t) => t.scope !== "platform_role");
  const platformRoleTemplates = templates.filter((t) => t.scope === "platform_role");

  if (templatesError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {templatesError instanceof Error
              ? templatesError.message
              : "Failed to load permission templates"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Permission Templates</h1>
        <p className="text-muted-foreground">
          One-click apply or revoke permission bundles for schools and platform
          roles.
        </p>
      </div>

      {isLoadingTemplates ? (
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : templates.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No permission templates found. Create one to get started.
        </div>
      ) : (
        <Tabs defaultValue="school" className="space-y-4">
          <TabsList>
            <TabsTrigger value="school">Schools</TabsTrigger>
            <TabsTrigger value="platform_role">Platform Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="school">
            {schoolTemplates.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No school templates found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={() => {
                      fetchTemplateWithRules(template.id).then((t) => {
                        if (t) setApplyDialog({ template: t, action: "apply" });
                      });
                    }}
                    onRevoke={() => {
                      fetchTemplateWithRules(template.id).then((t) => {
                        if (t) setApplyDialog({ template: t, action: "revoke" });
                      });
                    }}
                    onOpen={() =>
                      router.push(`/admin/features/permission-templates/${template.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="platform_role">
            {platformRoleTemplates.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                No platform role templates found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformRoleTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onApply={() => {
                      fetchTemplateWithRules(template.id).then((t) => {
                        if (t) setApplyDialog({ template: t, action: "apply" });
                      });
                    }}
                    onRevoke={() => {
                      fetchTemplateWithRules(template.id).then((t) => {
                        if (t) setApplyDialog({ template: t, action: "revoke" });
                      });
                    }}
                    onOpen={() =>
                      router.push(`/admin/features/permission-templates/${template.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {applyDialog && (
        <ApplyRevokeDialog
          template={applyDialog.template}
          action={applyDialog.action}
          onClose={() => setApplyDialog(null)}
          onSubmit={(schoolIds) => {
            applyMutation.mutate({
              templateId: applyDialog.template.id,
              targetIds: schoolIds,
              targetType: applyDialog.template.scope,
              action: applyDialog.action,
            });
          }}
          isPending={applyMutation.isPending}
        />
      )}
    </div>
  );
}

async function fetchTemplateWithRules(
  id: string
): Promise<PermissionTemplateWithRules | null> {
  const result = await apiFetch<PermissionTemplateWithRules>(
    `/permission-templates/${id}`
  );
  if (result.error || !result.data) return null;
  return result.data;
}

type TemplateSchoolStatus = {
  statusBySchoolId: Record<string, boolean>;
  activeCount: number;
};

function useTemplateSchoolStatus(templateId: string, enabled: boolean) {
  return useQuery<TemplateSchoolStatus>({
    queryKey: ["permission-templates", templateId, "school-status"],
    enabled,
    queryFn: async () => {
      const result = await apiFetch<TemplateSchoolStatus>(
        `/permission-templates/${templateId}/status`
      );
      if (result.error) throw new Error(result.error.message);
      return result.data ?? { statusBySchoolId: {}, activeCount: 0 };
    },
  });
}

function TemplateCard({
  template,
  onApply,
  onRevoke,
  onOpen,
}: {
  template: PermissionTemplate;
  onApply: () => void;
  onRevoke: () => void;
  onOpen: () => void;
}) {
  const isSchoolTemplate = template.scope === "school";
  const { data: schoolStatus } = useTemplateSchoolStatus(
    template.id,
    isSchoolTemplate
  );
  return (
    <div
      className="border rounded-lg p-5 flex flex-col gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          {isSchoolTemplate ? (
            <School className="h-5 w-5" />
          ) : (
            <Users className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{template.name}</h3>
            {isSchoolTemplate && (schoolStatus?.activeCount ?? 0) > 0 && (
              <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active on {schoolStatus?.activeCount} school
                {schoolStatus?.activeCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isSchoolTemplate ? "School template" : "Platform role template"}
          </p>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {template.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-auto">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link
            href={`/admin/features/permission-templates/${template.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit matrix
          </Link>
        </Button>
        <Button
          size="sm"
          variant="default"
          onClick={(event) => {
            event.stopPropagation();
            onApply();
          }}
          className="flex-1"
        >
          <Unlock className="h-4 w-4 mr-1.5" />
          Unlock
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onRevoke();
          }}
          className="flex-1"
        >
          <Lock className="h-4 w-4 mr-1.5" />
          Lock
        </Button>
      </div>
    </div>
  );
}

function ApplyRevokeDialog({
  template,
  action,
  onClose,
  onSubmit,
  isPending,
}: {
  template: PermissionTemplateWithRules;
  action: "apply" | "revoke";
  onClose: () => void;
  onSubmit: (schoolIds: string[]) => void;
  isPending: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const targetType = template.scope;
  const isSchoolMode = targetType === "school";

  const { data: schools = [], isLoading } = useListSchoolsQuery(
    { limit: 100 },
    { enabled: isSchoolMode }
  );
  const { data: schoolStatus } = useTemplateSchoolStatus(
    template.id,
    isSchoolMode
  );
  const { data: platformRoles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles", "platform", "permission-template-dialog"],
    enabled: !isSchoolMode,
    queryFn: async () => {
      const result = await rolesApi.get.list({ scope: "platform" });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const toggleSchool = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(
      new Set(
        isSchoolMode ? schools.map((s) => s.id) : platformRoles.map((r) => r.id)
      )
    );
  };

  const clearAll = () => setSelectedIds(new Set());

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      toast.error(
        isSchoolMode
          ? "Select at least one school"
          : "Select at least one platform role"
      );
      return;
    }
    onSubmit(Array.from(selectedIds));
  };

  const ruleSummary = (() => {
    const byRole = new Map<string, string[]>();
    for (const r of template.rules ?? []) {
      if (!r.enabled) continue;
      if ((r.level === "school_role" || r.level === "role") && r.roleKey) {
        const arr = byRole.get(r.roleKey) ?? [];
        if (!arr.includes(r.featureKey)) arr.push(r.featureKey);
        byRole.set(r.roleKey, arr);
      } else if (r.level === "school") {
        const arr = byRole.get("(school)") ?? [];
        if (!arr.includes(r.featureKey)) arr.push(r.featureKey);
        byRole.set("(school)", arr);
      }
    }
    return Array.from(byRole.entries())
      .map(([role, keys]) => `${role}: ${keys.length} enabled feature(s)`)
      .join("; ");
  })();

  const permissionMatrixRows = (() => {
    const rows = new Map<string, Set<string>>();
    for (const rule of template.rules ?? []) {
      if (!rule.enabled) continue;
      const roleLabel =
        (rule.level === "school_role" || rule.level === "role") && rule.roleKey
          ? rule.roleKey
          : "SCHOOL";
      const existing = rows.get(rule.featureKey) ?? new Set<string>();
      existing.add(roleLabel);
      rows.set(rule.featureKey, existing);
    }
    return Array.from(rows.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([featureKey, roles]) => ({
        featureKey,
        roles: Array.from(roles).sort((a, b) => a.localeCompare(b)),
      }));
  })();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {action === "apply" ? "Unlock" : "Lock"} &quot;{template.name}&quot;
          </DialogTitle>
          <DialogDescription>
            {action === "apply"
              ? isSchoolMode
                ? "Select schools to unlock this permission template for."
                : "Select platform roles to unlock this permission template for."
              : isSchoolMode
                ? "Select schools to revoke this template from."
                : "Select platform roles to revoke this template from."}
            {ruleSummary && (
              <span className="block mt-2 text-xs text-muted-foreground">
                Rules: {ruleSummary}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-md p-3 min-h-0">
            <div className="text-sm font-medium mb-2">Permission matrix</div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {permissionMatrixRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No enabled permission rules in this template.
                </p>
              ) : (
                permissionMatrixRows.map((row) => (
                  <div
                    key={row.featureKey}
                    className="rounded-md border bg-muted/20 px-3 py-2"
                  >
                    <div className="text-sm font-medium">{row.featureKey}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.roles.join(", ")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2 border rounded-md p-3 min-h-0">
            <div className="flex gap-2 mb-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {isSchoolMode && isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : !isSchoolMode && isLoadingRoles ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                (isSchoolMode ? schools : platformRoles).map((target) => {
                  const isActive =
                    isSchoolMode &&
                    (schoolStatus?.statusBySchoolId?.[target.id] ?? false);
                  return (
                    <div
                      key={target.id}
                      className="flex items-center gap-2 py-1.5 hover:bg-accent/50 rounded px-2 cursor-pointer"
                      onClick={() => toggleSchool(target.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(target.id)}
                        onCheckedChange={() => toggleSchool(target.id)}
                      />
                      {isSchoolMode ? (
                        <School className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm flex-1">{target.name}</span>
                      {isActive && (
                        <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "apply" ? "Unlock" : "Lock"} ({selectedIds.size}{" "}
            {isSchoolMode ? "school" : "platform role"}
            {selectedIds.size !== 1 ? "s" : ""})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
