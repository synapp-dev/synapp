"use client";

import { AdminDashboard } from "@/entities/dashboard/ui/admin/admin-dashboard";
import { GovernmentDashboard } from "@/entities/dashboard/ui/government/government-dashboard";
import { TeacherDashboard } from "@/entities/dashboard/ui/teacher/teacher-dashboard";
import { StaffDashboard } from "@/entities/dashboard/ui/staff/staff-dashboard";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { usePageTitle } from "@/hooks/use-page-title";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useEffectiveUser } from "@/hooks/use-effective-user";

function normalizePlatformRoles(platformRoles: unknown): string[] {
  if (Array.isArray(platformRoles)) {
    return platformRoles.filter((role): role is string => typeof role === "string");
  }
  if (typeof platformRoles === "string") {
    const trimmed = platformRoles.replace(/^\{|\}$/g, "").trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
  }
  return [];
}

export default function DashboardPage() {
  usePageTitle(["dashboard"]);
  const currentUser = useEffectiveUser();
  const { hasAccess: isAdmin } = useFeatureAccess("system:admin-access");
  const { hasAccess: isTeacher } = useFeatureAccess("system:teacher-access");
  const { hasAccess: isStaff } = useFeatureAccess("system:school-staff-access");
  const isGovernment = normalizePlatformRoles(currentUser?.platformRoles).includes(
    "GOVERNMENT_VIEWER"
  );

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

  // Render government dashboard if user has government viewer role
  if (isGovernment) {
    return <GovernmentDashboard />;
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
