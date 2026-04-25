import { notFound } from "next/navigation";

import { isKnownCaseSlug } from "@/lib/dummy-cases";

export default async function CaseSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ caseSlug: string }>;
}) {
  const { caseSlug } = await params;
  if (!isKnownCaseSlug(caseSlug)) {
    notFound();
  }
  return children;
}
