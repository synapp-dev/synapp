"use client";

import * as React from "react";
import { TopicDetailSectionReadonly } from "@/entities/dashboard/ui/resources/sections/topic-detail-section-readonly";

export default function ContentTopicPage({
  params,
}: {
  params: Promise<{ school_id: string; stage: string; slug: string }>;
}) {
  const [schoolId, setSchoolId] = React.useState<string>("");
  const [stageSlug, setStageSlug] = React.useState<string>("");
  const [topicSlug, setTopicSlug] = React.useState<string>("");

  React.useEffect(() => {
    params.then(({ school_id, stage, slug }) => {
      setSchoolId(school_id);
      setStageSlug(stage);
      setTopicSlug(slug);
    });
  }, [params]);

  if (!schoolId || !stageSlug || !topicSlug) {
    return null;
  }

  return (
    <TopicDetailSectionReadonly
      stageSlug={stageSlug}
      topicSlug={topicSlug}
      schoolId={schoolId}
    />
  );
}
