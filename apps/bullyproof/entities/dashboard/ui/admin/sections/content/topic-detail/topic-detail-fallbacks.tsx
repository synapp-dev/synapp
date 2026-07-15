"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";

// Error state shown when the topic failed to load
export function TopicDetailError({
  error,
  onBack,
}: {
  error: string;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Stage
      </Button>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p className="font-medium">Error loading topic</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Not-found state shown when no topic was resolved
export function TopicDetailNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Stage
      </Button>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">Topic not found</p>
            <p className="text-sm mt-2">
              The topic you're looking for doesn't exist.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
