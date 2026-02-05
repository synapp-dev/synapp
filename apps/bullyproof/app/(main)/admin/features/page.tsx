"use client";

import React, { useState, useMemo } from "react";
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
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Plus, Loader2, AlertCircle, Globe, Users, School, User } from "lucide-react";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { featurePermissionsKeys } from "@/entities/feature-permissions/model/keys";
import { useFeaturePermissionsStore } from "@/entities/feature-permissions/model/store";
import { MAINTENANCE_FEATURE_KEY } from "@/lib/feature-keys";
import { GlobalTab, type Feature } from "./components/global-tab";
import { RoleTab } from "./components/role-tab";
import { SchoolTab } from "./components/school-tab";
import { UserTab } from "./components/user-tab";

type FeaturePermission = {
  id: string;
  featureId: string;
  level: "global" | "role" | "school" | "user";
  targetId: string | null;
  enabled: boolean;
  visible?: boolean | null;
  createdAt: string;
  updatedAt: string;
};

function AdminFeaturesPageContent() {
  usePageTitle(["admin", "features"]);
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    key: "",
    name: "",
    description: "",
    category: "",
  });

  const {
    data: features = [],
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

  // Sort so maintenance feature always appears at the top in all tabs
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

  const createFeatureMutation = useMutation({
    mutationFn: async (data: {
      key: string;
      name: string;
      description?: string;
      category?: string;
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
      setNewFeature({ key: "", name: "", description: "", category: "" });
    },
  });

  const setPermissionMutation = useMutation({
    mutationFn: async (data: {
      featureId: string;
      level: "global" | "role" | "school" | "user";
      targetId?: string;
      enabled: boolean;
      visible?: boolean | null;
    }) => {
      const body: Record<string, unknown> = {
        featureId: data.featureId,
        level: data.level,
        enabled: data.enabled,
      };
      if (data.targetId) body.targetId = data.targetId;
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
      const { featureId, level, targetId, enabled, visible } = variables;
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

      return {
        previous,
        wasNew,
        level,
        featureId,
        targetId,
      };
    },
    onError: (err, variables, context) => {
      if (!context) return;
      const store = useFeaturePermissionsStore.getState();
      const { previous, wasNew, level, featureId, targetId } = context;
      if (level === "global") {
        if (wasNew) store.removeGlobalPermissionOptimistic(featureId);
        else if (previous)
          store.updateGlobalPermission(featureId, previous);
      } else if (level === "role" && targetId) {
        if (wasNew) store.removeRolePermissionOptimistic(targetId, featureId);
        else if (previous)
          store.updateRolePermission(targetId, featureId, previous);
      } else if (level === "school" && targetId) {
        if (wasNew) store.removeSchoolPermissionOptimistic(targetId, featureId);
        else if (previous)
          store.updateSchoolPermission(targetId, featureId, previous);
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
      level: "role" | "school" | "user";
      targetId: string;
    }) => {
      const params = new URLSearchParams({ level: data.level });
      params.set("targetId", data.targetId);
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
      const { featureId, level, targetId } = variables;
      if (level === "role" && targetId) {
        store.removeRolePermissionOptimistic(targetId, featureId);
      } else if (level === "school" && targetId) {
        store.removeSchoolPermissionOptimistic(targetId, featureId);
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
      category: newFeature.category || undefined,
    });
  };

  const handleSetPermission = (data: {
    featureId: string;
    level: "global" | "role" | "school" | "user";
    targetId?: string;
    enabled: boolean;
    visible?: boolean | null;
  }) => {
    setPermissionMutation.mutate(data);
  };

  const handleRemovePermission = (data: {
    featureId: string;
    level: "role" | "school" | "user";
    targetId: string;
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

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Access Control</h1>
          <p className="text-muted-foreground">
            Manage feature permissions at global, role, school, and user levels
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Feature
        </Button>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="role" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Role
          </TabsTrigger>
          <TabsTrigger value="school" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            School
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            User
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <GlobalTab
            features={sortedFeatures}
            isLoadingFeatures={isLoadingFeatures}
            onSetPermission={(data) =>
              handleSetPermission({
                ...data,
                level: "global",
              })
            }
            isMutationPending={setPermissionMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="role" className="mt-6">
          <RoleTab
            features={sortedFeatures}
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
            features={sortedFeatures}
            onSetPermission={(data) =>
              handleSetPermission({
                ...data,
                level: "school",
                targetId: data.targetId,
              })
            }
            onRemovePermission={handleRemovePermission}
            isMutationPending={setPermissionMutation.isPending}
            isRemovePending={removePermissionMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <UserTab
            features={sortedFeatures}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
            <DialogDescription>
              Add a new feature that can be controlled via permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key">Key (machine-readable)</Label>
              <Input
                id="key"
                value={newFeature.key}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, key: e.target.value })
                }
                placeholder="e.g., lessons, content, admin"
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
                placeholder="e.g., Lessons Page"
              />
            </div>
            <div>
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                value={newFeature.category}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, category: e.target.value })
                }
                placeholder="e.g., navigation, admin"
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

export default function AdminFeaturesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <AdminFeaturesPageContent />
    </React.Suspense>
  );
}
