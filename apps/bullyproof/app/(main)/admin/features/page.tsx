"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiFetch } from "@/lib/api/fetcher.client";
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
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
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
import {
  FEATURE_SECTIONS,
  SECTION_GROUPS,
  getSectionsByGroup,
} from "@/lib/feature-sections";
import { FEATURE_CATEGORIES } from "@/lib/feature-keys";
import type { Feature } from "./components/global-tab";

function AdminFeaturesDashboardContent() {
  usePageTitle(["admin", "features"]);
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({
    key: "",
    name: "",
    description: "",
    category: "page",
    section: "",
  });

  const {
    data: features = [],
    isLoading: isLoadingFeatures,
    error: featuresError,
    refetch,
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

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFeature = async () => {
    if (!newFeature.key || !newFeature.name || !newFeature.section) return;
    setIsCreating(true);
    try {
      const result = await apiFetch<Feature>("/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newFeature.key,
          name: newFeature.name,
          description: newFeature.description || undefined,
          category: newFeature.category || undefined,
          section: newFeature.section,
        }),
      });
      if (result.error)
        throw new Error(result.error.message || "Failed to create feature");
      setIsCreateDialogOpen(false);
      setNewFeature({
        key: "",
        name: "",
        description: "",
        category: "page",
        section: "",
      });
      refetch();
    } catch {
      // error handled by toast in the future
    } finally {
      setIsCreating(false);
    }
  };

  // Count features per section
  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sec of FEATURE_SECTIONS) {
      counts[sec.key] = 0;
    }
    counts["uncategorized"] = 0;

    for (const feature of features) {
      const sec = feature.section || "uncategorized";
      if (counts[sec] !== undefined) {
        counts[sec]++;
      } else {
        counts["uncategorized"]++;
      }
    }
    return counts;
  }, [features]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Access Control</h1>
          <p className="text-muted-foreground">
            Manage feature permissions across the platform. Select a section to
            configure features and permissions.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Feature
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Features</p>
          <div className="text-2xl font-bold">
            {isLoadingFeatures ? (
              <Skeleton className="h-8 w-12 inline-block" />
            ) : (
              features.length
            )}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Sections</p>
          <div className="text-2xl font-bold">{FEATURE_SECTIONS.length}</div>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Admin Features</p>
          <div className="text-2xl font-bold">
            {isLoadingFeatures ? (
              <Skeleton className="h-8 w-12 inline-block" />
            ) : (
              sectionCounts["admin"] ?? 0
            )}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">School Features</p>
          <div className="text-2xl font-bold">
            {isLoadingFeatures ? (
              <Skeleton className="h-8 w-12 inline-block" />
            ) : (
              Object.entries(sectionCounts)
                .filter(([key]) => key.startsWith("schools-"))
                .reduce((sum, [, count]) => sum + count, 0)
            )}
          </div>
        </div>
      </div>

      {/* Section cards grouped by category */}
      {SECTION_GROUPS.map((group) => {
        const groupSections = getSectionsByGroup(group.key);

        return (
          <div key={group.key} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupSections.map((section) => {
                const Icon = section.icon;
                const count = sectionCounts[section.key] ?? 0;

                return (
                  <button
                    key={section.key}
                    onClick={() =>
                      router.push(`/admin/features/${section.key}`)
                    }
                    className="group border rounded-lg p-5 text-left hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{section.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="secondary">
                          {isLoadingFeatures ? "..." : count}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Create Feature Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Feature</DialogTitle>
            <DialogDescription>
              Add a new feature that can be controlled via permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="section">Section</Label>
              <Select
                value={newFeature.section}
                onValueChange={(v) =>
                  setNewFeature({ ...newFeature, section: v })
                }
              >
                <SelectTrigger id="section">
                  <SelectValue placeholder="Select site section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_GROUPS.map((group) => (
                    <React.Fragment key={group.key}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group.label}
                      </div>
                      {getSectionsByGroup(group.key).map((sec) => (
                        <SelectItem key={sec.key} value={sec.key}>
                          {sec.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                placeholder="e.g., /admin/users, school:create-lesson"
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
                !newFeature.section ||
                isCreating
              }
            >
              {isCreating && (
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
      <AdminFeaturesDashboardContent />
    </React.Suspense>
  );
}
