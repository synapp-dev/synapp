import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { REQUEST_KINDS, type RequestKind } from "@/lib/requests/config";
import { NewRequestClient } from "./new-request-client";

export const metadata: Metadata = { title: "New Request" };

type PageProps = { params: Promise<{ kind: string }> };

export default async function NewRequestPage({ params }: PageProps) {
  const { kind } = await params;
  const config = REQUEST_KINDS[kind as RequestKind];

  // Only kinds with a built form (`live`) are reachable here.
  if (!config || !config.live) {
    notFound();
  }

  return <NewRequestClient kind={config.kind} />;
}
