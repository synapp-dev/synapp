"use client";

import { AdminDashboard } from "@/entities/dashboard/ui/admin/admin-dashboard";
import { TeacherDashboard } from "@/entities/dashboard/ui/teacher/teacher-dashboard";
import { useIsPlatformAdmin, useIsTeacher } from "@/entities/me/model/store";

export default function DashboardPage() {
  const isPlatformAdmin = useIsPlatformAdmin();
  const isTeacher = useIsTeacher();

  // Render admin dashboard if user is a platform admin
  if (isPlatformAdmin) {
    return <AdminDashboard />;
  }

  // Render teacher dashboard if user is a teacher
  if (isTeacher) {
    return <TeacherDashboard />;
  }

  // Fallback for users without specific roles
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">
        No dashboard available for your role.
      </p>
    </div>
  );
}
