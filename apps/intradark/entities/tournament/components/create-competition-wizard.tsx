"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { createCompetitionAction } from "../actions";
import {
  ENTRY_TYPES,
  FORMAT_SLUGS,
  GAME_MODES,
  RECURRENCES,
} from "../lib/constants";

const FORMAT_LABELS: Record<string, string> = {
  ladder: "Open Ladder (positional, challenge ±3)",
  league: "League (round-robin)",
  bracket: "Bracket (single/double elim)",
  queue: "PUG Queue (matchmaker, steal points)",
};

const ENTRY_LABELS: Record<string, string> = {
  open: "Open — anyone eligible joins",
  approval: "Approval — apply, organizer approves",
  invite_only: "Invite only — organizer adds entrants",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateCompetitionWizard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [gameMode, setGameMode] = useState<string>("5v5");
  const [format, setFormat] = useState<string>("ladder");
  const [entryType, setEntryType] = useState<string>("open");
  const [recurrence, setRecurrence] = useState<string>("one_shot");
  const [description, setDescription] = useState("");
  const [prizePool, setPrizePool] = useState("");

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function submit() {
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required.");
      return;
    }
    startTransition(async () => {
      const result = await createCompetitionAction({
        name: name.trim(),
        slug: slug.trim(),
        gameMode,
        format,
        entryType,
        recurrence,
        description: description.trim() || undefined,
        season: {
          prizePool: prizePool ? Number(prizePool) : undefined,
        },
      });
      if (result.ok) {
        toast.success(`Created "${name}".`);
        router.push(`/tournaments/${result.data.slug}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create competition</CardTitle>
        <CardDescription>
          Spins up the competition, its first season, and an initial stage of the
          chosen format. Tune dates, prizes, and rules afterward.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Name</Label>
            <Input
              id="comp-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Champions League"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-slug">Slug</Label>
            <Input
              id="comp-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="champions-league"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_SLUGS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMAT_LABELS[f] ?? f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Game mode</Label>
            <Select value={gameMode} onValueChange={setGameMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GAME_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Entry type</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ENTRY_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Recurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "one_shot" ? "One-shot event" : "Recurring seasons"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="comp-prize">Prize pool (optional)</Label>
            <Input
              id="comp-prize"
              type="number"
              min={0}
              value={prizePool}
              onChange={(e) => setPrizePool(e.target.value)}
              placeholder="1000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comp-desc">Description (optional)</Label>
          <Textarea
            id="comp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <Button onClick={submit} disabled={pending}>
          {pending ? "Creating…" : "Create competition"}
        </Button>
      </CardContent>
    </Card>
  );
}
