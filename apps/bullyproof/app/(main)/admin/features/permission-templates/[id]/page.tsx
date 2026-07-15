"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiFetch } from "@/lib/api/fetcher.client";
import { useRoles } from "@/entities/users/model/store";
import { rolesApi } from "@/entities/roles/api/endpoints";
import { RoleBadges } from "@/components/atoms/role-badges";
import { sortPlatformRoles } from "@/lib/role-keys";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Loader2, Pencil, Save } from "lucide-react";

type TemplateRule = {
  id: string;
  featureKey: string;
  level: "school" | "school_role" | "role";
  roleKey: string | null;
  enabled: boolean;
  visible: boolean | null;
};

type PermissionTemplateWithRules = {
  id: string;
  name: string;
  scope: "school" | "platform_role";
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  rules: TemplateRule[];
};

type PermissionTemplateListItem = {
  id: string;
  name: string;
  scope: "school" | "platform_role";
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

type Feature = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
};

type ScopeKey = string;

type MatrixCell = {
  enabled: boolean;
  visible: boolean;
};

type MatrixState = Record<string, Record<ScopeKey, MatrixCell>>;

type PlatformRole = { id: string; key: string; name: string };
const EMPTY_PLATFORM_ROLES: PlatformRole[] = [];

const SCOPE_LABELS: Record<ScopeKey, string> = {
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "AP Teacher",
  SCHOOL_STAFF: "School Staff",
  SCHOOL_LICENCE: "School Licence",
};

const SCHOOL_ROLE_SCOPES: ScopeKey[] = [
  "SCHOOL_ADMIN",
  "TEACHER",
  "SCHOOL_STAFF",
  "SCHOOL_LICENCE",
];

function isSchoolTemplateFeatureKey(featureKey: string): boolean {
  if (!featureKey) return false;
  if (featureKey.startsWith("/admin")) return false;
  if (featureKey.startsWith("system:")) return false;
  if (featureKey.startsWith("admin:")) return false;
  return true;
}

function buildEmptyCell(): MatrixCell {
  return { enabled: false, visible: false };
}

function buildInitialMatrix(
  featureKeys: string[],
  rules: TemplateRule[],
  scopes: ScopeKey[],
  templateScope: "school" | "platform_role"
): MatrixState {
  const state: MatrixState = {};
  for (const featureKey of featureKeys) {
    state[featureKey] = Object.fromEntries(
      scopes.map((scope) => [scope, buildEmptyCell()])
    );
  }

  for (const rule of rules) {
    const scope: ScopeKey | null = rule.roleKey;
    const expectedLevel = templateScope === "school" ? "school_role" : "role";
    if (rule.level !== expectedLevel) continue;
    if (!scope) continue;
    if (!scopes.includes(scope)) continue;
    if (!state[rule.featureKey]) {
      state[rule.featureKey] = Object.fromEntries(
        scopes.map((key) => [key, buildEmptyCell()])
      );
    }
    state[rule.featureKey][scope] = {
      enabled: rule.enabled,
      visible: rule.visible ?? rule.enabled,
    };
  }

  return state;
}

export default function PermissionTemplateDetailsPage() {
  const params = useParams<{ id: string }>();
  const templateId = params?.id;
  const queryClient = useQueryClient();
  usePageTitle(["admin", "features", "Permission Templates", "Edit"]);

  const { roles } = useRoles();
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [importTemplateId, setImportTemplateId] = useState<string>("");

  const {
    data: template,
    isLoading: isLoadingTemplate,
    error: templateError,
  } = useQuery<PermissionTemplateWithRules>({
    queryKey: ["permission-template", templateId],
    enabled: Boolean(templateId),
    queryFn: async () => {
      const result = await apiFetch<PermissionTemplateWithRules>(
        `/permission-templates/${templateId}`
      );
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("Template not found");
      return result.data;
    },
  });

  const {
    data: features = [],
    isLoading: isLoadingFeatures,
    error: featuresError,
  } = useQuery<Feature[]>({
    queryKey: ["features", "permission-template-editor"],
    queryFn: async () => {
      const result = await apiFetch<Feature[]>("/features");
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const { data: templates = [] } = useQuery<PermissionTemplateListItem[]>({
    queryKey: ["permission-templates", "list"],
    queryFn: async () => {
      const result = await apiFetch<PermissionTemplateListItem[]>(
        "/permission-templates"
      );
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  const schoolRoleLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const role of roles) {
      if (SCHOOL_ROLE_SCOPES.includes(role.key as ScopeKey)) {
        map.set(role.key, role.name);
      }
    }
    return map;
  }, [roles]);

  const { data: platformRolesData } = useQuery<PlatformRole[]>({
    queryKey: ["roles", "platform", "permission-template-editor"],
    queryFn: async () => {
      const result = await rolesApi.get.list({ scope: "platform" });
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });
  const sortedPlatformRoles = useMemo(
    () => sortPlatformRoles(platformRolesData ?? EMPTY_PLATFORM_ROLES),
    [platformRolesData]
  );

  const templateScope = template?.scope ?? "school";
  const allScopes = useMemo<ScopeKey[]>(() => {
    if (templateScope === "platform_role") {
      return sortedPlatformRoles
        .map((role) => role.key)
        .filter((key): key is string => Boolean(key))
    }
    return SCHOOL_ROLE_SCOPES;
  }, [sortedPlatformRoles, templateScope]);

  const featureKeys = useMemo(() => {
    const keys = new Set(
      features
        .map((f) => f.key)
        .filter((featureKey) =>
          templateScope === "school"
            ? isSchoolTemplateFeatureKey(featureKey)
            : true
        )
    );
    for (const rule of template?.rules ?? []) {
      const canInclude =
        templateScope === "school"
          ? isSchoolTemplateFeatureKey(rule.featureKey)
          : true;
      if (canInclude) {
        keys.add(rule.featureKey);
      }
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [features, template?.rules, templateScope]);

  const featureByKey = useMemo(() => {
    return new Map(features.map((feature) => [feature.key, feature]));
  }, [features]);

  useEffect(() => {
    if (!template) return;
    setMatrix(buildInitialMatrix(featureKeys, template.rules, allScopes, templateScope));
  }, [template, featureKeys, allScopes, templateScope]);

  useEffect(() => {
    if (!template) return;
    setDraftName(template.name);
    setDraftDescription(template.description ?? "");
  }, [template]);

  const updateCell = (
    featureKey: string,
    scope: ScopeKey,
    changes: Partial<MatrixCell>
  ) => {
    setMatrix((prev) => ({
      ...prev,
      [featureKey]: {
        ...(prev[featureKey] ?? {
          ...Object.fromEntries(allScopes.map((key) => [key, buildEmptyCell()])),
        }),
        [scope]: {
          ...(prev[featureKey]?.[scope] ?? buildEmptyCell()),
          ...changes,
        },
      },
    }));
  };

  const setColumnAccess = (scope: ScopeKey, enabled: boolean) => {
    setMatrix((prev) => {
      const next: MatrixState = { ...prev };
      for (const featureKey of featureKeys) {
        const existingRow =
          prev[featureKey] ??
          Object.fromEntries(allScopes.map((key) => [key, buildEmptyCell()]));
        const existingCell = existingRow[scope] ?? buildEmptyCell();
        next[featureKey] = {
          ...existingRow,
          [scope]: {
            ...existingCell,
            enabled,
            // Access implies visibility.
            visible: enabled ? true : existingCell.visible,
          },
        };
      }
      return next;
    });
  };

  const setColumnVisible = (scope: ScopeKey, visible: boolean) => {
    setMatrix((prev) => {
      const next: MatrixState = { ...prev };
      for (const featureKey of featureKeys) {
        const existingRow =
          prev[featureKey] ??
          Object.fromEntries(allScopes.map((key) => [key, buildEmptyCell()]));
        const existingCell = existingRow[scope] ?? buildEmptyCell();
        next[featureKey] = {
          ...existingRow,
          [scope]: {
            ...existingCell,
            visible,
          },
        };
      }
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error("Missing template ID");
      const rules: Array<{
        featureKey: string;
        level: "school" | "school_role" | "role";
        roleKey?: string;
        enabled: boolean;
        visible: boolean;
      }> = [];

      if (template.scope === "school") {
        const preservedSchoolRules = (template.rules ?? []).filter(
          (rule) =>
            rule.level === "school" && isSchoolTemplateFeatureKey(rule.featureKey)
        );
        for (const rule of preservedSchoolRules) {
          rules.push({
            featureKey: rule.featureKey,
            level: "school",
            enabled: rule.enabled,
            visible: rule.visible ?? rule.enabled,
          });
        }
      }

      for (const featureKey of featureKeys) {
        const row = matrix[featureKey];
        if (!row) continue;
        for (const scope of allScopes) {
          const cell = row[scope] ?? buildEmptyCell();
          rules.push({
            featureKey,
            level: template.scope === "school" ? "school_role" : "role",
            roleKey: scope,
            enabled: cell.enabled,
            visible: cell.visible,
          });
        }
      }

      const result = await apiFetch<PermissionTemplateWithRules>(
        `/permission-templates/${templateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules }),
        }
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Template matrix updated");
      queryClient.invalidateQueries({ queryKey: ["permission-template", templateId] });
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save template");
    },
  });

  const saveMetadataMutation = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error("Missing template ID");
      const cleanedName = draftName.trim();
      if (!cleanedName) {
        throw new Error("Template name is required");
      }
      const result = await apiFetch<PermissionTemplateWithRules>(
        `/permission-templates/${templateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanedName,
            description: draftDescription.trim() || null,
          }),
        }
      );
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Template details updated");
      setIsMetadataDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["permission-template", templateId] });
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update template details");
    },
  });

  const importTemplateMutation = useMutation({
    mutationFn: async (sourceTemplateId: string) => {
      const result = await apiFetch<PermissionTemplateWithRules>(
        `/permission-templates/${sourceTemplateId}`
      );
      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error("Template not found");
      return result.data;
    },
    onSuccess: (sourceTemplate) => {
      const expectedLevel = template.scope === "school" ? "school_role" : "role";
      const canIncludeFeature = (featureKey: string) =>
        template.scope === "school"
          ? isSchoolTemplateFeatureKey(featureKey)
          : true;
      const importedRules = (sourceTemplate.rules ?? []).filter(
        (rule) =>
          canIncludeFeature(rule.featureKey) &&
          rule.level === expectedLevel &&
          !!rule.roleKey &&
          allScopes.includes(rule.roleKey as ScopeKey)
      );
      setMatrix(buildInitialMatrix(featureKeys, importedRules, allScopes, template.scope));
      toast.success(`Imported rules from "${sourceTemplate.name}"`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to import template");
    },
  });

  const isLoading = isLoadingTemplate || isLoadingFeatures;
  const error = templateError || featuresError;

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load template"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !template) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[460px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/admin/features/permission-templates">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to templates
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-2xl font-bold hover:opacity-80 transition-opacity"
            onClick={() => setIsMetadataDialogOpen(true)}
          >
            {template.name}
            <Pencil className="h-5 w-5 text-muted-foreground" />
          </button>
          <p className="text-muted-foreground">
            {template.description || "Edit role-aware visibility and access matrix."}
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save changes
        </Button>
      </div>

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Configure `Access` and `Visible` for each feature per{" "}
                {template.scope === "school" ? "school role" : "platform role"}.
                Visible allows display; Access controls functionality.
              </CardDescription>
            </div>
            <div className="w-full max-w-sm flex items-center gap-2">
              <Select
                value={importTemplateId}
                onValueChange={setImportTemplateId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Import from template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter((item) => item.id !== template.id)
                    .filter((item) => item.scope === template.scope)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => importTemplateMutation.mutate(importTemplateId)}
                disabled={
                  importTemplateId === "" || importTemplateMutation.isPending
                }
              >
                {importTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0">
          <ScrollArea className="h-[60vh] w-full border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Feature</TableHead>
                  {allScopes.map((scope) => (
                    <TableHead key={scope} className="min-w-[180px]">
                      <RoleBadges
                        roles={[
                          {
                            roleKey: scope,
                            roleName:
                              template.scope === "school"
                                ? schoolRoleLabels.get(scope) || SCOPE_LABELS[scope]
                                : (platformRolesData ?? EMPTY_PLATFORM_ROLES).find(
                                    (role) => role.key === scope
                                  )?.name ||
                                  scope,
                            isPlatform: template.scope === "platform_role",
                          },
                        ]}
                        variant="joined"
                        size="sm"
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-medium text-xs text-muted-foreground">
                    Column controls
                  </TableCell>
                  {allScopes.map((scope) => {
                    const allAccessEnabled =
                      featureKeys.length > 0 &&
                      featureKeys.every((featureKey) => {
                        const row = matrix[featureKey];
                        const cell = row?.[scope] ?? buildEmptyCell();
                        return cell.enabled;
                      });
                    const allVisibleEnabled =
                      featureKeys.length > 0 &&
                      featureKeys.every((featureKey) => {
                        const row = matrix[featureKey];
                        const cell = row?.[scope] ?? buildEmptyCell();
                        return cell.visible;
                      });
                    return (
                      <TableCell key={`column-controls-${scope}`}>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={allAccessEnabled}
                              onCheckedChange={(checked) =>
                                setColumnAccess(scope, Boolean(checked))
                              }
                            />
                            All access
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={allVisibleEnabled}
                              onCheckedChange={(checked) =>
                                setColumnVisible(scope, Boolean(checked))
                              }
                            />
                            All visible
                          </label>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
                {featureKeys.map((featureKey) => {
                  const feature = featureByKey.get(featureKey);
                  const row =
                    matrix[featureKey] ??
                    Object.fromEntries(
                      allScopes.map((scope) => [scope, buildEmptyCell()])
                    );

                  return (
                    <TableRow key={featureKey}>
                      <TableCell>
                        <div className="font-medium">{feature?.name ?? featureKey}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {featureKey}
                        </div>
                      </TableCell>
                      {allScopes.map((scope) => {
                        const cell = row[scope] ?? buildEmptyCell();
                        return (
                          <TableCell key={`${featureKey}-${scope}`}>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  checked={cell.enabled}
                                  onCheckedChange={(checked) =>
                                    updateCell(featureKey, scope, {
                                      enabled: Boolean(checked),
                                      visible: Boolean(checked)
                                        ? true
                                        : cell.visible,
                                    })
                                  }
                                />
                                Access
                              </label>
                              <label className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  checked={cell.visible}
                                  onCheckedChange={(checked) =>
                                    updateCell(featureKey, scope, {
                                      visible: Boolean(checked),
                                    })
                                  }
                                />
                                Visible
                              </label>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isMetadataDialogOpen} onOpenChange={setIsMetadataDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit template details</DialogTitle>
            <DialogDescription>
              Update the template title and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Title</Label>
              <Input
                id="template-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Template title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Template description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMetadataDialogOpen(false)}
              disabled={saveMetadataMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMetadataMutation.mutate()}
              disabled={saveMetadataMutation.isPending || draftName.trim() === ""}
            >
              {saveMetadataMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
