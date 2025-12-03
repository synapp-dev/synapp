import { redirect } from "next/navigation";
import { generateMetadataFromSegment } from "@/utils/metadata";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string }>;
}): Promise<Metadata> {
  const { school_id } = await params;
  return generateMetadataFromSegment(school_id);
}

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  redirect(`/schools/${school_id}/home`);
}
