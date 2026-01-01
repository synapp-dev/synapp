import { StageDetailSection } from "../stage-detail-section";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  return generateMetadataFromSegment(stage);
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ school_id: string; stage: string }>;
}) {
  const { school_id, stage } = await params;
  return <StageDetailSection slug={stage} schoolId={school_id} />;
}
