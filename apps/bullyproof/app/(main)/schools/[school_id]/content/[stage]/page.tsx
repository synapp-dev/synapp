"use client";

import * as React from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
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
        <PlatformAdminGuard />
        {null}
      </>
    );
  }

  return (
    <>
      <PlatformAdminGuard />
      <StageDetailSection
        slug={stageSlug}
        readonly={true}
        basePath={`/schools/${schoolId}/content`}
        onBackClick={() => router.push(`/schools/${schoolId}/content`)}
      />
    </>
  );
}
