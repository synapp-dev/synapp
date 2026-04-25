import { notFound } from "next/navigation";

import { CaseCalendarPanel } from "@/components/organisms/case-calendar-panel";
import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummyCalendar } from "@/lib/dummy-case-content";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function CalendarPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }
  const rows = getDummyCalendar(caseSlug);

  return (
    <CaseCalendarPanel
      caseSlug={caseSlug}
      caseDisplayName={c.displayName}
      events={rows}
    />
  );
}
