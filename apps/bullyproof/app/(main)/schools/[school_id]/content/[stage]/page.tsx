"use client";

import * as React from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { useRouter } from "next/navigation";
import { StageDetailSection } from "@/entities/dashboard/ui/admin/sections/content/stage-detail-section";

export default function ContentStagePage({
  params,
}: {
  params: Promise<{ school_id: string; stage: string }>;
}) {
  const [schoolId, setSchoolId] = React.useState<string>("");
  const [stageSlug, setStageSlug] = React.useState<string>("");
  const router = useRouter();

  React.useEffect(() => {
    params.then(({ school_id, stage }) => {
      setSchoolId(school_id);
      setStageSlug(stage);
    });
  }, [params]);

  if (!schoolId || !stageSlug) {
    return (
      <>
        <FeatureGuard feature="/school/content" schoolId={schoolId} />
        {null}
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="/school/content" schoolId={schoolId} />
      <StageDetailSection
        slug={stageSlug}
        readonly={true}
        basePath={`/schools/${schoolId}/content`}
        onBackClick={() => router.push(`/schools/${schoolId}/content`)}
      />
    </>
  );
}
