"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Clock,
  Send,
  Loader2,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Textarea } from "@workspace/ui/components/textarea";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";

import { createBrowserClient } from "@/utils/supabase/client";
import { useMeStore } from "@/entities/me/model/store";
import { useRoles } from "@/entities/users/model/store";
import type { AdminTicket, AdminNote } from "./tickets-table";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-500" },
  feature: { label: "Feature", icon: Lightbulb, color: "text-blue-500" },
  question: { label: "Question", icon: HelpCircle, color: "text-amber-500" },
  feedback: { label: "Feedback", icon: MessageSquare, color: "text-green-500" },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const ROLE_BADGE_MAP: Record<string, { label: string; className: string }> = {
  INTRADARK_DEV: {
    label: "Dev",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  },
  PLATFORM_ADMIN: {
    label: "Admin",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  PLATFORM_MODERATOR: {
    label: "Moderator",
    className:
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
  },
  PLATFORM_STAFF: {
    label: "Staff",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800",
  },
  GOVERNMENT_VIEWER: {
    label: "Gov",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TicketDetailDialogProps {
  ticket: AdminTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated: (ticket: Partial<AdminTicket> & { id: string }) => void;
}

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated,
}: TicketDetailDialogProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient();
  const currentUser = useMeStore((s) => s.currentUser);
  const { data: roles } = useRoles();

  // Determine if current user has INTRADARK_DEV role
  const isIntraDarkDev = (() => {
    if (!currentUser?.roleIds || !roles) return false;
    const devRole = roles.find((r: any) => r.key === "INTRADARK_DEV");
    if (!devRole) return false;
    return currentUser.roleIds.includes(devRole.id);
  })();

  const getToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  // Scroll to bottom of notes when new note added
  useEffect(() => {
    if (notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.adminNotes]);

  if (!ticket) return null;

  const typeMeta = TYPE_META[ticket.type] ?? {
    label: ticket.type,
    icon: MessageSquare,
    color: "text-muted-foreground",
  };
  const TypeIcon = typeMeta.icon;
  const statusBadge = STATUS_BADGE_MAP[ticket.status] ?? {
    label: ticket.status,
    className: "bg-muted text-muted-foreground",
  };
  const notes: AdminNote[] = Array.isArray(ticket.adminNotes) ? ticket.adminNotes : [];
  const submitterName = [ticket.submitterFirstName, ticket.submitterLastName]
    .filter(Boolean)
    .join(" ") || "Unknown";

  // ── Status Update ───────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === ticket.status) return;

    setIsUpdatingStatus(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Session expired. Please refresh.");
        return;
      }

      const res = await fetch(`/api/feedback-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const updated = await res.json();
      onTicketUpdated({ id: ticket.id, status: updated.status });
      toast.success(`Status updated to ${STATUS_BADGE_MAP[newStatus]?.label ?? newStatus}`);
    } catch (e: any) {
      console.error("[ticket-detail] status update error:", e);
      toast.error(e.message ?? "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Add Note ──────────────────────────────────────────────────────────

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) return;

    setIsAddingNote(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Session expired. Please refresh.");
        return;
      }

      const res = await fetch(`/api/feedback-tickets/${ticket.id}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const newNote = await res.json();
      const updatedNotes = [...notes, newNote];
      onTicketUpdated({ id: ticket.id, adminNotes: updatedNotes });
      setNoteText("");
      toast.success("Note added");
    } catch (e: any) {
      console.error("[ticket-detail] add note error:", e);
      toast.error(e.message ?? "Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogDescription className="sr-only">
            Ticket details and screenshot
          </DialogDescription>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon className={`h-5 w-5 ${typeMeta.color}`} />
              <span>{typeMeta.label} Ticket</span>
              <Badge variant="outline" className={`ml-1 text-xs ${statusBadge.className}`}>
                {statusBadge.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1">
            {/* ── Ticket Info ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Submitted By</p>
                <p className="font-medium">{submitterName}</p>
                <p className="text-xs text-muted-foreground">{ticket.submitterEmail}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="font-medium">{formatDate(ticket.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(ticket.createdAt)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Page Path</p>
                <p className="text-sm text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 truncate">
                  {ticket.pagePath}
                </p>
              </div>
            </div>

            {/* ── Description ─────────────────────────────── */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <div className="text-sm whitespace-pre-wrap bg-muted/30 rounded-md p-3 border">
                {ticket.description}
              </div>
            </div>

            {/* ── Screenshot ──────────────────────────────── */}
            {ticket.screenshotUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Screenshot</p>
                <div
                  className="relative group rounded-md border overflow-hidden cursor-pointer max-h-48"
                  onClick={() => setShowScreenshot(true)}
                >
                  <img
                    src={ticket.screenshotUrl}
                    alt="Ticket screenshot"
                    className="w-full max-h-48 object-contain object-top"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-sm font-medium">
                      <Eye className="h-4 w-4" />
                      Click to view
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* ── Status Control ───────────────────────────── */}
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                Change Status:
              </p>
              <Select
                value={ticket.status}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => {
                    // Hide "Closed" option for non-INTRADARK_DEV users
                    if (opt.value === "closed" && !isIntraDarkDev) return null;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {isUpdatingStatus && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isIntraDarkDev && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Only devs can close
                </span>
              )}
            </div>

            <Separator />

            {/* ── Admin Notes ──────────────────────────────── */}
            <div>
              <p className="text-sm font-medium mb-2">
                Admin Notes ({notes.length})
              </p>

              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No notes yet. Add one below.
                </p>
              ) : (
                <ScrollArea className="max-h-[200px] pr-2">
                  <div className="space-y-3">
                    {notes.map((note) => {
                      const roleBadge = ROLE_BADGE_MAP[note.authorRole] ?? {
                        label: note.authorRole,
                        className: "bg-muted text-muted-foreground border-border",
                      };
                      return (
                        <div
                          key={note.id}
                          className="rounded-md border p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {note.authorName}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${roleBadge.className}`}
                              >
                                {roleBadge.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{note.text}</p>
                        </div>
                      );
                    })}
                    <div ref={notesEndRef} />
                  </div>
                </ScrollArea>
              )}

              {/* Add Note Input */}
              <div className="mt-3 flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  className="min-h-[60px] text-sm resize-none flex-1"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  disabled={isAddingNote}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="self-end h-8"
                  onClick={handleAddNote}
                  disabled={isAddingNote || !noteText.trim()}
                >
                  {isAddingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Press Ctrl+Enter to send
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Screenshot Preview Dialog ──────────────────── */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent
          className="w-[75vw] sm:max-w-[75vw] h-fit max-h-[90vh] p-3 gap-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Full size screenshot preview
          </DialogDescription>
          {ticket.screenshotUrl && (
            <img
              src={ticket.screenshotUrl}
              alt="Screenshot full preview"
              className="w-full max-h-[calc(90vh-1.5rem)] object-contain rounded-sm cursor-pointer"
              onClick={() => setShowScreenshot(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
