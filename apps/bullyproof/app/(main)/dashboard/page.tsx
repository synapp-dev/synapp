"use client";

import { AdminDashboard } from "@/entities/dashboard/ui/admin/admin-dashboard";
import { TeacherDashboard } from "@/entities/dashboard/ui/teacher/teacher-dashboard";
import { StaffDashboard } from "@/entities/dashboard/ui/staff/staff-dashboard";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { usePageTitle } from "@/hooks/use-page-title";
import { FeatureGuard } from "@/components/molecules/feature-guard";

export default function DashboardPage() {
  usePageTitle(["dashboard"]);
  const { hasAccess: isAdmin } = useFeatureAccess("system:admin-access");
  const { hasAccess: isTeacher } = useFeatureAccess("system:teacher-access");
  const { hasAccess: isStaff } = useFeatureAccess("system:school-staff-access");

  // Render admin dashboard if user has admin access
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Render teacher dashboard if user has teacher access
  if (isTeacher) {
    return <TeacherDashboard />;
  }

  // Render staff dashboard if user has school staff access
  if (isStaff) {
    return <StaffDashboard />;
  }

  // Fallback for users without specific roles
  return (
    <>
      <FeatureGuard feature="/dashboard" />
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          No dashboard available for your role.
        </p>
      </div>
    </>
  );
}
