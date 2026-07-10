import { notFound } from "next/navigation";
import { Phone } from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

export default async function MeetingsPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-muted-foreground text-sm">
          Scheduled meetings and call history for {c.displayName}.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Meeting scheduling, reminders and call notes will live here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Phone className="size-4" />
            <span>Nothing scheduled yet.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
