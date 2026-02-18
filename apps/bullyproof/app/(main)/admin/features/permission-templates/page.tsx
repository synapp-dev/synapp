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
  Layers,
  School,
  Pencil,
} from "lucide-react";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { toast } from "sonner";
import { useListSchoolsQuery } from "@/entities/school/model/useListSchoolsQuery";

type PermissionTemplate = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

type PermissionTemplateWithRules = PermissionTemplate & {
  rules: Array<{
    id: string;
    featureKey: string;
    level: string;
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
      schoolIds,
      action,
    }: {
      templateId: string;
      schoolIds: string[];
      action: "apply" | "revoke";
    }) => {
      const path =
        action === "apply"
          ? `/permission-templates/${templateId}/apply`
          : `/permission-templates/${templateId}/revoke`;
      const result = await apiFetch<{ applied?: number; revoked?: number }>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolIds }),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "apply"
          ? `Template applied to ${vars.schoolIds.length} school(s)`
          : `Template revoked from ${vars.schoolIds.length} school(s)`
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
          One-click apply or revoke permission bundles for schools. Unlock
          lessons, content, and role-based access in bulk.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
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

      {applyDialog && (
        <ApplyRevokeDialog
          template={applyDialog.template}
          action={applyDialog.action}
          onClose={() => setApplyDialog(null)}
          onSubmit={(schoolIds) => {
            applyMutation.mutate({
              templateId: applyDialog.template.id,
              schoolIds,
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
  return (
    <div
      className="border rounded-lg p-5 flex flex-col gap-3 cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{template.name}</h3>
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

  const { data: schools = [], isLoading } = useListSchoolsQuery(
    { limit: 200 },
    { enabled: true }
  );

  const toggleSchool = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(schools.map((s) => s.id)));
  };

  const clearAll = () => setSelectedIds(new Set());

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one school");
      return;
    }
    onSubmit(Array.from(selectedIds));
  };

  const ruleSummary = (() => {
    const byRole = new Map<string, string[]>();
    for (const r of template.rules ?? []) {
      if (r.level === "school_role" && r.roleKey) {
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
      .map(([role, keys]) => `${role}: ${keys.length} feature(s)`)
      .join("; ");
  })();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {action === "apply" ? "Unlock" : "Lock"} &quot;{template.name}&quot;
          </DialogTitle>
          <DialogDescription>
            {action === "apply"
              ? "Select schools to unlock this permission template for."
              : "Select schools to revoke this template from."}
            {ruleSummary && (
              <span className="block mt-2 text-xs text-muted-foreground">
                Rules: {ruleSummary}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Clear
            </Button>
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            schools.map((school) => (
              <div
                key={school.id}
                className="flex items-center gap-2 py-1.5 hover:bg-accent/50 rounded px-2 cursor-pointer"
                onClick={() => toggleSchool(school.id)}
              >
                <Checkbox
                  checked={selectedIds.has(school.id)}
                  onCheckedChange={() => toggleSchool(school.id)}
                />
                <School className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{school.name}</span>
              </div>
            ))
          )}
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
            {action === "apply" ? "Unlock" : "Lock"} ({selectedIds.size} school
            {selectedIds.size !== 1 ? "s" : ""})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
