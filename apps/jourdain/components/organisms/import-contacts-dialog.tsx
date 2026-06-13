"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp, Search } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import { CIRCLE_CONFIG } from "@/components/molecules/person-card";
import { parseVcards, type VcardContact } from "@/lib/people/vcard";
import { useImportPeople, usePeople } from "@/hooks/people/use-people";
import {
  PERSON_CIRCLES,
  type PersonCircle,
} from "@/entities/people/model/types";

type ImportContactsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportContactsDialog({
  open,
  onOpenChange,
}: ImportContactsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [contacts, setContacts] = useState<VcardContact[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [circle, setCircle] = useState<PersonCircle | "none">("none");
  const [parseError, setParseError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const { data: existingPeople } = usePeople();
  const importPeople = useImportPeople();

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const person of existingPeople ?? []) {
      keys.add(person.fullName.toLowerCase());
      for (const email of person.emails) keys.add(email.toLowerCase());
    }
    return keys;
  }, [existingPeople]);

  function isDuplicate(contact: VcardContact): boolean {
    if (existingKeys.has(contact.fullName.toLowerCase())) return true;
    return contact.emails.some((email) => existingKeys.has(email.toLowerCase()));
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts
      .map((contact, index) => ({ contact, index }))
      .filter(({ contact }) => {
        if (!term) return true;
        return (
          contact.fullName.toLowerCase().includes(term) ||
          contact.emails.some((email) => email.includes(term)) ||
          (contact.company ?? "").toLowerCase().includes(term)
        );
      });
  }, [contacts, search]);

  function reset() {
    setContacts([]);
    setFileName(null);
    setSelected(new Set());
    setSearch("");
    setCircle("none");
    setParseError(null);
    setSummary(null);
  }

  async function handleFile(file: File) {
    setParseError(null);
    setSummary(null);
    try {
      const text = await file.text();
      const parsed = parseVcards(text);
      if (parsed.length === 0) {
        setParseError("No contacts found in that file — is it a .vcf export?");
        return;
      }
      parsed.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setContacts(parsed);
      setFileName(file.name);
      setSelected(new Set());
    } catch {
      setParseError("Couldn't read that file.");
    }
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const { contact, index } of filtered) {
        if (!isDuplicate(contact)) next.add(index);
      }
      return next;
    });
  }

  function handleImport() {
    const chosen = contacts
      .filter((_, index) => selected.has(index))
      .map((contact) => ({
        fullName: contact.fullName,
        circles: circle === "none" ? [] : [circle],
        birthdayMonth: contact.birthdayMonth,
        birthdayDay: contact.birthdayDay,
        birthdayYear: contact.birthdayYear,
        emails: contact.emails,
        phone: contact.phone,
        company: contact.company,
        role: contact.role,
      }));
    if (chosen.length === 0 || importPeople.isPending) return;
    importPeople.mutate(chosen, {
      onSuccess: (result) => {
        setSummary(
          `Imported ${result.importedCount}${
            result.skippedCount ? `, skipped ${result.skippedCount} already in Jourdain` : ""
          }.`,
        );
        setSelected(new Set());
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
        </DialogHeader>

        {contacts.length === 0 ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Export your contacts as a vCard file (on iPhone: iCloud.com →
              Contacts → select all → Export vCard), then drop the .vcf here.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              Choose .vcf file
            </Button>
            {parseError ? (
              <p className="text-sm text-destructive">{parseError}</p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {fileName} — {contacts.length} contacts. Tick the people who
                matter; skip the plumbers.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search..."
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={selectAllFiltered}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelected(new Set())}
                >
                  None
                </Button>
              </div>
            </div>

            <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-2">
              {filtered.map(({ contact, index }) => {
                const duplicate = isDuplicate(contact);
                const subtitle = [
                  contact.emails[0],
                  contact.phone,
                  contact.company,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={duplicate}
                    onClick={() => toggle(index)}
                    className="flex w-full items-center gap-3 rounded-md border border-border/50 px-3 py-2 text-left transition-colors hover:border-border disabled:opacity-50"
                  >
                    <Checkbox
                      checked={duplicate || selected.has(index)}
                      disabled={duplicate}
                      className="pointer-events-none"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {contact.fullName}
                        {duplicate ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            already in Jourdain
                          </span>
                        ) : null}
                      </p>
                      {subtitle ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No matches.
                </p>
              ) : null}
            </div>

            {importPeople.error ? (
              <p className="text-sm text-destructive">
                {importPeople.error.message}
              </p>
            ) : null}
            {summary ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {summary}
              </p>
            ) : null}

            <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
              <Select
                value={circle}
                onValueChange={(value) =>
                  setCircle(value as PersonCircle | "none")
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs" aria-label="Assign circle">
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
              {summary ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Done
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={selected.size === 0 || importPeople.isPending}
                  onClick={handleImport}
                >
                  {importPeople.isPending
                    ? "Importing..."
                    : `Import ${selected.size || ""}`.trim()}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
