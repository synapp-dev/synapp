import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, Circle, MapPin, Users } from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummyCaseMeetings, type CaseMeeting } from "@/lib/dummy-case-extras";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

const STATUS_STYLES: Record<CaseMeeting["status"], string> = {
  Scheduled:
    "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Completed:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Cancelled: "border-border bg-muted text-muted-foreground",
};

export default async function MeetingsPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }
  const meetings = getDummyCaseMeetings(caseSlug).sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
  const nextMeeting = meetings.find((m) => m.status === "Scheduled");

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-muted-foreground text-sm">
          Case plan reviews, family meetings and conferences for {c.displayName}{" "}
          (demo data).
        </p>
      </div>

      {nextMeeting ? (
        <Card className="border-primary/40 bg-primary/[0.03]">
          <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm font-medium">
              Next: {nextMeeting.type},{" "}
              {format(nextMeeting.date, "EEEE d MMM · p")}
            </p>
            <p className="text-sm text-muted-foreground">
              {nextMeeting.location}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Accordion
        type="single"
        collapsible
        defaultValue={nextMeeting?.id}
        className="space-y-3"
      >
        {meetings.map((meeting) => (
          <AccordionItem
            key={meeting.id}
            value={meeting.id}
            className="rounded-lg border bg-card px-4 last:border-b"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-2 text-left">
                <span className="w-28 shrink-0 text-sm text-muted-foreground">
                  {format(meeting.date, "EEE d MMM")}
                </span>
                <span className="text-sm font-medium">{meeting.type}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-1.5 py-0 text-[10px]",
                    STATUS_STYLES[meeting.status],
                  )}
                >
                  {meeting.status}
                </Badge>
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {meeting.location}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Attendees
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {meeting.attendees.map((attendee) => (
                    <Badge
                      key={attendee}
                      variant="outline"
                      className="text-[11px] font-normal"
                    >
                      {attendee}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Agenda
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {meeting.agenda.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Outcomes
                  </p>
                  {meeting.outcomes.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {meeting.outcomes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Recorded after the meeting.
                    </p>
                  )}
                </div>
              </div>

              {meeting.actions.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </p>
                  <ul className="space-y-1.5">
                    {meeting.actions.map((action) => (
                      <li
                        key={action.text}
                        className="flex items-start gap-2 text-sm"
                      >
                        {action.done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                        )}
                        <span
                          className={cn(
                            action.done && "text-muted-foreground line-through",
                          )}
                        >
                          {action.text}
                          <span className="ml-2 text-xs text-muted-foreground no-underline">
                            {action.owner} · due {format(action.due, "d MMM")}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
