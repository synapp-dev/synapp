import { TopicDetailSection } from "../../topic-detail-section";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; stage: string; topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  return generateMetadataFromSegment(topic);
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ school_id: string; stage: string; topic: string }>;
}) {
  const { school_id, stage, topic } = await params;
  return (
    <TopicDetailSection
      stageSlug={stage}
      topicSlug={topic}
      schoolId={school_id}
    />
  );
}
