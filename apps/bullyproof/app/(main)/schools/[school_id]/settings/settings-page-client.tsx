"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { SchoolPageCompactHeader } from "@/components/molecules/school-page-compact-header";
import { useStorageImageUrl } from "@/hooks/use-storage-image-url";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { GraduationCap, School, Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";

interface SettingsPageClientProps {
  schoolSlug: string;
}

export function SettingsPageClient({ schoolSlug }: SettingsPageClientProps) {
  usePageTitle(["schools", "settings"]);
  const [showContentAnimation, setShowContentAnimation] = useState(false);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const [slug, setSlug] = useState(schoolSlug);
  const banner = useStorageImageUrl(currentSchool?.bannerUrl ?? null);
  const avatar = useStorageImageUrl(currentSchool?.avatarUrl ?? null);
  const headerReady =
    !(!!currentSchool?.bannerUrl && banner.loading) &&
    !(!!currentSchool?.avatarUrl && avatar.loading);

  useEffect(() => {
    setSlug(schoolSlug);
  }, [schoolSlug]);

  const { data: school, isLoading } = useSchoolBySlugQuery(slug, {
    enabled: !!slug,
  });
  const schoolId = school?.id ?? currentSchool?.id ?? null;

  if (isLoading || !school) {
    return (
      <>
        <FeatureGuard feature="/settings" schoolId={schoolId ?? undefined} />
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </>
    );
  }

  const basePath = `/schools/${slug}/settings`;

  return (
    <>
      <FeatureGuard feature="/settings" schoolId={school.id}>
        <div className="space-y-6">
          <SchoolPageCompactHeader
            bannerUrl={banner.url}
            avatarUrl={avatar.url}
            title="Settings"
            description="Manage your school&apos;s configuration and users."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href={`${basePath}/details`}>
              <Card className="transition-all h-full hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex flex-row items-center gap-2">
                    <School className="h-5 w-5" />
                    Details
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Edit your school&apos;s basic information
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href={`${basePath}/users`}>
              <Card className="transition-all h-full hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex flex-row items-center gap-2">
                    <Users className="h-5 w-5" />
                    Users
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Manage users at your school
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href={`${basePath}/classes`}>
              <Card className="transition-all h-full hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex flex-row items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Classes
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Add and manage classes for your school
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
          </div>
        </div>
      </FeatureGuard>
    </>
  );
}
