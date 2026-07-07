"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { endOfDay, isBefore, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { GripVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { formatDate, relativeTime } from "@/lib/format";
import type {
  IdentityEntry,
  IdentitySection,
} from "@/entities/identity/model/types";
import {
  useCreateIdentityEntry,
  useDeleteIdentityEntry,
  useIdentityEntries,
  useReorderIdentityEntries,
  useUpdateIdentityEntry,
} from "@/hooks/identity/use-identity";
import { IDENTITY_SECTION_CONFIG } from "@/components/identity/sections";

type GoalStatus = {
  done: boolean;
  overdue: boolean;
  chip: string | null;
};

function goalStatus(entry: IdentityEntry): GoalStatus {
  const done = entry.extras.done === true;
  const target = entry.extras.targetDate;
  if (!target) return { done, overdue: false, chip: null };
  const date = parseISO(target);
  if (Number.isNaN(date.getTime())) return { done, overdue: false, chip: null };
  const overdue = !done && isBefore(endOfDay(date), new Date());
  if (done) return { done, overdue: false, chip: formatDate(target) };
  if (overdue) return { done, overdue, chip: `${relativeTime(date)} overdue` };
  // Mirror the future date into the past so the shared formatter can size it.
  const mirrored = new Date(2 * Date.now() - date.getTime());
  return { done, overdue, chip: `${relativeTime(mirrored)} left` };
}

export function IdentitySectionPage({ section }: { section: IdentitySection }) {
  const config = IDENTITY_SECTION_CONFIG[section];
  const isGoals = section === "goals";
  const Icon = config.icon;

  const { data: entries, isLoading } = useIdentityEntries(section);
  const createEntry = useCreateIdentityEntry(section);
  const updateEntry = useUpdateIdentityEntry(section);
  const deleteEntry = useDeleteIdentityEntry(section);
  const reorderEntries = useReorderIdentityEntries(section);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IdentityEntry | null>(null);
  const [deleting, setDeleting] = useState<IdentityEntry | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    })
  );

  const all = entries ?? [];
  const activeEntry = all.find((entry) => entry.id === activeId) ?? null;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(entry: IdentityEntry) {
    setEditing(entry);
    setDialogOpen(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    const dragId = event.active.id;
    if (!overId || overId === dragId) return;
    const from = all.findIndex((entry) => entry.id === dragId);
    const to = all.findIndex((entry) => entry.id === overId);
    if (from < 0 || to < 0) return;
    const next = [...all];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    reorderEntries.mutate(next.map((entry) => entry.id));
  }

  return (
    <section className="w-full space-y-4">
      <PageHeader
        title={config.title}
        subtitle={config.guidance}
        icon={<Icon className="h-5 w-5" />}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New entry
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : all.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Nothing in {config.title} yet
                </p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  {config.guidance}
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Start with
                </span>
                {config.starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={createEntry.isPending}
                    onClick={() => createEntry.mutate({ title: starter })}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
              <Button size="sm" className="mt-2 gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New entry
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event: DragStartEvent) =>
            setActiveId(String(event.active.id))
          }
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="mx-auto w-full max-w-3xl space-y-2">
            {all.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(index * 0.04, 0.4),
                }}
              >
                <SortableEntry
                  entry={entry}
                  isGoals={isGoals}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onToggleDone={(next) =>
                    updateEntry.mutate({
                      entryId: entry.id,
                      input: { extras: { ...entry.extras, done: next } },
                    })
                  }
                />
              </motion.div>
            ))}
          </div>
          <DragOverlay>
            {activeEntry ? (
              <EntryCard entry={activeEntry} isGoals={isGoals} dragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <EntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        isGoals={isGoals}
        create={createEntry}
        update={updateEntry}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.title}" will be removed from ${config.title}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleting) deleteEntry.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SortableEntry({
  entry,
  isGoals,
  onEdit,
  onDelete,
  onToggleDone,
}: {
  entry: IdentityEntry;
  isGoals: boolean;
  onEdit: (entry: IdentityEntry) => void;
  onDelete: (entry: IdentityEntry) => void;
  onToggleDone: (next: boolean) => void;
}) {
  const draggable = useDraggable({ id: entry.id });
  const droppable = useDroppable({ id: entry.id });

  return (
    <div
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      style={{
        transform: CSS.Translate.toString(draggable.transform),
        opacity: draggable.isDragging ? 0.4 : 1,
      }}
      className={cn(
        droppable.isOver && !draggable.isDragging && "translate-y-0.5"
      )}
    >
      <EntryCard
        entry={entry}
        isGoals={isGoals}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleDone={onToggleDone}
        handleProps={{ ...draggable.listeners, ...draggable.attributes }}
      />
    </div>
  );
}

function EntryCard({
  entry,
  isGoals,
  dragging,
  onEdit,
  onDelete,
  onToggleDone,
  handleProps,
}: {
  entry: IdentityEntry;
  isGoals: boolean;
  dragging?: boolean;
  onEdit?: (entry: IdentityEntry) => void;
  onDelete?: (entry: IdentityEntry) => void;
  onToggleDone?: (next: boolean) => void;
  handleProps?: Record<string, unknown>;
}) {
  const status = isGoals ? goalStatus(entry) : null;

  return (
    <Card
      className={cn(
        status?.overdue && "border-destructive/40 bg-destructive/5",
        dragging && "rotate-1 shadow-lg"
      )}
    >
      <CardContent className="flex items-start gap-2.5 p-3.5">
        <button
          type="button"
          aria-label="Reorder"
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          {...handleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {isGoals && onToggleDone ? (
          <Checkbox
            checked={status?.done ?? false}
            onCheckedChange={(checked) => onToggleDone(checked === true)}
            aria-label="Done"
            className="mt-1"
          />
        ) : null}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                status?.done && "text-muted-foreground line-through"
              )}
            >
              {entry.title}
            </p>
            {status?.chip ? (
              <Badge
                variant={status.overdue ? "destructive" : "secondary"}
                className={cn(
                  "shrink-0 text-[10px]",
                  status.done && "opacity-60"
                )}
              >
                {status.chip}
              </Badge>
            ) : null}
          </div>
          {entry.body ? (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {entry.body}
            </p>
          ) : null}
        </div>

        {onEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            aria-label="Edit"
            onClick={() => onEdit(entry)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Delete"
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EntryDialog({
  open,
  onOpenChange,
  editing,
  isGoals,
  create,
  update,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: IdentityEntry | null;
  isGoals: boolean;
  create: ReturnType<typeof useCreateIdentityEntry>;
  update: ReturnType<typeof useUpdateIdentityEntry>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const formKey = `${open ? "open" : "closed"}:${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (open && formKey !== lastKey) {
    setLastKey(formKey);
    setTitle(editing?.title ?? "");
    setBody(editing?.body ?? "");
    setTargetDate(editing?.extras.targetDate ?? "");
  }
  if (!open && lastKey !== null) setLastKey(null);

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const canSave = title.trim().length > 0 && !pending;

  function handleSubmit() {
    if (!canSave) return;
    const input = {
      title: title.trim(),
      body: body.trim() || null,
      extras: isGoals
        ? { ...(editing?.extras ?? {}), targetDate: targetDate || null }
        : undefined,
    };
    if (editing) {
      update.mutate(
        { entryId: editing.id, input },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(input, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            autoFocus
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Say more about it (optional)"
            rows={4}
          />

          {isGoals ? (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                Target date
              </label>
              <Input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="w-40"
              />
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={!canSave}>
              {pending ? "Saving…" : editing ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
