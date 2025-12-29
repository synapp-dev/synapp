import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";
import TeacherPageClient from "./teacher-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}): Promise<Metadata> {
  const { "teacher-name": teacherName } = await params;
  return generateMetadataFromSegment(teacherName);
}

export default async function TeacherPage({
  params,
}: {
  params: Promise<{ school_id: string; "teacher-name": string }>;
}) {
  const { school_id, "teacher-name": teacherSlug } = await params;

  return <TeacherPageClient teacherSlug={teacherSlug} schoolSlug={school_id} />;
}
