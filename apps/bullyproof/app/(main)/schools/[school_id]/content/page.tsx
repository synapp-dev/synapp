import { generateMetadataFromSegments } from "@/utils/metadata";
import { CurriculumStagesSection } from "./curriculum-stages-section";

export const metadata = generateMetadataFromSegments(["schools", "content"]);

export default async function ContentPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;

  return <CurriculumStagesSection schoolId={school_id} />;
}
