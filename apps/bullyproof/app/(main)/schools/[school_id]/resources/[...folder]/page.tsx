"use client";

import { useEffect, useState } from "react";
import { ResourceBrowserClient } from "../resource-browser-client";

export default function SchoolResourcesFolderPage({
  params,
}: {
  params: Promise<{ school_id: string; folder: string[] }>;
}) {
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [folderSegments, setFolderSegments] = useState<string[]>([]);

  useEffect(() => {
    params.then(({ school_id, folder }) => {
      setSchoolSlug(school_id);
      setFolderSegments(folder ?? []);
    });
  }, [params]);

  if (!schoolSlug) return null;

  return (
    <ResourceBrowserClient
      schoolSlug={schoolSlug}
      initialFolderSegments={folderSegments}
    />
  );
}
