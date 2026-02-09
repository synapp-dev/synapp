"use client";

import { AdminDashboard } from "@/entities/dashboard/ui/admin/admin-dashboard";
import { TeacherDashboard } from "@/entities/dashboard/ui/teacher/teacher-dashboard";
import { useIsIntradarkDev, useIsPlatformAdmin, useIsSchoolStaff, useIsTeacher } from "@/entities/me/model/store";
import { usePageTitle } from "@/hooks/use-page-title";
import { FeatureGuard } from "@/components/molecules/feature-guard";

export default function DashboardPage() {
  usePageTitle(["dashboard"]);
  const isPlatformAdmin = useIsPlatformAdmin();
  const isIntradarkDev = useIsIntradarkDev();
  const isTeacher = useIsTeacher();
  const isSchoolStaff = useIsSchoolStaff();

  // Render admin dashboard if user is a platform admin
  if (isPlatformAdmin || isIntradarkDev) {
    return <AdminDashboard />;
  }

  // Render teacher dashboard if user is a teacher
  if (isTeacher || isSchoolStaff) {
    return <TeacherDashboard />;
  }

  // Fallback for users without specific roles
  return (
    <>
      <FeatureGuard feature="dashboard" />
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          No dashboard available for your role.
        </p>
      </div>
    </>
  );
}
