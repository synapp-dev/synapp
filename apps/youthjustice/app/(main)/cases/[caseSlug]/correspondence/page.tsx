import { notFound } from "next/navigation";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummyCaseProfile } from "@/lib/dummy-case-profile";
import { getDummyCaseNotes } from "@/lib/dummy-case-extras";
import { CaseNotesList } from "@/components/organisms/case-notes-list";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function CorrespondencePage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  const profile = getDummyCaseProfile(caseSlug);
  if (!c || !profile) {
    notFound();
  }
  const notes = getDummyCaseNotes(caseSlug);
  const firstName = c.displayName.split(" ")[0]!;

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Correspondence & case notes
        </h1>
        <p className="text-muted-foreground text-sm">
          Contact record and notes for {c.displayName} (demo data, new entries
          reset on reload).
        </p>
      </div>
      <CaseNotesList
        firstName={firstName}
        workerName={profile.worker.name}
        initialNotes={notes}
      />
    </div>
  );
}
