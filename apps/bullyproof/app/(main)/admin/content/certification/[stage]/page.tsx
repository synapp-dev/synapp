import { CertificationStageDetailSection } from "@/entities/dashboard/ui/admin/sections/content/certification-stage-detail-section";
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

export default async function CertificationStagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  return (
    <CertificationStageDetailSection
      slug={stage}
      readonly={false}
      basePath="/admin/content/certification"
    />
  );
}
