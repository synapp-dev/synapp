"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SchoolsDataTable } from "./components/schools-data-table";
import { SchoolDetailDrawer } from "./components/school-detail-drawer";
import { AddSchoolWizard } from "./components/add-school-wizard";
import { type School } from "./components/schools-table-columns";
import { schoolApi } from "@/entities/school/api/endpoints";
import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";

export function SchoolsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const isClosingRef = useRef(false);
  const isWizardClosingRef = useRef(false);

  // Extract slug from URL query parameter (e.g., ?school=mazenod-college-vic)
  const slugFromUrl = searchParams?.get("school") || null;
  // Extract modal from URL query parameter (e.g., ?modal=add-new-school)
  const modalFromUrl = searchParams?.get("modal") || null;
  // Extract tab from URL query parameter (e.g., ?tab=overview)
  const tabFromUrl = searchParams?.get("tab") || null;

  // Load schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const result = await schoolApi.get.listSchools({
          limit: 100,
          offset: 0,
        });
        if (result.data) {
          const mappedSchools: School[] = result.data.map((school: any) => {
            const teacherCount = school.teacherCount ?? 0;
            const classCount = school.classCount ?? 0;
            const schoolAdminCount = school.schoolAdminCount ?? 0;
            const schoolLicenceCount = school.schoolLicenceCount ?? 0;
            const activeLicence =
              school.activeLicence ?? school.active_licence ?? false;

            // Status: onboarding if any count < 1, active if all counts >= 1
            const status: "onboarding" | "active" =
              teacherCount < 1 ||
              classCount < 1 ||
              schoolAdminCount < 1 ||
              schoolLicenceCount < 1
                ? "onboarding"
                : "active";

            return {
              id: school.id || "",
              name: school.name || "",
              state: school.state || null,
              sector: school.sector || null,
              teacherCount,
              classCount,
              schoolAdminCount,
              schoolLicenceCount,
              activeLicence,
              status,
              slug: school.slug || null,
              levels: school.levels || null,
            };
          });
          setSchools(mappedSchools);
        }
      } catch (err) {
        console.error("Failed to fetch schools:", err);
      }
    };
    fetchSchools();
  }, []);

  // Open drawer when URL has a slug query parameter
  useEffect(() => {
    // Don't interfere if we're manually closing the drawer
    if (isClosingRef.current) {
      return;
    }

    if (slugFromUrl && schools.length > 0) {
      const school = schools.find((s) => s.slug === slugFromUrl);
      if (school && selectedSchool?.id !== school.id) {
        setSelectedSchool(school);
        setIsDrawerOpen(true);
      } else if (!school && isDrawerOpen) {
        // School not found, close drawer
        setIsDrawerOpen(false);
        setSelectedSchool(null);
      }
    } else if (!slugFromUrl && isDrawerOpen) {
      // Close drawer if URL doesn't have slug (but only if not manually closing)
      setIsDrawerOpen(false);
      setSelectedSchool(null);
    }
  }, [slugFromUrl, schools, selectedSchool?.id, isDrawerOpen]);

  // Open wizard when URL has modal=add-new-school query parameter
  useEffect(() => {
    // Don't interfere if we're manually closing the wizard
    if (isWizardClosingRef.current) {
      return;
    }

    if (modalFromUrl === "add-new-school") {
      if (!isWizardOpen) {
        setIsWizardOpen(true);
      }
    } else if (isWizardOpen) {
      // Close wizard if URL doesn't have modal param (but only if not manually closing)
      setIsWizardOpen(false);
    }
  }, [modalFromUrl, isWizardOpen]);

  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school);
    setIsDrawerOpen(true);
    // Update URL query parameter to include school slug
    if (school.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
      // Remove modal param if present (only one modal/drawer open at a time)
      params.delete("modal");
      router.push(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  const handleDrawerClose = (open: boolean) => {
    if (!open) {
      // Set flag to prevent useEffect from interfering
      isClosingRef.current = true;

      // Close drawer immediately
      setIsDrawerOpen(false);
      setSelectedSchool(null);

      // Update URL without scrolling
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("school");
      params.delete("tab");
      const newUrl = params.toString()
        ? `/admin/schools?${params.toString()}`
        : "/admin/schools";
      router.replace(newUrl, { scroll: false });

      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isClosingRef.current = false;
      }, 100);
    } else {
      setIsDrawerOpen(open);
    }
  };

  const handleAddSchoolClick = () => {
    setIsWizardOpen(true);
    // Update URL query parameter to include modal=add-new-school
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("modal", "add-new-school");
    // Remove school param if present (only one modal/drawer open at a time)
    params.delete("school");
    router.push(`/admin/schools?${params.toString()}`, { scroll: false });
  };

  const handleWizardClose = (open: boolean) => {
    if (!open) {
      // Set flag to prevent useEffect from interfering
      isWizardClosingRef.current = true;

      // Close wizard immediately
      setIsWizardOpen(false);

      // Update URL without scrolling
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("modal");
      const newUrl = params.toString()
        ? `/admin/schools?${params.toString()}`
        : "/admin/schools";
      router.replace(newUrl, { scroll: false });

      // Reset flag after a brief delay to allow URL update to complete
      setTimeout(() => {
        isWizardClosingRef.current = false;
      }, 100);
    } else {
      setIsWizardOpen(open);
    }
  };

  const handleTabChange = (
    tab:
      | "onboarding"
      | "overview"
      | "users"
      | "classes"
      | "activity"
      | "culture"
      | "settings"
  ) => {
    // Update URL with tab parameter
    if (selectedSchool?.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", selectedSchool.slug);
      params.set("tab", tab);
      router.replace(`/admin/schools?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New School Button */}
      <div className="flex justify-end">
        <Button onClick={handleAddSchoolClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add New School
        </Button>
      </div>

      {/* Data Table */}
      <SchoolsDataTable onSchoolClick={handleSchoolClick} />

      {/* Detail Drawer */}
      <SchoolDetailDrawer
        school={selectedSchool}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        initialTab={
          tabFromUrl &&
          [
            "onboarding",
            "overview",
            "users",
            "classes",
            "activity",
            "culture",
            "settings",
          ].includes(tabFromUrl)
            ? (tabFromUrl as
                | "onboarding"
                | "overview"
                | "users"
                | "classes"
                | "activity"
                | "culture"
                | "settings")
            : undefined
        }
        onTabChange={handleTabChange}
        onSchoolUpdate={async () => {
          // Refresh schools list
          try {
            const result = await schoolApi.get.listSchools({
              limit: 100,
              offset: 0,
            });
            if (result.data) {
              const mappedSchools: School[] = result.data.map((school: any) => {
                const teacherCount = school.teacherCount ?? 0;
                const classCount = school.classCount ?? 0;
                const schoolAdminCount = school.schoolAdminCount ?? 0;
                const schoolLicenceCount = school.schoolLicenceCount ?? 0;
                const activeLicence =
                  school.activeLicence ?? school.active_licence ?? false;

                // Status: onboarding if any count < 1, active if all counts >= 1
                const status: "onboarding" | "active" =
                  teacherCount < 1 ||
                  classCount < 1 ||
                  schoolAdminCount < 1 ||
                  schoolLicenceCount < 1
                    ? "onboarding"
                    : "active";

                return {
                  id: school.id || "",
                  name: school.name || "",
                  state: school.state || null,
                  sector: school.sector || null,
                  teacherCount,
                  classCount,
                  schoolAdminCount,
                  schoolLicenceCount,
                  activeLicence,
                  status,
                  slug: school.slug || null,
                  levels: school.levels || null,
                };
              });
              setSchools(mappedSchools);
              // Update selected school if it exists
              if (selectedSchool) {
                const updatedSchool = mappedSchools.find(
                  (s) => s.id === selectedSchool.id
                );
                if (updatedSchool) {
                  setSelectedSchool(updatedSchool);
                }
              }
            }
          } catch (err) {
            console.error("Failed to refresh schools:", err);
          }
        }}
      />

      {/* Add School Wizard */}
      <AddSchoolWizard open={isWizardOpen} onOpenChange={handleWizardClose} />
    </div>
  );
}
