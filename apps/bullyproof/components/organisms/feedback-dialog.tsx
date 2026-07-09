"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname } from "next/navigation";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  ImageIcon,
  Trash2,
  Loader2,
  Inbox,
  Clock,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
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
import { Tabs, TabsContent } from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import { createBrowserClient } from "@/utils/supabase/client";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "question", "feedback"]),
  pagePath: z.string().min(1),
  description: z.string().min(1, "Please provide a description").max(5000),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FEEDBACK_TYPES = [
  {
    value: "bug",
    label: "Report a Bug",
    icon: Bug,
    color: "text-red-500",
    bg: "bg-red-500/5",
  },
  {
    value: "feature",
    label: "Suggest a Feature",
    icon: Lightbulb,
    color: "text-blue-500",
    bg: "bg-blue-500/5",
  },
  {
    value: "question",
    label: "Ask a Question",
    icon: HelpCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/5",
  },
  {
    value: "feedback",
    label: "General Feedback",
    icon: MessageSquare,
    color: "text-green-500",
    bg: "bg-green-500/5",
  },
] as const;

type FeedbackTypeValue = (typeof FEEDBACK_TYPES)[number]["value"];

const TYPE_COLOR_MAP: Record<string, string> = {
  bug: "text-red-500",
  feature: "text-blue-500",
  question: "text-amber-500",
  feedback: "text-green-500",
};

const TYPE_BADGE_MAP: Record<string, { label: string; className: string }> = {
  bug: {
    label: "Bug",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
  feature: {
    label: "Feature",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  question: {
    label: "Question",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  feedback: {
    label: "Feedback",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
};

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Types
// ---------------------------------------------------------------------------

interface AdminNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  readByUser: boolean;
}

interface FeedbackTicket {
  id: string;
  type: string;
  pagePath: string;
  description: string;
  screenshotUrl: string | null;
  status: string;
  adminNotes: AdminNote[] | null;
  createdAt: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotBlob: Blob | null;
  /** Called when unread count may have changed (e.g. notes marked as read). */
  onUnreadCountChange?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackDialog({
  open,
  onOpenChange,
  screenshotBlob,
  onUnreadCountChange,
}: FeedbackDialogProps) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<string>("new");
  const [showScreenshotPreview, setShowScreenshotPreview] = useState(false);

  // My Tickets state
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [newTicketId, setNewTicketId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const screenshotPreviewUrl = useMemo(() => {
    if (!currentScreenshot) return null;
    return URL.createObjectURL(currentScreenshot);
  }, [currentScreenshot]);

  // Clean up object URL on unmount / change
  useEffect(() => {
    return () => {
      if (screenshotPreviewUrl) {
        URL.revokeObjectURL(screenshotPreviewUrl);
      }
    };
  }, [screenshotPreviewUrl]);

  // Sync initial screenshot blob when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentScreenshot(screenshotBlob);
    }
  }, [open, screenshotBlob]);

  // Fetch tickets when "My Tickets" tab is selected
  const fetchTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    setTicketsError(null);
    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setTicketsError("You must be logged in to view tickets.");
        return;
      }

      const response = await fetch("/api/feedback-tickets/mine", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load tickets");
      }

      const data = await response.json();
      setTickets(data);
    } catch (err: any) {
      setTicketsError(err.message || "Something went wrong.");
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    if (open && activeTab === "tickets") {
      fetchTickets();
    }
  }, [open, activeTab, fetchTickets]);

  // Mark all notes on a ticket as read
  const markNotesRead = useCallback(
    async (ticketId: string) => {
      try {
        const supabase = createBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        await fetch(`/api/feedback-tickets/${ticketId}/notes/read`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        // Update local state to mark notes as read
        setTickets((prev) =>
          prev.map((t) => {
            if (t.id !== ticketId || !t.adminNotes) return t;
            return {
              ...t,
              adminNotes: t.adminNotes.map((n) => ({ ...n, readByUser: true })),
            };
          })
        );

        onUnreadCountChange?.();
      } catch (e) {
        console.error("[feedback-dialog] mark-read error:", e);
      }
    },
    [onUnreadCountChange]
  );

  // When a ticket with unread notes is expanded, mark them as read
  const handleToggleExpand = useCallback(
    (ticketId: string, hasUnread: boolean) => {
      const isExpanding = expandedTicketId !== ticketId;
      setExpandedTicketId(isExpanding ? ticketId : null);
      if (isExpanding && hasUnread) {
        markNotesRead(ticketId);
      }
    },
    [expandedTicketId, markNotesRead]
  );

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema as any),
    defaultValues: {
      type: "bug",
      pagePath: pathname,
      description: "",
    },
  });

  // Update pagePath when pathname changes
  useEffect(() => {
    form.setValue("pagePath", pathname);
  }, [pathname, form]);

  const handleReplaceScreenshot = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentScreenshot(file);
    }
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleRemoveScreenshot = () => {
    setCurrentScreenshot(null);
  };

  const onSubmit = async (values: FeedbackFormValues) => {
    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("You must be logged in to submit feedback.");
        return;
      }

      const formData = new FormData();
      formData.append("type", values.type);
      formData.append("pagePath", values.pagePath);
      formData.append("description", values.description);

      if (currentScreenshot) {
        formData.append(
          "screenshot",
          currentScreenshot,
          `screenshot.${currentScreenshot.type === "image/jpeg" ? "jpg" : "png"}`
        );
      }

      const response = await fetch("/api/feedback-tickets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback");
      }

      const createdTicket = await response.json();

      toast.success("Feedback submitted successfully! Thank you.");
      form.reset({ type: "bug", pagePath: pathname, description: "" });
      setCurrentScreenshot(null);

      // Switch to My Tickets view and highlight the new ticket
      setNewTicketId(createdTicket.id ?? null);
      setActiveTab("tickets");
      await fetchTickets();

      // Clear the highlight after 3 seconds
      setTimeout(() => setNewTicketId(null), 3000);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = form.watch("type") as FeedbackTypeValue;
  const selectedTypeConfig = FEEDBACK_TYPES.find(
    (t) => t.value === selectedType
  );
  const SelectedIcon = selectedTypeConfig?.icon ?? Bug;
  const selectedTypeColor = selectedTypeConfig?.color ?? "text-red-500";
  const selectedTypeBg = selectedTypeConfig?.bg ?? "bg-red-500/10";

  const descriptionPlaceholder = {
    bug: "Describe the bug and the steps to reproduce it...",
    feature: "Describe the feature you'd like to see...",
    question: "What would you like to know?",
    feedback: "Share your thoughts with us...",
  }[selectedType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] h-[550px] flex flex-col" showCloseButton={false}>
        <DialogDescription className="sr-only">
          Send feedback or view your support tickets
        </DialogDescription>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0"
        >
          {/* Header row: title left, toggle button right */}
          <div className="flex items-center justify-between gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SelectedIcon className={`h-5 w-5 ${selectedTypeColor}`} />
                {activeTab === "new" ? "Send Feedback" : "My Tickets"}
              </DialogTitle>
            </DialogHeader>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setActiveTab((prev) =>
                  prev === "new" ? "tickets" : "new"
                )
              }
              className="shrink-0 flex items-center gap-1.5"
            >
              {activeTab === "new" ? (
                <>
                  <Inbox className="h-3.5 w-3.5" />
                  My Tickets
                </>
              ) : (
                <>
                  <MessageSquare className="h-3.5 w-3.5" />
                  New Ticket
                </>
              )}
            </Button>
          </div>

          {/* ---- New Ticket Tab ---- */}
          <TabsContent value="new" className="mt-4 flex-1 min-h-0">
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left column — inputs */}
                <div className="flex flex-col gap-4">
                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={form.watch("type")}
                      onValueChange={(value) =>
                        form.setValue(
                          "type",
                          value as FeedbackFormValues["type"],
                          { shouldValidate: true }
                        )
                      }
                    >
                      <SelectTrigger
                        id="type"
                        className={`w-full transition-colors ${selectedTypeColor} ${selectedTypeBg} [&_svg:not([class*='text-'])]:text-current`}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_TYPES.map(
                          ({ value, label, icon: Icon, color }) => (
                            <SelectItem key={value} value={value}>
                              <span
                                className={`flex items-center gap-2 ${color}`}
                              >
                                <Icon className="h-4 w-4" />
                                {label}
                              </span>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Page Path (disabled) */}
                  <div className="space-y-2">
                    <Label htmlFor="pagePath">Page</Label>
                    <Input
                      id="pagePath"
                      value={form.watch("pagePath")}
                      disabled
                      className="text-muted-foreground"
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col flex-1 min-h-0 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder={descriptionPlaceholder}
                      className="flex-1 resize-none"
                      {...form.register("description")}
                    />
                    {form.formState.errors.description && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right column — screenshot */}
                <div className="flex flex-col gap-2">
                  <Label>Screenshot</Label>
                  {screenshotPreviewUrl ? (
                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                      <div
                        className="relative group rounded-md border overflow-hidden cursor-pointer"
                        onClick={() => setShowScreenshotPreview(true)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic runtime src (user upload / storage / object URL); next/image not applicable */}
                        <img
                          src={screenshotPreviewUrl}
                          alt="Screenshot preview"
                          className="w-full max-h-48 object-contain object-top"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-sm font-medium">
                            <Eye className="h-4 w-4" />
                            Click to view
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleReplaceScreenshot}
                          className="flex-1 h-8 text-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleRemoveScreenshot}
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReplaceScreenshot}
                      className="w-full flex-1 min-h-32 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground hover:border-primary/50 hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">
                        Click to add a screenshot
                      </span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* ---- My Tickets Tab ---- */}
          <TabsContent value="tickets" className="mt-4 flex-1 min-h-0">
            {isLoadingTickets ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : ticketsError ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <p className="text-sm">{ticketsError}</p>
                <Button variant="outline" size="sm" onClick={fetchTickets}>
                  Retry
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Inbox className="h-10 w-10" />
                <p className="text-sm font-medium">No tickets yet</p>
                <p className="text-xs">
                  Submit your first ticket using the &quot;New Ticket&quot; tab.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-3">
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const typeBadge = TYPE_BADGE_MAP[ticket.type] ?? {
                      label: ticket.type,
                      className: "bg-muted text-muted-foreground",
                    };
                    const statusBadge = STATUS_BADGE_MAP[ticket.status] ?? {
                      label: ticket.status,
                      className: "bg-muted text-muted-foreground",
                    };
                    const typeColor = TYPE_COLOR_MAP[ticket.type] ?? "";

                    const TypeIcon =
                      FEEDBACK_TYPES.find((t) => t.value === ticket.type)
                        ?.icon ?? MessageSquare;

                    const isNew = ticket.id === newTicketId;
                    const notes = Array.isArray(ticket.adminNotes) ? ticket.adminNotes : [];
                    const unreadNotes = notes.filter((n) => !n.readByUser);
                    const hasUnread = unreadNotes.length > 0;
                    const isExpanded = expandedTicketId === ticket.id;

                    return (
                      <div
                        key={ticket.id}
                        className={`rounded-lg border transition-colors ${isNew ? "animate-pulse border-primary/50 bg-primary/5" : ""} ${hasUnread ? "border-blue-300 dark:border-blue-700" : ""}`}
                      >
                        <div className="flex gap-3 p-3 hover:bg-muted/50 transition-colors">
                          {/* Screenshot thumbnail */}
                          {ticket.screenshotUrl ? (
                            <div className="shrink-0 w-20 h-14 rounded-md border overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic runtime src (user upload / storage / object URL); next/image not applicable */}
                              <img
                                src={ticket.screenshotUrl}
                                alt="Ticket screenshot"
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                          ) : (
                            <div className="shrink-0 w-20 h-14 rounded-md border bg-muted flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}

                          {/* Ticket details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <TypeIcon
                                  className={`h-4 w-4 shrink-0 ${typeColor}`}
                                />
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${typeBadge.className}`}
                                >
                                  {typeBadge.label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${statusBadge.className}`}
                                >
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeAgo(ticket.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-1">
                              {ticket.description}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground truncate">
                                {ticket.pagePath}
                              </p>
                              {notes.length > 0 && (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  onClick={() =>
                                    handleToggleExpand(ticket.id, hasUnread)
                                  }
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  <span>
                                    {notes.length}{" "}
                                    {notes.length === 1 ? "note" : "notes"}
                                  </span>
                                  {hasUnread && (
                                    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white">
                                      {unreadNotes.length}
                                    </span>
                                  )}
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded notes section */}
                        {isExpanded && notes.length > 0 && (
                          <div className="border-t bg-muted/20 px-3 py-2 space-y-2">
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                className={`rounded-md border p-2 text-xs space-y-1 ${
                                  !note.readByUser
                                    ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
                                    : "bg-background"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {note.authorName}
                                    {!note.readByUser && (
                                      <Badge
                                        variant="outline"
                                        className="ml-1.5 text-[9px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                                      >
                                        New
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {timeAgo(note.createdAt)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap">{note.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Nested screenshot preview dialog */}
      <Dialog open={showScreenshotPreview} onOpenChange={setShowScreenshotPreview}>
        <DialogContent
          className="w-[75vw] sm:max-w-[75vw] h-fit max-h-[90vh] p-3 gap-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          <DialogDescription className="sr-only">
            Full size screenshot preview
          </DialogDescription>
          {screenshotPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic runtime src (user upload / storage / object URL); next/image not applicable
            <img
              src={screenshotPreviewUrl}
              alt="Screenshot full preview"
              className="w-full max-h-[calc(90vh-1.5rem)] object-contain rounded-sm cursor-pointer"
              onClick={() => setShowScreenshotPreview(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
