import { generateMetadataFromSegments } from "@/utils/metadata";
import { TeachersPageWrapper } from "./teachers-page-wrapper";

export const metadata = generateMetadataFromSegments(["schools", "teachers"]);

export default function TeachersPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  return <TeachersPageWrapper params={params} />;
}
