"use client";

import { useEffect, useState } from "react";
import TeachersPageClient from "./teachers-page-client";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolStore } from "@/stores/school-store";

export function TeachersPageWrapper({
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
        <FeatureGuard feature="/school/teachers" />
        {null}
      </>
    );
  }

  if (!currentSchool) {
    return (
      <>
        <FeatureGuard feature="/school/teachers" schoolId={undefined} />
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
      <FeatureGuard feature="/school/teachers" schoolId={currentSchool.id} />
      <div className="space-y-6">
        <SchoolPageCompactHeader
          bannerUrl={banner.url}
          avatarUrl={avatar.url}
          title="Teachers"
          description="View and manage staff and teachers at your school."
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
          <TeachersPageClient />
        </div>
      </div>
    </>
  );
}
