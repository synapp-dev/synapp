"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { ContentSectionReadonly } from "@/entities/dashboard/ui/resources/sections/content-section-readonly";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolStore } from "@/stores/school-store";

export default function ContentPage({
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

  if (!schoolSlug) {
    return (
      <>
        <FeatureGuard feature="/school/content" />
        {null}
      </>
    );
  }

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/content" schoolId={undefined} />
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
      <FeatureGuard feature="/school/content" schoolId={currentSchool.id} />
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Preview Lessons"
          description="Browse lesson levels and topics for the platform."
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
          <ContentSectionReadonly schoolId={schoolSlug} hideHeader />
        </div>
      </div>
    </>
  );
}