"use client";

import React, { useState, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiFetch } from "@/lib/api/fetcher.client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  Plus,
  Loader2,
  AlertCircle,
  Globe,
  Users,
  School,
  User,
  ChevronDown,
} from "lucide-react";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import { featurePermissionsKeys } from "@/entities/feature-permissions/model/keys";
import { useFeaturePermissionsStore } from "@/entities/feature-permissions/model/store";
import { MAINTENANCE_FEATURE_KEY, FEATURE_CATEGORIES } from "@/lib/feature-keys";
import {
  VALID_SECTION_SLUGS,
  getSectionByKey,
  SECTION_SUB_GROUPS,
  getAdminSubSection,
} from "@/lib/feature-sections";
import { GlobalTab, type Feature } from "../components/global-tab";
import { RoleTab } from "../components/role-tab";
import { SchoolTab } from "../components/school-tab";
import { UserTab } from "../components/user-tab";

type FeaturePermission = {
  id: string;
  featureId: string;
  level: "global" | "role" | "school" | "school_role" | "user";
  targetId: string | null;
  schoolId?: string | null;
  enabled: boolean;
  visible?: boolean | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Sub-group component ─────────────────────────────────────────────────────

function FeatureSubGroup({
  label,
  features,
  defaultOpen = true,
  onSetPermission,
  onRemovePermission,
  isMutationPending,
  isRemovePending,
}: {
  label: string;
  features: Feature[];
  defaultOpen?: boolean;
  onSetPermission: (data: {
    featureId: string;
    level: "global" | "role" | "school" | "school_role" | "user";
    targetId?: string;
    schoolId?: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => void;
  onRemovePermission: (data: {
    featureId: string;
    level: "role" | "school" | "school_role" | "user";
    targetId: string;
    schoolId?: string;
  }) => void;
  isMutationPending: boolean;
  isRemovePending: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Sort so maintenance feature always appears at the top
  const sortedFeatures = useMemo(
    () =>
      [...features].sort((a, b) =>
        a.key === MAINTENANCE_FEATURE_KEY
          ? -1
          : b.key === MAINTENANCE_FEATURE_KEY
            ? 1
            : (a.name || a.key).localeCompare(b.name || b.key)
      ),
    [features]
  );

  if (features.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 px-1 text-left hover:bg-accent/50 rounded-md transition-colors">
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
        />
        <span className="font-medium">{label}</span>
        <Badge variant="outline" className="ml-auto">
          {features.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-2">
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="role" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Platform Roles
            </TabsTrigger>
            <TabsTrigger value="school" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            <GlobalTab
              features={sortedFeatures}
              isLoadingFeatures={false}
              onSetPermission={(data) =>
                onSetPermission({ ...data, level: "global" })
              }
              isMutationPending={isMutationPending}
            />
          </TabsContent>

          <TabsContent value="role" className="mt-4">
            <RoleTab
              features={sortedFeatures}
              onSetPermission={(data) =>
                onSetPermission({
                  ...data,
                  level: "role",
                  targetId: data.targetId,
                })
              }
              onRemovePermission={onRemovePermission}
              isMutationPending={isMutationPending}
              isRemovePending={isRemovePending}
            />
          </TabsContent>

          <TabsContent value="school" className="mt-4">
            <SchoolTab
              features={sortedFeatures}
              onSetPermission={(data) =>
                onSetPermission({
                  ...data,
                  level: data.level,
                  targetId: data.targetId,
                  schoolId: data.schoolId,
                })
              }
              onRemovePermission={(data) =>
                onRemovePermission({
                  ...data,
                  level: data.level,
                  targetId: data.targetId,
                  schoolId: data.schoolId,
                })
              }
              isMutationPending={isMutationPending}
              isRemovePending={isRemovePending}
            />
          </TabsContent>

          <TabsContent value="user" className="mt-4">
            <UserTab
              features={sortedFeatures}
              onSetPermission={(data) =>
                onSetPermission({
                  ...data,
                  level: "user",
                  targetId: data.targetId,
                })
              }
              onRemovePermission={onRemovePermission}
              isMutationPending={isMutationPending}
              isRemovePending={isRemovePending}
            />
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main section page content ───────────────────────────────────────────────

function SectionPageContent({ sectionSlug }: { sectionSlug: string }) {
  const section = getSectionByKey(sectionSlug)!;
  usePageTitle(["admin", "features", section.label]);
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    key: "",
    name: "",
    description: "",
    category: "page",
  });

  const {
    data: allFeatures = [],
    isLoading: isLoadingFeatures,
    error: featuresError,
  } = useQuery<Feature[]>({
    queryKey: ["features"],
    queryFn: async () => {
      const result = await apiFetch<Feature[]>("/features");
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch features");
      }
      return result.data || [];
    },
  });

  // Filter features to this section
  const sectionFeatures = useMemo(
    () => allFeatures.filter((f) => f.section === sectionSlug),
    [allFeatures, sectionSlug]
  );

  // Group features by sub-section or category
  const groupedFeatures = useMemo(() => {
    const subSections = SECTION_SUB_GROUPS[sectionSlug];

    if (subSections) {
      // Group by sub-section (e.g., admin -> content, schools, users, etc.)
      const groups: { key: string; label: string; features: Feature[] }[] = [];
      const assigned = new Set<string>();

      for (const sub of subSections) {
        const matching = sectionFeatures.filter((f) => {
          const derivedSub = getAdminSubSection(f.key);
          return derivedSub === sub.key;
        });
        if (matching.length > 0) {
          groups.push({ key: sub.key, label: sub.label, features: matching });
          matching.forEach((f) => assigned.add(f.id));
        }
      }

      // Catch any unmatched features
      const unmatched = sectionFeatures.filter((f) => !assigned.has(f.id));
      if (unmatched.length > 0) {
        groups.push({ key: "other", label: "Other", features: unmatched });
      }

      return groups;
    }

    // No sub-sections: group by category type (page, action, component, system)
    const byType: Record<string, Feature[]> = {};
    for (const feature of sectionFeatures) {
      const cat = feature.category || "other";
      if (!byType[cat]) byType[cat] = [];
      byType[cat].push(feature);
    }

    const typeLabels: Record<string, string> = {
      page: "Pages",
      action: "Actions",
      component: "Components",
      system: "System",
      other: "Other",
    };

    return Object.entries(byType).map(([key, features]) => ({
      key,
      label: typeLabels[key] || key,
      features,
    }));
  }, [sectionFeatures, sectionSlug]);

  const createFeatureMutation = useMutation({
    mutationFn: async (data: {
      key: string;
      name: string;
      description?: string;
      category: string;
      section: string;
    }) => {
      const result = await apiFetch<Feature>("/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to create feature");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setIsCreateDialogOpen(false);
      setNewFeature({ key: "", name: "", description: "", category: "page" });
    },
  });

  const setPermissionMutation = useMutation({
    mutationFn: async (data: {
      featureId: string;
      level: "global" | "role" | "school" | "school_role" | "user";
      targetId?: string;
      schoolId?: string;
      enabled: boolean;
      visible?: boolean | null;
    }) => {
      const body: Record<string, unknown> = {
        featureId: data.featureId,
        level: data.level,
        enabled: data.enabled,
      };
      if (data.targetId) body.targetId = data.targetId;
      if (data.schoolId) body.schoolId = data.schoolId;
      if (data.visible !== undefined) body.visible = data.visible;

      const result = await apiFetch<FeaturePermission>(
        `/features/${data.featureId}/permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to set permission");
      }
      return result.data;
    },
    onMutate: (variables) => {
      const store = useFeaturePermissionsStore.getState();
      const { featureId, level, targetId, schoolId, enabled, visible } =
        variables;
      const patch = {
        enabled,
        visible: visible !== undefined ? visible : enabled,
      };
      let previous: { enabled: boolean; visible: boolean | null } | null = null;
      let wasNew = false;

      if (level === "global") {
        const list = store.globalPermissions;
        const row = list.find((p) => p.featureId === featureId);
        if (row) {
          previous = { enabled: row.enabled, visible: row.visible ?? null };
          store.updateGlobalPermission(featureId, patch);
        } else {
          wasNew = true;
          store.setGlobalPermissionOptimistic(featureId, patch);
        }
      } else if (level === "role" && targetId) {
        const list = store.rolePermissions[targetId] ?? [];
        const row = list.find((p) => p.featureId === featureId);
        if (row) {
          previous = { enabled: row.enabled, visible: row.visible ?? null };
          store.updateRolePermission(targetId, featureId, patch);
        } else {
          wasNew = true;
          store.setRolePermissionOptimistic(targetId, featureId, patch);
        }
      } else if (level === "school" && targetId) {
        const list = store.schoolPermissions[targetId] ?? [];
        const row = list.find((p) => p.featureId === featureId);
        if (row) {
          previous = { enabled: row.enabled, visible: row.visible ?? null };
          store.updateSchoolPermission(targetId, featureId, patch);
        } else {
          wasNew = true;
          store.setSchoolPermissionOptimistic(targetId, featureId, patch);
        }
      } else if (level === "school_role" && targetId && schoolId) {
        const key = `${schoolId}:${targetId}`;
        const list = store.schoolRolePermissions[key] ?? [];
        const row = list.find((p) => p.featureId === featureId);
        if (row) {
          previous = { enabled: row.enabled, visible: row.visible ?? null };
          store.updateSchoolRolePermission(
            schoolId,
            targetId,
            featureId,
            patch
          );
        } else {
          wasNew = true;
          store.setSchoolRolePermissionOptimistic(
            schoolId,
            targetId,
            featureId,
            patch
          );
        }
      } else if (level === "user" && targetId) {
        const list = store.userPermissions[targetId] ?? [];
        const userRow = list.find(
          (r) => r.feature.id === featureId && r.permission.level === "user"
        );
        if (userRow) {
          previous = {
            enabled: userRow.permission.enabled,
            visible: userRow.permission.visible ?? null,
          };
          store.updateUserPermission(targetId, featureId, patch);
        } else {
          store.updateUserPermission(targetId, featureId, patch);
        }
      }

      return { previous, wasNew, level, featureId, targetId, schoolId };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      const store = useFeaturePermissionsStore.getState();
      const { previous, wasNew, level, featureId, targetId, schoolId } =
        context;
      if (level === "global") {
        if (wasNew) store.removeGlobalPermissionOptimistic(featureId);
        else if (previous) store.updateGlobalPermission(featureId, previous);
      } else if (level === "role" && targetId) {
        if (wasNew) store.removeRolePermissionOptimistic(targetId, featureId);
        else if (previous)
          store.updateRolePermission(targetId, featureId, previous);
      } else if (level === "school" && targetId) {
        if (wasNew)
          store.removeSchoolPermissionOptimistic(targetId, featureId);
        else if (previous)
          store.updateSchoolPermission(targetId, featureId, previous);
      } else if (level === "school_role" && targetId && schoolId) {
        if (wasNew)
          store.removeSchoolRolePermissionOptimistic(
            schoolId,
            targetId,
            featureId
          );
        else if (previous)
          store.updateSchoolRolePermission(
            schoolId,
            targetId,
            featureId,
            previous
          );
      } else if (level === "user" && targetId && previous) {
        store.updateUserPermission(targetId, featureId, previous);
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to update permission"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featurePermissionsKeys.all });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async (data: {
      featureId: string;
      level: "role" | "school" | "school_role" | "user";
      targetId: string;
      schoolId?: string;
    }) => {
      const params = new URLSearchParams({ level: data.level });
      params.set("targetId", data.targetId);
      if (data.schoolId) params.set("schoolId", data.schoolId);
      const result = await apiFetch(
        `/features/${data.featureId}/permissions?${params.toString()}`,
        { method: "DELETE" }
      );
      if (result.error) {
        throw new Error(result.error.message || "Failed to remove permission");
      }
    },
    onMutate: (variables) => {
      const store = useFeaturePermissionsStore.getState();
      const { featureId, level, targetId, schoolId } = variables;
      if (level === "role" && targetId) {
        store.removeRolePermissionOptimistic(targetId, featureId);
      } else if (level === "school" && targetId) {
        store.removeSchoolPermissionOptimistic(targetId, featureId);
      } else if (level === "school_role" && targetId && schoolId) {
        store.removeSchoolRolePermissionOptimistic(
          schoolId,
          targetId,
          featureId
        );
      } else if (level === "user" && targetId) {
        const list = store.userPermissions[targetId] ?? [];
        const next = list.filter(
          (r) => !(r.feature.id === featureId && r.permission.level === "user")
        );
        store.setUserPermissions(targetId, next);
      }
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: featurePermissionsKeys.all });
      toast.error(
        err instanceof Error ? err.message : "Failed to remove permission"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featurePermissionsKeys.all });
    },
  });

  const handleCreateFeature = () => {
    if (!newFeature.key || !newFeature.name) return;
    createFeatureMutation.mutate({
      key: newFeature.key,
      name: newFeature.name,
      description: newFeature.description || undefined,
      category: newFeature.category,
      section: sectionSlug,
    });
  };

  const handleSetPermission = (data: {
    featureId: string;
    level: "global" | "role" | "school" | "school_role" | "user";
    targetId?: string;
    schoolId?: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => {
    setPermissionMutation.mutate(data);
  };

  const handleRemovePermission = (data: {
    featureId: string;
    level: "role" | "school" | "school_role" | "user";
    targetId: string;
    schoolId?: string;
  }) => {
    removePermissionMutation.mutate(data);
  };

  if (featuresError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {featuresError instanceof Error
              ? featuresError.message
              : "Failed to load features"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const SectionIcon = section.icon;

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <SectionIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{section.label}</h1>
            <p className="text-muted-foreground">
              {section.description}
              {!isLoadingFeatures &&
                sectionFeatures.length > 0 &&
                ` ${sectionFeatures.length} feature${sectionFeatures.length !== 1 ? "s" : ""} in this section.`}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>

      {isLoadingFeatures ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : sectionFeatures.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No features in this section yet. Click &quot;Add Feature&quot; to
            create one.
          </p>
        </div>
      ) : groupedFeatures.length === 1 ? (
        /* Single group: show permission tabs directly without collapsible */
        <div>
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="global" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Global
              </TabsTrigger>
              <TabsTrigger value="role" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Platform Roles
              </TabsTrigger>
              <TabsTrigger value="school" className="flex items-center gap-2">
                <School className="h-4 w-4" />
                Schools
              </TabsTrigger>
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="mt-6">
              <GlobalTab
                features={groupedFeatures[0].features}
                isLoadingFeatures={false}
                onSetPermission={(data) =>
                  handleSetPermission({ ...data, level: "global" })
                }
                isMutationPending={setPermissionMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="role" className="mt-6">
              <RoleTab
                features={groupedFeatures[0].features}
                onSetPermission={(data) =>
                  handleSetPermission({
                    ...data,
                    level: "role",
                    targetId: data.targetId,
                  })
                }
                onRemovePermission={handleRemovePermission}
                isMutationPending={setPermissionMutation.isPending}
                isRemovePending={removePermissionMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="school" className="mt-6">
              <SchoolTab
                features={groupedFeatures[0].features}
                onSetPermission={(data) =>
                  handleSetPermission({
                    ...data,
                    level: data.level,
                    targetId: data.targetId,
                    schoolId: data.schoolId,
                  })
                }
                onRemovePermission={(data) =>
                  handleRemovePermission({
                    ...data,
                    level: data.level,
                    targetId: data.targetId,
                    schoolId: data.schoolId,
                  })
                }
                isMutationPending={setPermissionMutation.isPending}
                isRemovePending={removePermissionMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="user" className="mt-6">
              <UserTab
                features={groupedFeatures[0].features}
                onSetPermission={(data) =>
                  handleSetPermission({
                    ...data,
                    level: "user",
                    targetId: data.targetId,
                  })
                }
                onRemovePermission={handleRemovePermission}
                isMutationPending={setPermissionMutation.isPending}
                isRemovePending={removePermissionMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Multiple groups: show collapsible sub-groups */
        <div className="space-y-2">
          {groupedFeatures.map((group) => (
            <div key={group.key} className="border rounded-lg p-4">
              <FeatureSubGroup
                label={group.label}
                features={group.features}
                defaultOpen={groupedFeatures.length <= 3}
                onSetPermission={handleSetPermission}
                onRemovePermission={handleRemovePermission}
                isMutationPending={setPermissionMutation.isPending}
                isRemovePending={removePermissionMutation.isPending}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Feature Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Feature to {section.label}</DialogTitle>
            <DialogDescription>
              Create a new feature in the {section.label} section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Type</Label>
              <Select
                value={newFeature.category}
                onValueChange={(v) =>
                  setNewFeature({ ...newFeature, category: v })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="key">Key (machine-readable)</Label>
              <Input
                id="key"
                value={newFeature.key}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, key: e.target.value })
                }
                placeholder={
                  sectionSlug === "admin"
                    ? "e.g., /admin/users, admin:delete-user"
                    : "e.g., /school/lessons, header.theme-toggle"
                }
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newFeature.name}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, name: e.target.value })
                }
                placeholder="e.g., Edit User Details"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newFeature.description}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, description: e.target.value })
                }
                placeholder="Describe what this feature controls"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFeature}
              disabled={
                !newFeature.key ||
                !newFeature.name ||
                createFeatureMutation.isPending
              }
            >
              {createFeatureMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const sectionSlug = params.section;

  if (!VALID_SECTION_SLUGS.includes(sectionSlug)) {
    notFound();
  }

  return (
    <React.Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <SectionPageContent sectionSlug={sectionSlug} />
    </React.Suspense>
  );
}
