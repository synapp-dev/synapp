import { StageDetailSection } from "@/entities/dashboard/ui/admin/sections/content/stage-detail-section";

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StageDetailSection slug={slug} />;
}

