"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { School } from "lucide-react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { formatSchoolLevel } from "./format-school-level";
import { schoolDetailMobileNavItems } from "./constants";
import { useSchoolDetail } from "./school-detail-context";
import type { SchoolDetailTabId } from "./types";

export function SchoolDetailMobileHeader() {
  const { school, activeSection, handleTabChange } = useSchoolDetail();
  const {
    hasAccess: canAccessSchoolActivation,
    isLoading: isLoadingSchoolActivationAccess,
  } = useFeatureAccess("admin:school-activation");

  const levelDisplay =
    (school as { levelBadge?: string | null }).levelBadge ??
    formatSchoolLevel(school.levels);
  const sectorDisplay =
    school.sector === "government"
      ? "Government"
      : school.sector === "catholic"
        ? "Catholic"
        : school.sector === "independent"
          ? "Independent"
          : "—";

  return (
    <div className="md:hidden p-4 border-b shrink-0 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <School className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-lg">{school.name}</h2>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {school.state && (
          <Badge variant="secondary" className="w-fit">
            {school.state.toUpperCase()}
          </Badge>
        )}
        {sectorDisplay !== "—" && (
          <Badge variant="secondary" className="w-fit">
            {sectorDisplay}
          </Badge>
        )}
        {levelDisplay !== "—" && (
          <Badge variant="secondary" className="w-fit">
            {levelDisplay}
          </Badge>
        )}
      </div>
      <Select
        value={activeSection}
        onValueChange={(value) => handleTabChange(value as SchoolDetailTabId)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {schoolDetailMobileNavItems.map((item) => (
            <SelectItem
              key={item.id}
              value={item.id}
              disabled={
                item.disabled ||
                (item.id === "activation" &&
                  !isLoadingSchoolActivationAccess &&
                  !canAccessSchoolActivation)
              }
            >
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
