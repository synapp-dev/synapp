import { StageDetailSection } from "@/entities/dashboard/ui/admin/sections/content/stage-detail-section";

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  return <StageDetailSection slug={stage} />;
}
