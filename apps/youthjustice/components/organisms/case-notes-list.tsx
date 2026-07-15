"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Flag,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  Pin,
  Plus,
  Smartphone,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import type { CaseNote, CaseNoteCategory } from "@/lib/dummy-case-extras";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

const CATEGORIES: CaseNoteCategory[] = [
  "Welfare",
  "Compliance",
  "Family",
  "Education",
];

const CHANNELS: CaseNote["channel"][] = [
  "Visit",
  "Phone",
  "SMS",
  "Email",
  "In-app",
  "Note",
];

const CHANNEL_ICONS: Record<CaseNote["channel"], typeof Phone> = {
  Visit: UserRound,
  Phone: Phone,
  SMS: Smartphone,
  Email: Mail,
  "In-app": MessageSquare,
  Note: NotebookPen,
};

const CATEGORY_STYLES: Record<CaseNoteCategory, string> = {
  Welfare: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  Compliance:
    "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Family:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Education:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

type CaseNotesListProps = {
  firstName: string;
  workerName: string;
  initialNotes: CaseNote[];
};

export function CaseNotesList({
  firstName,
  workerName,
  initialNotes,
}: CaseNotesListProps) {
  const [notes, setNotes] = useState<CaseNote[]>(initialNotes);
  const [filter, setFilter] = useState<CaseNoteCategory | "All">("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [draftChannel, setDraftChannel] = useState<CaseNote["channel"]>("Phone");
  const [draftCategory, setDraftCategory] = useState<CaseNoteCategory>("Welfare");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftDetail, setDraftDetail] = useState("");
  const [draftFollowUp, setDraftFollowUp] = useState(false);
  const [draftFollowUpText, setDraftFollowUpText] = useState("");

  const visibleNotes = useMemo(() => {
    const filtered =
      filter === "All" ? notes : notes.filter((n) => n.category === filter);
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.date.getTime() - a.date.getTime();
    });
  }, [notes, filter]);

  const followUpCount = notes.filter((n) => n.followUp).length;

  function resetDraft() {
    setDraftChannel("Phone");
    setDraftCategory("Welfare");
    setDraftSummary("");
    setDraftDetail("");
    setDraftFollowUp(false);
    setDraftFollowUpText("");
  }

  function submitDraft() {
    if (!draftSummary.trim()) {
      toast.error("Add a short summary before saving.");
      return;
    }
    const note: CaseNote = {
      id: `local-${Date.now()}`,
      channel: draftChannel,
      category: draftCategory,
      summary: draftSummary.trim(),
      detail: draftDetail.trim(),
      worker: workerName,
      date: new Date(),
      pinned: false,
      followUp:
        draftFollowUp && draftFollowUpText.trim()
          ? draftFollowUpText.trim()
          : draftFollowUp
            ? "Follow up required"
            : null,
    };
    setNotes((prev) => [note, ...prev]);
    setDialogOpen(false);
    resetDraft();
    toast.success("Contact logged to the case record (demo only).");
  }

  function togglePin(id: string) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...CATEGORIES] as const).map((category) => (
            <Button
              key={category}
              size="sm"
              variant={filter === category ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFilter(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetDraft();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus />
              Log contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log contact</DialogTitle>
              <DialogDescription>
                Record contact with {firstName} or someone in their support
                network.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Channel</Label>
                  <Select
                    value={draftChannel}
                    onValueChange={(value) =>
                      setDraftChannel(value as CaseNote["channel"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {channel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={draftCategory}
                    onValueChange={(value) =>
                      setDraftCategory(value as CaseNoteCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note-summary">Summary</Label>
                <Input
                  id="note-summary"
                  placeholder="e.g. Check-in call, youth engaged well"
                  value={draftSummary}
                  onChange={(event) => setDraftSummary(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note-detail">Detail (optional)</Label>
                <Textarea
                  id="note-detail"
                  rows={3}
                  placeholder="What was discussed, who was present, outcome"
                  value={draftDetail}
                  onChange={(event) => setDraftDetail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draftFollowUp}
                    onCheckedChange={(value) => setDraftFollowUp(value === true)}
                  />
                  Follow-up required
                </label>
                {draftFollowUp ? (
                  <Input
                    placeholder="What needs to happen next"
                    value={draftFollowUpText}
                    onChange={(event) =>
                      setDraftFollowUpText(event.target.value)
                    }
                  />
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitDraft}>Save to case record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {followUpCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          <Flag className="mr-1 inline h-3 w-3 text-amber-500" />
          {followUpCount} open follow-up{followUpCount === 1 ? "" : "s"} across
          this case record
        </p>
      ) : null}

      <div className="space-y-3">
        {visibleNotes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No {filter === "All" ? "" : `${filter.toLowerCase()} `}notes yet.
            </CardContent>
          </Card>
        ) : (
          visibleNotes.map((note) => {
            const ChannelIcon = CHANNEL_ICONS[note.channel];
            return (
              <Card
                key={note.id}
                className={cn("gap-0 py-4", note.pinned && "border-primary/40")}
              >
                <CardContent className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                        <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <p className="truncate text-sm font-medium">
                        {note.summary}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 px-1.5 py-0 text-[10px]",
                          CATEGORY_STYLES[note.category],
                        )}
                      >
                        {note.category}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(note.date, "EEE d MMM · p")}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePin(note.id)}
                        title={note.pinned ? "Unpin" : "Pin"}
                        className={cn(
                          "rounded-md p-1 transition-colors hover:bg-accent",
                          note.pinned
                            ? "text-primary"
                            : "text-muted-foreground/50",
                        )}
                      >
                        <Pin
                          className={cn(
                            "h-3.5 w-3.5",
                            note.pinned && "fill-current",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  {note.detail ? (
                    <p className="pl-9 text-sm text-muted-foreground">
                      {note.detail}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9">
                    <span className="text-xs text-muted-foreground">
                      {note.channel} · {note.worker}
                    </span>
                    {note.followUp ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <Flag className="h-3 w-3" />
                        {note.followUp}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
