"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SchoolsSummaryCards } from "./components/schools-summary-cards";
import { SchoolFilters } from "./components/school-filters";
import { SchoolsDataTable } from "./components/schools-data-table";
import { SchoolDetailDrawer } from "./components/school-detail-drawer";
import { AddSchoolWizard } from "./components/add-school-wizard";
import { type School } from "./components/schools-table-columns";
import { schoolApi } from "@/entities/school/api/endpoints";

export function SchoolsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const isClosingRef = useRef(false);

  // Extract slug from URL query parameter (e.g., ?school=mazenod-college-vic)
  const slugFromUrl = searchParams?.get("school") || null;

  // Load schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const result = await schoolApi.get.listSchools({ limit: 100, offset: 0 });
        if (result.data) {
          const mappedSchools: School[] = result.data.map((school: any) => ({
            id: school.id || "",
            name: school.name || "",
            state: school.state || null,
            sector: school.sector || null,
            teacherCount: school.teacherCount ?? 0,
            slug: school.slug || null,
          }));
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

  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school);
    setIsDrawerOpen(true);
    // Update URL query parameter to include school slug
    if (school.slug) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("school", school.slug);
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

  const handleFiltersChange = (filters: any) => {
    // TODO: Implement filtering logic
    console.log("Filters changed:", filters);
  };

  const handleAddSchoolClick = () => {
    setIsWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SchoolsSummaryCards onAddSchoolClick={handleAddSchoolClick} />

      <div className="flex justify-between items-center">
        {/* Filters */}
        <SchoolFilters onFiltersChange={handleFiltersChange} />
      </div>

      {/* Data Table */}
      <SchoolsDataTable onSchoolClick={handleSchoolClick} />

      {/* Detail Drawer */}
      <SchoolDetailDrawer
        school={selectedSchool}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
      />

      {/* Add School Wizard */}
      <AddSchoolWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />
    </div>
  );
}
