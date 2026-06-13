"use client";

import { useState } from "react";
import { HandHeart, Plus, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { CIRCLE_CONFIG, lastTouchLabel } from "@/components/molecules/person-card";
import { PersonEmails } from "@/components/molecules/person-emails";
import {
  PERSON_CIRCLES,
  type Person,
  type PersonCircle,
} from "@/entities/people/model/types";
import { useDeletePerson, useUpdatePerson } from "@/hooks/people/use-people";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CADENCE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "7", label: "Weekly" },
  { value: "14", label: "Fortnightly" },
  { value: "30", label: "Monthly" },
  { value: "90", label: "Quarterly" },
];

type PersonDetailDialogProps = {
  person: Person | null;
  onOpenChange: (open: boolean) => void;
};

export function PersonDetailDialog({
  person,
  onOpenChange,
}: PersonDetailDialogProps) {
  return (
    <Dialog open={person !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Person details</DialogTitle>
        {person ? (
          <PersonEditor
            key={person.id}
            person={person}
            close={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PersonEditor({ person, close }: { person: Person; close: () => void }) {
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();

  const [fullName, setFullName] = useState(person.fullName);
  const [bio, setBio] = useState(person.bio ?? "");
  const [interestsText, setInterestsText] = useState(person.interests.join(", "));
  const [emailsText, setEmailsText] = useState(person.emails.join(", "));
  const [phone, setPhone] = useState(person.phone ?? "");
  const [company, setCompany] = useState(person.company ?? "");
  const [role, setRole] = useState(person.role ?? "");
  const [newFact, setNewFact] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function mutate(input: Parameters<typeof updatePerson.mutate>[0]["input"]) {
    setFieldError(null);
    updatePerson.mutate(
      { personId: person.id, input },
      { onError: (error) => setFieldError(error.message) },
    );
  }

  function commitName() {
    const trimmed = fullName.trim();
    if (!trimmed || trimmed === person.fullName) {
      setFullName(person.fullName);
      return;
    }
    mutate({ fullName: trimmed });
  }

  function commitBio() {
    const value = bio.trim();
    if (value === (person.bio ?? "")) return;
    mutate({ bio: value || null });
  }

  function commitInterests() {
    const interests = interestsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (interests.join("|") === person.interests.join("|")) return;
    mutate({ interests });
  }

  function commitEmails() {
    const emails = emailsText
      .split(/[,;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (emails.join("|") === person.emails.join("|")) return;
    mutate({ emails });
  }

  function commitText(
    value: string,
    current: string | null,
    field: "phone" | "company" | "role",
  ) {
    const trimmed = value.trim();
    if (trimmed === (current ?? "")) return;
    mutate({ [field]: trimmed || null });
  }

  function toggleCircle(circle: PersonCircle) {
    const next = person.circles.includes(circle)
      ? person.circles.filter((c) => c !== circle)
      : [...person.circles, circle];
    mutate({ circles: next });
  }

  function addFact() {
    const fact = newFact.trim();
    if (!fact) return;
    mutate({ facts: [...person.facts, fact] });
    setNewFact("");
  }

  function removeFact(index: number) {
    mutate({ facts: person.facts.filter((_, i) => i !== index) });
  }

  return (
    <div className="grid sm:grid-cols-[1fr_240px]">
      <div className="space-y-5 p-6">
        <Input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          aria-label="Name"
          className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Bio</p>
          <Textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            onBlur={commitBio}
            placeholder="Who are they to you?"
            rows={2}
            className="resize-none border-border/60 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Interests</p>
          <Input
            value={interestsText}
            onChange={(event) => setInterestsText(event.target.value)}
            onBlur={commitInterests}
            placeholder="bouldering, ceramics, F1 (comma separated)"
            className="text-sm"
          />
          {person.interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {person.interests.map((interest) => (
                <Badge key={interest} variant="secondary" className="text-[11px]">
                  {interest}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Notes &amp; facts
          </p>
          <div className="space-y-1.5">
            {person.facts.map((fact, index) => (
              <div
                key={`${index}-${fact.slice(0, 20)}`}
                className="group flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-1.5 text-sm"
              >
                <span className="flex-1">{fact}</span>
                <button
                  type="button"
                  onClick={() => removeFact(index)}
                  className="mt-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Remove fact"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addFact();
            }}
          >
            <Input
              value={newFact}
              onChange={(event) => setNewFact(event.target.value)}
              placeholder="Add a note..."
              className="h-8 text-sm"
            />
            <Button type="submit" size="icon" variant="outline" className="h-8 w-8">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>

        <PersonEmails personId={person.id} />

        {fieldError ? (
          <p className="text-sm text-destructive">{fieldError}</p>
        ) : null}
      </div>

      <div className="space-y-5 border-t border-border/60 bg-muted/30 px-5 py-6 text-sm sm:border-l sm:border-t-0">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Circles</p>
          <div className="flex flex-wrap gap-1.5">
            {PERSON_CIRCLES.map((circle) => {
              const selected = person.circles.includes(circle);
              return (
                <button
                  key={circle}
                  type="button"
                  onClick={() => toggleCircle(circle)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? CIRCLE_CONFIG[circle].badgeClass
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {CIRCLE_CONFIG[circle].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Birthday</p>
          <div className="flex gap-1.5">
            <Input
              type="number"
              min={1}
              max={31}
              value={person.birthdayDay ?? ""}
              onChange={(event) =>
                mutate({
                  birthdayDay: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="D"
              aria-label="Birthday day"
              className="h-8 w-14 text-xs"
            />
            <Select
              value={person.birthdayMonth ? String(person.birthdayMonth) : "none"}
              onValueChange={(value) =>
                mutate({
                  birthdayMonth: value === "none" ? null : Number(value),
                })
              }
            >
              <SelectTrigger className="h-8 flex-1 text-xs" aria-label="Birthday month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            min={1900}
            max={2100}
            value={person.birthdayYear ?? ""}
            onChange={(event) =>
              mutate({
                birthdayYear: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            placeholder="Year (optional)"
            aria-label="Birthday year"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Emails</p>
          <Input
            value={emailsText}
            onChange={(event) => setEmailsText(event.target.value)}
            onBlur={commitEmails}
            placeholder="name@work.com"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Phone</p>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => commitText(phone, person.phone, "phone")}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Company</p>
          <Input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            onBlur={() => commitText(company, person.company, "company")}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Role</p>
          <Input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            onBlur={() => commitText(role, person.role, "role")}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Touch base
          </p>
          <Select
            value={person.touchBaseDays ? String(person.touchBaseDays) : "off"}
            onValueChange={(value) =>
              mutate({ touchBaseDays: value === "off" ? null : Number(value) })
            }
          >
            <SelectTrigger className="h-8 w-full text-xs" aria-label="Touch base cadence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CADENCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => mutate({ lastTouchAt: new Date().toISOString() })}
          >
            <HandHeart className="h-3.5 w-3.5" />
            Log touch — last {lastTouchLabel(person)}
          </Button>
          {person.lastTouchAt ? (
            <p className="text-[11px] text-muted-foreground">
              Last contact {format(parseISO(person.lastTouchAt), "d MMM yyyy")}
            </p>
          ) : null}
        </div>

        <div className="border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => deletePerson.mutate(person.id, { onSuccess: close })}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete person
          </Button>
        </div>
      </div>
    </div>
  );
}
