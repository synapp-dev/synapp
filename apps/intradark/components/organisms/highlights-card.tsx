"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
  Play,
  ExternalLink,
  Eye,
  Sparkles,
  ChevronsRight,
  Share2,
} from "lucide-react";
import {
  useLeetifyProfile,
  usePlayerStore,
} from "@/stores/players/player-store";
import Image from "next/image";

interface Highlight {
  url: string;
  thumbnailUrl?: string;
  description?: string;
}

export function HighlightsCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedHighlightIndex, setSelectedHighlightIndex] = useState(0);

  const searchParams = useSearchParams();
  const router = useRouter();

  const highlights = leetifyProfile?.highlights || [];
  const selectedHighlight = highlights[selectedHighlightIndex];

  // Handle URL parameters for highlights
  useEffect(() => {
    const showHighlights = searchParams.get("highlights");
    const highlightId = searchParams.get("highlightId");

    if (showHighlights === "true" && !leetifyLoading && highlights.length > 0) {
      // Open the dialog
      setIsDialogOpen(true);

      // Set the highlight index if provided
      if (highlightId) {
        const index = parseInt(highlightId);
        if (!isNaN(index) && index >= 0 && index < highlights.length) {
          setSelectedHighlightIndex(index);
        }
      }
    }
  }, [searchParams, leetifyLoading, highlights.length]);

  const handleHighlightClick = (index: number) => {
    setSelectedHighlightIndex(index);
    setIsDialogOpen(true);

    // Update URL with parameters
    const params = new URLSearchParams(searchParams.toString());
    params.set("highlights", "true");
    params.set("highlightId", index.toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleHighlightSelect = (index: number) => {
    setSelectedHighlightIndex(index);

    // Update URL with new highlight ID
    const params = new URLSearchParams(searchParams.toString());
    params.set("highlightId", index.toString());
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);

    // Remove highlights parameters from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("highlights");
    params.delete("highlightId");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Check if we should show highlights dialog based on URL params
  const shouldShowHighlights = searchParams.get("highlights") === "true";
  const highlightId = searchParams.get("highlightId");

  if (leetifyLoading) {
    return (
      <>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <h1 className="text-xs font-bold text-muted-foreground">
                Top Highlights
              </h1>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">
              Loading highlights...
            </p>
          </CardContent>
        </Card>

        {/* Show loading dialog if URL indicates highlights should be shown */}
        {shouldShowHighlights && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="w-full h-fit max-h-[60vh] min-w-5xl gap-0 p-0 border-none">
              <DialogTitle className="sr-only">Loading Highlights</DialogTitle>
              <Card className="h-full flex flex-col gap-4">
                <CardHeader className="h-fit">
                  <CardTitle className="flex items-center gap-2">
                    <Image
                      src="/images/logos/allstar-logo-light.svg"
                      alt="Highlights"
                      width={100}
                      height={100}
                    />
                    <ChevronsRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground">
                      Loading Highlights...
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                  <p className="text-sm text-muted-foreground">
                    Loading player highlights...
                  </p>
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  if (leetifyError) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <h1 className="text-xs font-bold text-muted-foreground">
              Top Highlights
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-xs text-muted-foreground">
            Error loading highlights
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!highlights || highlights.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <h1 className="text-xs font-bold text-muted-foreground">
              Top Highlights
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-xs text-muted-foreground">No highlights found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logos/allstar-logo-light.svg"
                alt="Highlights"
                width={75}
                height={50}
              />
              <div />
              {/* <Sparkles className="h-3 w-3 mr-2" /> */}
              <h1 className="text-xs font-bold text-muted-foreground">
                Top Highlights
              </h1>
            </div>

            <Badge variant="secondary" className="text-xs">
              {highlights.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {highlights.slice(0, 5).map((highlight, index) => (
              <div
                key={index}
                className="group relative cursor-pointer overflow-hidden rounded-lg border bg-muted/50 transition-all hover:bg-muted hover:scale-105 flex-shrink-0 w-48"
                onClick={() => handleHighlightClick(index)}
              >
                {highlight.thumbnailUrl ? (
                  <div className="aspect-video relative">
                    <Image
                      src={highlight.thumbnailUrl}
                      alt={highlight.description || `Highlight ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-2 backdrop-blur-sm">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <Play className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">
                    {highlight.description || `Highlight ${index + 1}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {highlights.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleHighlightClick(0)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View All Highlights ({highlights.length})
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-full h-fit max-h-[60vh] min-w-5xl gap-0 p-0 border-none">
          <DialogTitle className="sr-only">Highlights</DialogTitle>
          <Card className="h-full flex flex-col gap-4">
            <CardHeader className="h-fit">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/logos/allstar-logo-light.svg"
                    alt="Highlights"
                    width={100}
                    height={100}
                  />
                  <ChevronsRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-bold text-muted-foreground">
                    Top Highlights
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.set("highlights", "true");
                    currentUrl.searchParams.set(
                      "highlightId",
                      selectedHighlightIndex.toString()
                    );
                    navigator.clipboard.writeText(currentUrl.toString());
                  }}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 h-full">
                {/* Main Video Player */}
                <div className="aspect-video w-full">
                  {selectedHighlight && (
                    <div className="w-full h-full">
                      <iframe
                        src={selectedHighlight.url}
                        className="w-full h-full min-h-[400px] rounded-lg border"
                        allowFullScreen
                        title={selectedHighlight.description || "Highlight"}
                      />
                    </div>
                  )}
                </div>
                {/* Highlights List */}
                <div className="min-w-1/4 h-full flex flex-col gap-2 overflow-y-auto">
                  {highlights.map((highlight, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted ${
                        index === selectedHighlightIndex
                          ? "bg-muted border-primary"
                          : "bg-background"
                      }`}
                      onClick={() => handleHighlightSelect(index)}
                    >
                      {highlight.thumbnailUrl ? (
                        <div className="relative aspect-video w-20 flex-shrink-0">
                          <Image
                            src={highlight.thumbnailUrl}
                            alt={
                              highlight.description || `Highlight ${index + 1}`
                            }
                            fill
                            className="object-cover rounded"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Play className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <Play className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {highlight.description || `Highlight ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click to play
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
