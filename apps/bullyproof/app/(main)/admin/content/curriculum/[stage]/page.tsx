import { StageDetailSection } from "@/entities/dashboard/ui/admin/sections/content/stage-detail-section";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  return generateMetadataFromSegment(stage);
}

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  return <StageDetailSection slug={stage} />;
}
