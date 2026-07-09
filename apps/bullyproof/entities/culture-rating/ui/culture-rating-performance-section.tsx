"use client";

import { useCallback, useEffect, useState } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { PAGE_FEATURES } from "@/lib/feature-keys";
import { cultureRatingsSchoolApi } from "@/entities/culture-rating/api/culture-ratings-school-api";
import type { SchoolCultureDetailResponse } from "@/entities/culture-rating/api/culture-ratings-admin-api";
import { CultureRatingComparisonDashboard } from "@/entities/culture-rating/ui/culture-rating-comparison-dashboard";

export function CultureRatingPerformanceSection({
  schoolSlug,
  schoolId,
}: {
  schoolSlug: string;
  schoolId: string;
}) {
  const cultureAccess = useFeatureAccess(
    PAGE_FEATURES.SCHOOL_CULTURE_RATING,
    schoolId
  );

  const [detail, setDetail] = useState<SchoolCultureDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId || !cultureAccess.hasAccess) return;
    setLoading(true);
    setError(null);
    const res = await cultureRatingsSchoolApi.getDetail(schoolId);
    if (res.error) {
      setDetail(null);
      setError(res.error.message ?? "Failed to load culture rating");
    } else {
      setDetail(res.data);
    }
    setLoading(false);
  }, [schoolId, cultureAccess.hasAccess]);

  useEffect(() => {
    load();
  }, [load]);

  if (!cultureAccess.hasAccess || cultureAccess.isLoading) {
    return null;
  }

  const settingsPath = `/schools/${schoolSlug}/settings/culture-rating`;

  return (
    <CultureRatingComparisonDashboard
      detail={detail}
      loading={loading}
      error={error}
      settingsCulturePath={settingsPath}
    />
  );
}
