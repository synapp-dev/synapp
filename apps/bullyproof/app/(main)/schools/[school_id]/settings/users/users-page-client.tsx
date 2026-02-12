"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useSchoolStore } from "@/stores/school-store";
import { useSchoolBySlugQuery } from "@/entities/school/model/useListSchoolsQuery";
import { SettingsUsersCard } from "../components/settings-users-card";
import { usePageTitle } from "@/hooks/use-page-title";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft } from "lucide-react";

interface UsersPageClientProps {
  schoolSlug: string;
}

export function UsersPageClient({ schoolSlug }: UsersPageClientProps) {
  usePageTitle(["schools", "settings", "users"]);
  const currentSchool = useSchoolStore((s) => s.currentSchool);
  const [slug, setSlug] = useState(schoolSlug);

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
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  const settingsPath = `/schools/${slug}/settings`;

  return (
    <>
      <FeatureGuard feature="/settings" schoolId={school.id}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={settingsPath} aria-label="Back to Settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Settings - Users</h1>
              <p className="text-muted-foreground">
                Manage users at your school. Add, remove, and edit roles.
              </p>
            </div>
          </div>

          <SettingsUsersCard
            schoolId={school.id}
            schoolSlug={slug}
            schoolName={school.name ?? "School"}
            basePath={`/schools/${slug}/settings/users`}
          />
        </div>
      </FeatureGuard>
    </>
  );
}
