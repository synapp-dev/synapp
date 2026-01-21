import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { Lock } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const LockedCard = ({ 
  label, 
  className,
  skeletonVariant = 1
}: { 
  label: string; 
  className?: string;
  skeletonVariant?: number;
}) => {
  // Different skeleton patterns for each card - Kanban style
  const renderSkeleton = () => {
    switch (skeletonVariant) {
      case 1: // My classes - 1 column Kanban
        return (
          <div className="opacity-30 blur-[0.5px] h-full flex gap-1 group-hover:blur-[1px] transition-all duration-300">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
          </div>
        );
      case 2: // My lessons - 2 column Kanban
        return (
          <div className="opacity-30 blur-[0.5px] h-full flex gap-1 group-hover:blur-[1px] transition-all duration-300">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
            {/* Column 2 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
          </div>
        );
      case 3: // Recent activity - 3 column Kanban
        return (
          <div className="opacity-30 blur-[0.5px] h-full flex gap-1 group-hover:blur-[1px] transition-all duration-300">
            {/* Column 1 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
            {/* Column 2 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
            {/* Column 3 */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
              <div className="flex-1 border-2 border-dashed border-white/10 rounded-md bg-muted min-h-[20px]" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn("group relative h-full max-h-[500px] cursor-not-allowed border-dashed bg-gradient-to-b from-muted to-transparent", className)}>
          <div className="absolute top-4 left-4 text-xs font-medium text-muted-foreground/60 z-10 uppercase blur-[0.5px]">
            {label}
          </div>
          {/* Top right lock icon - disappears on hover */}
          <div className="absolute top-4 right-4 z-20 group-hover:opacity-0 transition-opacity duration-300">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          {/* Center lock icon - appears on hover */}
          <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Lock className="h-24 w-24 text-muted-foreground transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300" />
          </div>
          <CardContent className="pt-12 pb-2 px-2 relative h-full">
            {renderSkeleton()}
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>Locked until term start</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const TeacherOverviewSection = () => {
  return (
    <div className="grid grid-cols-10 gap-4 h-full max-h-[500px]"> 
      <LockedCard label="My classes" className="col-span-2" skeletonVariant={1} />
      <LockedCard label="My lessons" className="col-span-3" skeletonVariant={2} />
      <LockedCard label="Recent activity" className="col-span-5" skeletonVariant={3} />
    </div>
  );
};