import { TeacherOverviewSection } from "@/entities/dashboard/ui/teacher/sections/overview/overview-section";
import { TeacherHeroSection } from "@/entities/dashboard/ui/teacher/sections/hero/hero-section";
import { Separator } from "@workspace/ui/components/separator";
import { useMeStore } from "@/entities/me/model/store";

export function TeacherDashboard() {
  const currentUser = useMeStore((s) => s.currentUser);
  
  // Only allow SCHOOL_STAFF role
  const schoolRoles = currentUser?.schoolRoles;
  const hasSchoolStaffRole = Array.isArray(schoolRoles)
    ? schoolRoles.some(
        (role: { roleKey: string | null | undefined }) => role.roleKey === "SCHOOL_STAFF"
      )
    : false;

  // Only render if user has SCHOOL_STAFF role
  if (!hasSchoolStaffRole) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TeacherHeroSection />

      {/* Tab Menu */}
      <div className="px-96 w-full">
        <Separator className="my-10" />
      </div>

      <div>
      <TeacherOverviewSection />
      </div>
    </div>
  );
}
