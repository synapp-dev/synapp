import { TopicDetailSection } from "@/entities/dashboard/ui/admin/sections/content/topic-detail-section";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ stage: string; slug: string }>;
}) {
  const { stage, slug } = await params;
  return <TopicDetailSection stageSlug={stage} topicSlug={slug} />;
}
