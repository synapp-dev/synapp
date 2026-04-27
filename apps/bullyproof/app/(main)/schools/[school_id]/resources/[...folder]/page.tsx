import type { Metadata } from "next";
import { generateResourcesFolderTabTitle } from "@/utils/metadata";
import { ResourceBrowserClient } from "../resource-browser-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ school_id: string; folder: string[] }>;
}): Promise<Metadata> {
  const { folder } = await params;
  return {
    title: generateResourcesFolderTabTitle(folder ?? []),
  };
}

export default async function SchoolResourcesFolderPage({
  params,
}: {
  params: Promise<{ school_id: string; folder: string[] }>;
}) {
  const { school_id, folder } = await params;
  return (
    <ResourceBrowserClient
      schoolSlug={school_id}
      initialFolderSegments={folder ?? []}
    />
  );
}
