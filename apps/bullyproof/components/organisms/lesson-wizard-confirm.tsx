"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { FileText, Play, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Image from "next/image";
import type { ClassOption, TopicOption } from "@/types/lesson-wizard";
import { compareSlidesByPosition } from "@/lib/fractional-position";
import { topicsApi } from "@/entities/topics/api/endpoints";
import { toStorageUrl } from "@/utils/supabase/storage-url";
import { useMeStore } from "@/entities/me/model/store";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import { useUsers } from "@/entities/users/model/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface LessonWizardConfirmProps {
  selectedClasses: ClassOption[];
  selectedTopic: TopicOption | null;
  schoolId?: string | null;
  schoolSlug?: string | null;
  onBehalfOfUserId?: string | null;
  onOnBehalfOfUserIdChange?: (userId: string | null) => void;
  isAdminRestricted?: boolean;
  onPrepareLesson?: () => Promise<void>;
  onStartLesson?: () => Promise<void>;
  isLoading?: boolean;
}

type TopicWithSlides = {
  id: string;
  title: string;
  stageId?: string;
  stageOrder?: number | null;
  stageSortIndex?: number;
  stageName?: string;
  stage?: {
    name?: string;
    code?: string;
  };
  slides?: Array<{
    id: string;
    kind: string;
    position: string;
    signedUrl?: string | null;
  }>;
  slideCount?: number;
};

function TopicThumbnail({ topic, horizontal = false }: { topic: TopicWithSlides; horizontal?: boolean }) {
  const [hasError, setHasError] = useState(false);

  // Get first image slide
  const imageSlides = useMemo(() => {
    if (!topic.slides) return [];
    return topic.slides
      .filter((slide) => slide.kind === "image")
      .sort(compareSlidesByPosition);
  }, [topic.slides]);

  const firstImageSlide = imageSlides[0];

  // Use signedUrl from API response (DB-cached)
  const imageUrl = firstImageSlide?.signedUrl || null;

  if (hasError || !imageUrl) {
    return (
      <div className={`${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center`}>
        <Image
          src="/images/bp-small-logo.svg"
          alt="Bullyproof Logo"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${horizontal ? 'h-full w-auto flex-shrink-0 aspect-video' : 'w-full aspect-video'} ${horizontal ? 'rounded-l-md' : 'rounded-t-md'} overflow-hidden bg-muted`}>
      <Image
        src={toStorageUrl(imageUrl) ?? imageUrl}
        alt={topic.title}
        fill
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function LessonWizardConfirm({
  selectedClasses,
  selectedTopic,
  schoolId,
  onBehalfOfUserId,
  onOnBehalfOfUserIdChange,
  isAdminRestricted,
  onPrepareLesson,
  onStartLesson,
  isLoading = false,
}: LessonWizardConfirmProps) {
  const currentUser = useMeStore((s) => s.currentUser);

  const { users, isLoading: isLoadingUsers } = useUsers({
    schoolId: schoolId ?? undefined,
    limit: 100, // API limit is 1-100
    offset: 0,
    enabled: Boolean(isAdminRestricted && schoolId),
  });

  const schoolUsersExcludingSelf = useMemo(() => {
    if (!currentUser?.id) return users;
    return users.filter((u) => u.id !== currentUser.id);
  }, [users, currentUser?.id]);

  const selectedOnBehalfUser = useMemo(() => {
    if (!onBehalfOfUserId) return null;
    return schoolUsersExcludingSelf.find((u) => u.id === onBehalfOfUserId);
  }, [schoolUsersExcludingSelf, onBehalfOfUserId]);

  // Fetch topic with slides
  const { data: topicData } = useQuery({
    queryKey: ["topic", selectedTopic?.id, "with-slides"],
    queryFn: async () => {
      if (!selectedTopic?.id) return null;
      const result = await topicsApi.get.byId(selectedTopic.id, {
        includeSlides: true,
        includeUrls: true,
      });
      if (result.error) {
        console.error("Failed to fetch topic:", result.error);
        return null;
      }
      return result.data as TopicWithSlides | null;
    },
    enabled: !!selectedTopic?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stage data with years to get all year codes for the stage
  const { data: stageData } = useQuery({
    queryKey: ["stage", topicData?.stageId, "with-years"],
    queryFn: async () => {
      const stageId = topicData?.stageId;
      if (!stageId) return null;
      
      const result = await curriculumApi.stages.byId(stageId);
      
      if (result.error) {
        console.error("Failed to fetch stage:", result.error);
        return null;
      }
      
      return result.data;
    },
    enabled: !!topicData?.stageId,
    staleTime: 5 * 60 * 1000,
  });

  // Get teacher name: when admin creates on behalf, show selected user; otherwise current user
  const teacherName =
    selectedOnBehalfUser
      ? [selectedOnBehalfUser.firstName, selectedOnBehalfUser.lastName].filter(Boolean).join(" ") ||
        selectedOnBehalfUser.email ||
        "Unknown Teacher"
      : [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || "Unknown Teacher";

  // Get stage name
  const stageName = topicData?.stageName || selectedTopic?.stageName || stageData?.name;

  if (!selectedTopic) {
    return null;
  }

  const canCreate = !isAdminRestricted || !!onBehalfOfUserId;
  const isDisabled = !canCreate || isLoading;

  if (!topicData) {
    return (
      <div className="flex flex-col gap-6 items-center">
        {/* Lesson-style card (skeleton) */}
        <Card className="w-2/3 min-w-[240px] transition-all overflow-hidden p-0 gap-0 flex flex-col relative shadow-none bg-primary/5 border border-primary/30 border-dashed">
          <CardHeader className="py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row justify-between items-center border-primary/30 border-dashed">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              New
            </span>
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="p-0 flex-1 flex items-center justify-center bg-card/80 border-x border-primary/30 border-dashed relative z-[1]">
            <Skeleton className="w-full aspect-video rounded-none" />
          </CardContent>
          <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start border-primary/30 border-dashed">
            <Skeleton className="h-3 w-24" />
            <div className="flex items-center gap-2 min-w-0">
              <Skeleton className="h-5 w-8 rounded-sm" />
              <Skeleton className="h-5 flex-1 max-w-[200px]" />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedClasses.slice(0, 3).map((cls) => (
                <Skeleton key={cls.id} className="h-5 w-16 rounded-md" />
              ))}
            </div>
          </CardFooter>
        </Card>

        {/* Admin on-behalf-of block (loading state) */}
        {isAdminRestricted && schoolId && (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p>
                  You are logged into an admin account and cannot create lessons in your own name.
                  Would you like to create a lesson on behalf of a user?
                </p>
                <Select
                  value={onBehalfOfUserId ?? ""}
                  onValueChange={(v) => onOnBehalfOfUserIdChange?.(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingUsers
                          ? "Loading users..."
                          : schoolUsersExcludingSelf.length === 0
                            ? "No users available at this school"
                            : "Select a user"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolUsersExcludingSelf.map((u) => {
                      const displayName =
                        [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id;
                      return (
                        <SelectItem key={u.id} value={u.id}>
                          {displayName} {u.email ? `(${u.email})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      {/* Lesson-style card matching LessonCard layout */}
      <Card className="w-2/3 min-w-[240px] transition-all overflow-hidden p-0 gap-0 flex flex-col relative shadow-none bg-primary/5 border border-primary/30 border-dashed">
        <CardHeader className="py-3 px-4 bg-card/80 border border-b-0 rounded-t-lg flex flex-row justify-between items-center border-primary/30 border-dashed">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            New
          </span>
          <span className="text-xs text-muted-foreground">{teacherName}</span>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex items-center justify-center bg-card/80 border-x border-primary/30 border-dashed relative z-[1]">
          <TopicThumbnail topic={topicData as TopicWithSlides} horizontal={false} />
        </CardContent>
        <CardFooter className="flex flex-col p-4 pt-3 gap-2 bg-card/80 border border-t-0 rounded-b-lg items-start border-primary/30 border-dashed">
          {stageName && (
            <p className="text-xs font-medium text-muted-foreground">{stageName}</p>
          )}
          <div className="flex items-center gap-2 min-w-0">
            {topicData.stageOrder !== null && topicData.stageOrder !== undefined && (
              <Badge
                variant="secondary"
                className="text-xs text-muted-foreground font-bold border-0 py-0 px-1.5 h-5 rounded-sm flex-shrink-0"
              >
                L{topicData.stageOrder}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="text-base font-semibold text-primary capitalize line-clamp-2 flex-1 cursor-default text-left">
                  {selectedTopic.title}
                </CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedTopic.title}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {selectedClasses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedClasses.map((cls) => (
                <Badge
                  key={cls.id}
                  variant="outline"
                  className="text-xs py-0 px-1.5 h-5"
                >
                  {cls.name}
                </Badge>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 w-2/3 min-w-[240px]">
        <Button
          variant="outline"
          onClick={() => onPrepareLesson?.()}
          disabled={isDisabled}
          className="w-full gap-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Prepare for this lesson
            </>
          )}
        </Button>
        <Button
          onClick={() => onStartLesson?.()}
          disabled={isDisabled}
          className="w-full bg-[var(--brand-bullyproof-primary)] text-white hover:bg-[var(--brand-bullyproof-primary)]/90 gap-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start lesson
            </>
          )}
        </Button>
      </div>

      {/* Admin on-behalf-of block */}
      {isAdminRestricted && schoolId && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p>
                You are logged into an admin account and cannot create lessons in your own name. Would
                you like to create a lesson on behalf of a user?
              </p>
              <Select
                value={onBehalfOfUserId ?? ""}
                onValueChange={(v) => onOnBehalfOfUserIdChange?.(v || null)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoadingUsers
                        ? "Loading users..."
                        : schoolUsersExcludingSelf.length === 0
                          ? "No users available at this school"
                          : "Select a user"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {schoolUsersExcludingSelf.map((u) => {
                    const displayName =
                      [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id;
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        {displayName} {u.email ? `(${u.email})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

