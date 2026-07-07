"use client";

import { useState } from "react";
import { FileUp, Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { CIRCLE_CONFIG, PersonCard } from "@/components/molecules/person-card";
import { ImportContactsDialog } from "@/components/organisms/import-contacts-dialog";
import { PersonDetailDialog } from "@/components/organisms/person-detail-dialog";
import { useCreatePerson, usePeople } from "@/hooks/people/use-people";
import {
  PERSON_CIRCLES,
  type PersonCircle,
} from "@/entities/people/model/types";

type CircleFilter = PersonCircle | "all";

export default function SocialRelationshipsPage() {
  const [filter, setFilter] = useState<CircleFilter>("all");
  const [name, setName] = useState("");
  const [circle, setCircle] = useState<PersonCircle | "none">("none");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: people, isLoading, error } = usePeople();
  const createPerson = useCreatePerson();

  const filtered =
    people?.filter(
      (person) => filter === "all" || person.circles.includes(filter),
    ) ?? [];
  const selectedPerson =
    people?.find((person) => person.id === selectedPersonId) ?? null;

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || createPerson.isPending) return;
    createPerson.mutate(
      { fullName: trimmed, circles: circle === "none" ? [] : [circle] },
      {
        onSuccess: (person) => {
          setName("");
          setCircle("none");
          setSelectedPersonId(person.id);
        },
      },
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Relationships"
        subtitle={
          isLoading
            ? "Loading..."
            : `${people?.length ?? 0} ${people?.length === 1 ? "person" : "people"} in your life`
        }
      />

      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleCreate();
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Add a person..."
          className="max-w-sm"
        />
        <Select
          value={circle}
          onValueChange={(value) => setCircle(value as PersonCircle | "none")}
        >
          <SelectTrigger className="w-32" aria-label="Circle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No circle</SelectItem>
            {PERSON_CIRCLES.map((option) => (
              <SelectItem key={option} value={option}>
                {CIRCLE_CONFIG[option].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="icon"
          aria-label="Add person"
          disabled={!name.trim() || createPerson.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="ml-auto gap-1.5"
          onClick={() => setImportOpen(true)}
        >
          <FileUp className="h-3.5 w-3.5" />
          Import
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...PERSON_CIRCLES] as CircleFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === option
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {option === "all" ? "All" : CIRCLE_CONFIG[option].label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === "all"
            ? "No people yet. Add someone above, or just mention them to the Agent."
            : `No one in ${CIRCLE_CONFIG[filter as PersonCircle].label} yet.`}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onOpen={(opened) => setSelectedPersonId(opened.id)}
            />
          ))}
        </div>
      )}

      <PersonDetailDialog
        person={selectedPerson}
        onOpenChange={(open) => {
          if (!open) setSelectedPersonId(null);
        }}
      />
      <ImportContactsDialog open={importOpen} onOpenChange={setImportOpen} />
    </section>
  );
}
