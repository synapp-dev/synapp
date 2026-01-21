"use client";

import * as React from "react";
import { PlatformAdminGuard } from "@/components/molecules/platform-admin-guard";
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
        <PlatformAdminGuard />
        {null}
      </>
    );
  }

  return (
    <>
      <PlatformAdminGuard />
      <ContentSectionReadonly schoolId={schoolId} />
    </>
  );
}