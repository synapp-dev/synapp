"use client";

import { useState } from "react";
import { SchoolsSummaryCards } from "./components/schools-summary-cards";
import { SchoolFilters } from "./components/school-filters";
import { SchoolsDataTable } from "./components/schools-data-table";
import { SchoolDetailDrawer } from "./components/school-detail-drawer";
import { type School } from "./components/schools-table-columns";

export function SchoolsSection() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSchoolClick = (school: School) => {
    setSelectedSchool(school);
    setIsDrawerOpen(true);
  };

  const handleFiltersChange = (filters: any) => {
    // TODO: Implement filtering logic
    console.log("Filters changed:", filters);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SchoolsSummaryCards />

      {/* Filters */}
      <SchoolFilters onFiltersChange={handleFiltersChange} />

      {/* Data Table */}
      <SchoolsDataTable onSchoolClick={handleSchoolClick} />

      {/* Detail Drawer */}
      <SchoolDetailDrawer
        school={selectedSchool}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
