import type { Metadata } from "next";

import { RequestDetailClient } from "./request-detail-client";

export const metadata: Metadata = { title: "Request" };

type PageProps = { params: Promise<{ id: string }> };

export default async function RequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <RequestDetailClient id={id} />;
}
