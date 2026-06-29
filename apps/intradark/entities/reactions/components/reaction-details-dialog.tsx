"use client";

import { formatDistanceToNow } from "date-fns";
import { SmilePlus } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

import { REACTION_EMOJI, REACTION_TYPES } from "../lib/constants";
import { authorName, type ReactionView } from "../lib/types";
import { UserHoverCard } from "./user-hover-card";

function relative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function avatarInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

type ReactionDetailsDialogProps = {
  reactions: ReactionView[];
  trigger: React.ReactNode;
  title?: string;
};

/**
 * "Who reacted" dialog, ported from Landmark: a tab per active emoji, each
 * listing the reactors with their avatar, name (hovercard) and time.
 */
export function ReactionDetailsDialog({
  reactions,
  trigger,
  title = "Reactions",
}: ReactionDetailsDialogProps) {
  const byType = REACTION_TYPES.map((type) => ({
    type,
    emoji: REACTION_EMOJI[type],
    items: reactions.filter((r) => r.reactType === type),
  })).filter((group) => group.items.length > 0);

  const defaultTab = byType[0]?.type;
  if (!defaultTab) return <>{trigger}</>;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-muted-foreground">
            <SmilePlus className="size-4" />
            {reactions.length} {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            People who reacted, grouped by reaction.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start bg-muted/20">
            {byType.map((group) => (
              <TabsTrigger key={group.type} value={group.type} className="gap-1">
                <span>{group.emoji}</span>
                <span>{group.items.length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {byType.map((group) => (
            <TabsContent
              key={group.type}
              value={group.type}
              className="animate-slide-down-fade-in mt-4"
            >
              <ScrollArea className="h-[300px] pr-4">
                <div className="flex flex-col gap-4">
                  {group.items.map((reaction) => {
                    const name = authorName(reaction.author);
                    return (
                      <div
                        key={`${reaction.userId}-${reaction.reactType}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <UserHoverCard author={reaction.author}>
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="size-8 shrink-0">
                              <AvatarImage
                                src={reaction.author.avatarUrl ?? undefined}
                                alt={name}
                              />
                              <AvatarFallback>
                                {avatarInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="animated-underline-1 truncate text-sm font-medium">
                              {name}
                            </span>
                          </div>
                        </UserHoverCard>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {relative(reaction.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
