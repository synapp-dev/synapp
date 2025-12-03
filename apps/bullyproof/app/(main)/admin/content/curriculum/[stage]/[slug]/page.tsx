import { TopicDetailSection } from "@/entities/dashboard/ui/admin/sections/content/topic-detail-section";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateMetadataFromSegment(slug);
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ stage: string; slug: string }>;
}) {
  const { stage, slug } = await params;
  return <TopicDetailSection stageSlug={stage} topicSlug={slug} />;
}
