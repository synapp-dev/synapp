import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";
import { TeacherPageWrapper } from "./teacher-page-wrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}): Promise<Metadata> {
  const { "teacher-name": teacherName } = await params;
  return generateMetadataFromSegment(teacherName);
}

export default function TeacherPage({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}) {
  return <TeacherPageWrapper params={params} />;
}
