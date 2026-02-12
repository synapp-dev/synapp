"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Info, CheckCircle2, User, AlertTriangle } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Image from "next/image";
import type { ClassOption, TopicOption } from "@/types/lesson-wizard";
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
  onBehalfOfUserId?: string | null;
  onOnBehalfOfUserIdChange?: (userId: string | null) => void;
  isAdminRestricted?: boolean;
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
    orderIndex: number;
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
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [topic.slides]);

  const firstImageSlide = imageSlides[0];
  const slideId = firstImageSlide?.id;

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
}: LessonWizardConfirmProps) {
  const currentUser = useMeStore((s) => s.currentUser);

  const { users, isLoading: isLoadingUsers } = useUsers({
    schoolId: schoolId ?? undefined,
    limit: 200,
    offset: 0,
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

  // Calculate slide count
  const slideCount = topicData?.slides?.length || topicData?.slideCount || 0;
  
  // Get stage name
  const stageName = topicData?.stageName || selectedTopic?.stageName || stageData?.name;

  if (!selectedTopic) {
    return null;
  }

  if (!topicData) {
    return (
      <div className="flex flex-col gap-6">
        {/* Confirm Selections Badge */}
        <Badge
          variant="outline"
          className="text-sm bg-green-500/20 text-green-700 border-green-500 flex items-center gap-1.5 font-semibold w-fit"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
          Confirm selections
        </Badge>

        {/* Lesson Section */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Lesson</label>
          <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
            {/* Skeleton Thumbnail */}
            <Skeleton className="h-full w-48 flex-shrink-0 rounded-l-md" />
            {/* Skeleton Content */}
            <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0 overflow-hidden">
              <div className="space-y-2 min-w-0 w-full">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" /> {/* Stage name */}
                  <Skeleton className="h-3 w-24" /> {/* Year codes */}
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-5 w-8 rounded-sm" /> {/* Badge */}
                  <Skeleton className="h-5 w-48" /> {/* Topic title */}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Skeleton className="h-5 w-20" /> {/* Slide count badge */}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Classes Section */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Classes</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedClasses.length === 0 ? (
              <span className="text-sm text-muted-foreground">No classes selected</span>
            ) : (
              <>
                {selectedClasses.slice(0, 5).map((cls) => (
                  <Badge
                    key={cls.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {cls.name}
                  </Badge>
                ))}
                {selectedClasses.length > 5 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="text-xs cursor-pointer"
                      >
                        +{selectedClasses.length - 5} more
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        {selectedClasses.slice(5).map((cls) => (
                          <span key={cls.id} className="text-sm">
                            {cls.name}
                          </span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        </div>

        {/* Teacher Section */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">Teacher</label>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {teacherName}
          </div>
        </div>

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
    <div className="flex flex-col gap-6">
      {/* Confirm Selections Badge */}
      <Badge
        variant="outline"
        className="text-sm bg-green-500/20 text-green-700 border-green-500 flex items-center gap-1.5 font-semibold w-fit"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
        Confirm selections
      </Badge>

      {/* Lesson Section */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">Lesson</label>
        <Card className="w-full transition-all overflow-hidden p-0 gap-0 flex flex-row h-32">
          {/* Thumbnail on the left */}
          <TopicThumbnail topic={topicData as TopicWithSlides} horizontal={true} />
          
          {/* Information on the right */}
          <div className="flex-1 flex flex-col justify-between p-4 pr-6 min-w-0 overflow-hidden">
            <div className="space-y-2 min-w-0 w-full">
              {stageName && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stageName}
                  </p>
                  {(() => {
                    // Get year codes from stage data, sorted by sortIndex
                    if (!stageData?.years || !Array.isArray(stageData.years)) return null;
                    
                    const sortedYears = [...stageData.years].sort((a: any, b: any) => {
                      const aIndex = a.sortIndex ?? 999999;
                      const bIndex = b.sortIndex ?? 999999;
                      return aIndex - bIndex;
                    });
                    
                    const yearCodes = sortedYears
                      .map((year: any) => year.code)
                      .filter((code: string) => code);
                    
                    return yearCodes.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {yearCodes.map((code: string, index: number) => (
                          <span key={code} className="flex items-center gap-1">
                            {index > 0 && <span className="opacity-25">•</span>}
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              <div className="flex items-center gap-1 min-w-0 w-full overflow-hidden">
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
                    <h3 className="text-lg font-semibold text-primary capitalize truncate block min-w-0 flex-1 max-w-full cursor-default">
                      {selectedTopic.title}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{selectedTopic.title}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-4">
                <Badge
                  variant="outline"
                  className="text-xs py-0 px-1.5 h-5"
                >
                  {slideCount} {slideCount === 1 ? "slide" : "slides"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Classes Section */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">Classes</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedClasses.length === 0 ? (
            <span className="text-sm text-muted-foreground">No classes selected</span>
          ) : (
            <>
              {selectedClasses.slice(0, 5).map((cls) => (
                <Badge
                  key={cls.id}
                  variant="secondary"
                  className="text-xs"
                >
                  {cls.name}
                </Badge>
              ))}
              {selectedClasses.length > 5 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="text-xs cursor-pointer"
                    >
                      +{selectedClasses.length - 5} more
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-1">
                      {selectedClasses.slice(5).map((cls) => (
                        <span key={cls.id} className="text-sm">
                          {cls.name}
                        </span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      {/* Teacher Section */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground">Teacher</label>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          {teacherName}
        </div>
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
      
      <Separator />
      
      <Alert className="border-0">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p>
            Double check you've selected the right classes and you're happy with the lesson selected. If you are, click create lesson to go to the lesson page.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

