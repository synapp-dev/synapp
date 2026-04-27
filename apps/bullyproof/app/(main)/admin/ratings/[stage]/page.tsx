import { Metadata } from "next";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { StageRatingsSection } from "@/entities/dashboard/ui/admin/sections/ratings/stage-ratings-section";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  return generateMetadataFromSegment(stage);
}

export default async function AdminStageRatingsPage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  return <StageRatingsSection stageSlug={stage} />;
}
