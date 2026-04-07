"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

import type { LucideIcon } from "lucide-react";

type DaybookPageClientProps = {
  organisation: string;
  venue: string;
};

const ENTRY_CATEGORIES = [
  { value: "operations", label: "Operations", icon: ClipboardList, color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  { value: "incident", label: "Incident", icon: AlertTriangle, color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  { value: "delivery", label: "Delivery", icon: Package, color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  { value: "staff", label: "Staff", icon: Users, color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200" },
  { value: "financial", label: "Financial", icon: DollarSign, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200" },
] as const;

type EntryCategory = (typeof ENTRY_CATEGORIES)[number]["value"];

type DaybookEntry = {
  id: string;
  date: string;
  time: string;
  category: EntryCategory;
  title: string;
  notes: string;
  amountCents?: number;
  createdBy: string;
};

type EntryForm = {
  category: EntryCategory;
  title: string;
  notes: string;
  amount: string;
  time: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    weekday: "short",
  }).format(d);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function nowTimeString(): string {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function getCategoryMeta(cat: string) {
  return ENTRY_CATEGORIES.find((c) => c.value === cat) ?? ENTRY_CATEGORIES[0];
}

const INITIAL_FORM: EntryForm = {
  category: "operations",
  title: "",
  notes: "",
  amount: "",
  time: nowTimeString(),
};

const SEED_ENTRIES: DaybookEntry[] = [
  { id: "d1", date: toIsoDate(new Date()), time: "06:15", category: "operations", title: "Open — all stations checked", notes: "Walk-in temps good. Prep list posted for AM team.", createdBy: "Alex Chen" },
  { id: "d2", date: toIsoDate(new Date()), time: "07:30", category: "delivery", title: "Bidfood delivery received", notes: "12 of 14 lines received. Short on portioned salmon (ETA Thurs). Invoice #INV-8824 uploaded.", amountCents: 243800, createdBy: "Sam Taylor" },
  { id: "d3", date: toIsoDate(new Date()), time: "09:00", category: "maintenance", title: "Dishwasher rinse arm replaced", notes: "Tech attended 8:45. Warranty claim submitted (ref DW-1192). Back in service.", amountCents: 0, createdBy: "Olivia Kim" },
  { id: "d4", date: toIsoDate(new Date()), time: "11:45", category: "incident", title: "Slip near cold room — no injury", notes: "Wet floor from condensation. Mopped and cone placed. Reviewed with team at briefing.", createdBy: "Jordan Lee" },
  { id: "d5", date: toIsoDate(new Date()), time: "14:00", category: "staff", title: "Mia called in sick — shift covered", notes: "Noah covering 14:00–22:00. Mia provided medical cert.", createdBy: "Alex Chen" },
  { id: "d6", date: toIsoDate(new Date()), time: "16:30", category: "financial", title: "Afternoon cash count", notes: "Float reconciled. $42 over — likely a mis-key on table 9. Noted for EOD.", amountCents: 4200, createdBy: "Olivia Kim" },
  { id: "d7", date: toIsoDate(new Date()), time: "22:10", category: "operations", title: "Close — all areas cleaned", notes: "Walk-in locked. Gas off. Alarm set. Tomorrow prep: brunch special mise en place.", createdBy: "Noah Patel" },
  { id: "d8", date: toIsoDate(addDays(new Date(), -1)), time: "07:00", category: "operations", title: "Open — Sunday service", notes: "Brunch setup complete by 0645. All stations stocked.", createdBy: "Alex Chen" },
  { id: "d9", date: toIsoDate(addDays(new Date(), -1)), time: "12:00", category: "delivery", title: "Fresh produce delivery", notes: "Full order received from Harris Farm. Quality good.", amountCents: 89500, createdBy: "Sam Taylor" },
];

export function DaybookPageClient({ organisation, venue }: DaybookPageClientProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [entries, setEntries] = useState<DaybookEntry[]>(SEED_ENTRIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DaybookEntry | null>(null);
  const [form, setForm] = useState<EntryForm>(INITIAL_FORM);

  const dateKey = toIsoDate(selectedDate);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => e.date === dateKey)
      .filter((e) => filterCategory === "all" || e.category === filterCategory)
      .filter((e) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return e.title.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [entries, dateKey, filterCategory, searchQuery]);

  const daySummary = useMemo(() => {
    const dayEntries = entries.filter((e) => e.date === dateKey);
    const totalAmountCents = dayEntries.reduce((sum, e) => sum + (e.amountCents ?? 0), 0);
    const byCat = ENTRY_CATEGORIES.map((cat) => ({
      ...cat,
      count: dayEntries.filter((e) => e.category === cat.value).length,
    }));
    return { total: dayEntries.length, totalAmountCents, byCat: byCat.filter((c) => c.count > 0) };
  }, [entries, dateKey]);

  function openNewEntry(): void {
    setEditingEntry(null);
    setForm({ ...INITIAL_FORM, time: nowTimeString() });
    setDialogOpen(true);
  }

  function handleEdit(entry: DaybookEntry): void {
    setEditingEntry(entry);
    setForm({
      category: entry.category,
      title: entry.title,
      notes: entry.notes,
      amount: entry.amountCents ? (entry.amountCents / 100).toFixed(2) : "",
      time: entry.time,
    });
    setDialogOpen(true);
  }

  function handleDelete(id: string): void {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Entry deleted");
  }

  function handleSubmit(): void {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const entry: DaybookEntry = {
      id: editingEntry?.id ?? `d-${Date.now()}`,
      date: dateKey,
      time: form.time,
      category: form.category,
      title: form.title.trim(),
      notes: form.notes.trim(),
      amountCents: form.amount ? Math.round(parseFloat(form.amount) * 100) : undefined,
      createdBy: "You",
    };

    if (editingEntry) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
      toast.success("Entry updated");
    } else {
      setEntries((prev) => [...prev, entry]);
      toast.success("Entry added");
    }

    setDialogOpen(false);
    setEditingEntry(null);
    setForm(INITIAL_FORM);
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Daybook</h1>
          <p className="text-sm text-muted-foreground">
            {organisation} &middot; {venue}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-[180px] text-xs font-medium"
              onClick={() => setSelectedDate(new Date())}
            >
              {formatDateLabel(selectedDate)}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNewEntry}>
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entries Today</p>
              <p className="text-2xl font-semibold">{daySummary.total}</p>
            </div>
          </CardContent>
        </Card>
        {daySummary.totalAmountCents > 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-2xl font-semibold">
                  ${(daySummary.totalAmountCents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Category breakdown badges */}
      {daySummary.byCat.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {daySummary.byCat.map((cat) => (
            <Badge key={cat.value} variant="outline" className="text-xs gap-1">
              {cat.label}: {cat.count}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-52 pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ENTRY_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entry cards */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold">No entries for this day</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {searchQuery || filterCategory !== "all"
              ? "Try adjusting your filters."
              : "Add your first entry to start the daybook."}
          </p>
          {!searchQuery && filterCategory === "all" ? (
            <Button className="mt-5 gap-1.5" onClick={openNewEntry}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const catMeta = getCategoryMeta(entry.category);
            const CatIcon: LucideIcon = catMeta.icon;
            return (
              <Card key={entry.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", catMeta.color)}>
                    <CatIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{entry.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {catMeta.label}
                          </Badge>
                          {entry.amountCents ? (
                            <Badge variant="secondary" className="text-xs">
                              ${(entry.amountCents / 100).toFixed(2)}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {entry.time} &middot; {entry.createdBy}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(entry)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {entry.notes ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{entry.notes}</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Prep suggestions placeholder */}
      <Card className="border-2 border-dashed border-muted bg-muted/20">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-semibold text-muted-foreground">Prep Suggestions Coming Soon</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Will recommend prep quantities based on sales forecast.
          </p>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "New Daybook Entry"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="entry-category">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as EntryCategory })}
                >
                  <SelectTrigger id="entry-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-time">Time</Label>
                <Input
                  id="entry-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-title">Title *</Label>
              <Input
                id="entry-title"
                placeholder="Brief description"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-notes">Notes</Label>
              <Textarea
                id="entry-notes"
                placeholder="Additional details..."
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-amount">Amount ($, optional)</Label>
              <Input
                id="entry-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingEntry ? "Update" : "Add Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
