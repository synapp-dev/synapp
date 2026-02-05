"use client";

import * as React from "react";
import { FeatureGuard } from "@/components/molecules/feature-guard";
import { ContentSectionReadonly } from "@/entities/dashboard/ui/resources/sections/content-section-readonly";

export default function ContentPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const [schoolId, setSchoolId] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ school_id }) => setSchoolId(school_id));
  }, [params]);

  if (!schoolId) {
    return (
      <>
        <FeatureGuard feature="content" />
        {null}
      </>
    );
  }

  return (
    <>
      <FeatureGuard feature="content" schoolId={schoolId} />
      <ContentSectionReadonly schoolId={schoolId} />
    </>
  );
}