"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolStore } from "@/stores/school-store";
import { FolderOpen, Video, Lock, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { getAuthHeaders } from "@/lib/api/fetcher.client";

type ResourceTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  scopeType: "global" | "school";
  schoolId: string | null;
  children: ResourceTreeNode[];
};

type TreeResponse = {
  canManage: boolean;
  roots: ResourceTreeNode[];
};

export default function ResourcesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [showContentAnimation, setShowContentAnimation] = useState(false);
  const currentSchool = useSchoolStore((state) => state.currentSchool);
  const banner = useStorageImageUrl(currentSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);
  const headerReady =
    !(!!currentSchool?.bannerUrl && banner.loading) &&
    !(!!currentSchool?.avatarUrl && avatar.loading);

  useEffect(() => {
    params.then(({ school_id }) => setSchoolSlug(school_id));
  }, [params]);

  const treeQuery = useQuery({
    queryKey: ["school-resources-tree", currentSchool?.id],
    enabled: Boolean(currentSchool?.id),
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `/api/resources/tree?schoolId=${encodeURIComponent(currentSchool!.id)}`,
        {
          headers,
          cache: "no-store",
        }
      );
      const body = await res.json();
      if (!res.ok || body?.error) {
        throw new Error(body?.error || "Failed to load resources");
      }
      return body as TreeResponse;
    },
  });

  if (!schoolSlug) {
    return (
      <>
        <FeatureGuard feature="/school/resources" />
        {null}
      </>
    );
  }

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/resources" schoolId={undefined} />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">School not found</h1>
            <p className="text-muted-foreground">
              The school you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="/school/resources" schoolId={currentSchool.id} />
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Resources"
          description="Access educational resources and materials for your school."
          isLoading={!headerReady}
          onAnimationComplete={() => setShowContentAnimation(true)}
        />

        <div
          className={`space-y-6 opacity-0 ${showContentAnimation ? "animate-slide-down-fade-in" : ""}`}
          style={
            showContentAnimation
              ? { animationFillMode: "forwards" }
              : undefined
          }
        >
          {treeQuery.data?.canManage ? (
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link
                  href="/admin/resources"
                  className="inline-flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" aria-hidden />
                  Manage resources
                </Link>
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {treeQuery.isLoading ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Loading folders...</CardTitle>
                  <CardDescription>
                    Fetching top-level resource folders
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {(treeQuery.data?.roots ?? []).map((rootFolder) => (
              <Link
                key={rootFolder.id}
                href={`/schools/${schoolSlug}/resources/${rootFolder.slug}`}
                className="block h-full"
              >
                <Card className="h-full transition-colors hover:bg-accent/40 gap-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <FolderOpen className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{rootFolder.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {rootFolder.description?.trim() ||
                        "Open this folder to browse school resources."}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Videos card is intentionally separate/locked for future implementation */}
            <Card className="opacity-50 cursor-not-allowed h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <Video className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>Videos</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  Video resources and educational content
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
