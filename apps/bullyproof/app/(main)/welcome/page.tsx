"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { isVideoUrl, getVideoEmbedUrl } from "@/utils/video";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { useCompleteTutorial } from "@/entities/me/api/completeTutorial";
import { useMeStore } from "@/entities/me/model/store";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ChevronsRight } from "lucide-react";

type Step = "intro" | "video";

export default function WelcomePage() {
  usePageTitle(["welcome"]);
  const router = useRouter();
  const currentUser = useMeStore((s) => s.currentUser);
  const completeTutorial = useCompleteTutorial();
  const [currentStep, setCurrentStep] = useState<Step>("intro");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [videoInteracted, setVideoInteracted] = useState(false);

  // Check if tutorial is already completed and redirect
  useEffect(() => {
    if (currentUser?.metadata) {
      const metadata = currentUser.metadata as any;
      if (metadata?.tutorials?.welcome?.completed === true) {
        router.push("/dashboard");
      }
    }
  }, [currentUser, router]);

  // Video URL - you can change this to any YouTube URL or video URL
  const videoUrl = "https://youtu.be/Y3SiLdBRGgQ";

  const videoEmbedUrl = useMemo(() => {
    if (!videoUrl) return null;
    if (isVideoUrl(videoUrl)) {
      return getVideoEmbedUrl(videoUrl);
    }
    return null;
  }, [videoUrl]);

  const handleNext = () => {
    setIsTransitioning(true);
    // Wait for fade out animation
    setTimeout(() => {
      setCurrentStep("video");
      setIsTransitioning(false);
    }, 300);
  };

  const handleVideoInteraction = () => {
    setVideoInteracted(true);
  };

  const handleGetStarted = async () => {
    try {
      await completeTutorial.mutateAsync("welcome");
      // Redirect to dashboard after successful completion
      // The TutorialGuard will ensure we don't get redirected back if the store updates first
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing tutorial:", error);
      // Still redirect even if there's an error
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Intro Step */}
        {currentStep === "intro" && (
          <div
            className={cn(
              "transition-opacity duration-300",
              isTransitioning && "opacity-0"
            )}
          >
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Step 1: Large Header */}
              <StaggeredAnimation index={0} baseDelay={0} incrementDelay={0}>
                <h1 className="text-4xl md:text-6xl font-bold">
                  Welcome to Bullyproof
                </h1>
              </StaggeredAnimation>

              {/* Step 2: Login Image (appears after 1 second) */}
              <StaggeredAnimation
                index={1}
                baseDelay={1}
                incrementDelay={0}
                fadeDirection="up"
              >
                <Image
                  src="/images/login-image-bare.svg"
                  alt="Bullyproof Logo"
                  width={400}
                  height={400}
                  className="mt-4"
                />
              </StaggeredAnimation>

              {/* Step 3: Welcome Paragraph (appears after 1 second) */}
              <StaggeredAnimation
                index={2}
                baseDelay={1}
                incrementDelay={0}
                fadeDirection="up"
              >
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mt-6">
                  We're glad you're here. We're excited to share this journey
                  with you.
                </p>
              </StaggeredAnimation>

              {/* Step 4: Next Button (appears after 1 more second = 2 seconds total) */}
              <StaggeredAnimation
                index={3}
                baseDelay={2}
                incrementDelay={0}
                fadeDirection="up"
              >
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="mt-8"
                  disabled={isTransitioning}
                >
                  Next
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </StaggeredAnimation>
            </div>
          </div>
        )}

        {/* Video Step */}
        {currentStep === "video" && (
          <div
            className={cn(
              "transition-opacity duration-300",
              isTransitioning && "opacity-0"
            )}
          >
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Video Section */}
              <div className="w-full">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                  Watch our welcome video
                </h2>
                <div
                  className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted shadow-lg"
                  onClick={handleVideoInteraction}
                  onMouseEnter={handleVideoInteraction}
                >
                  {videoEmbedUrl ? (
                    <iframe
                      src={videoEmbedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Welcome video"
                      onLoad={handleVideoInteraction}
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full"
                      onPlay={handleVideoInteraction}
                      onClick={handleVideoInteraction}
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </div>

              {/* Get Started Button (appears after video interaction) */}
              {videoInteracted && (
                <div className="animate-slide-up-fade-in">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    disabled={completeTutorial.isPending}
                  >
                    {completeTutorial.isPending
                      ? "Getting Started..."
                      : "Get Started"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
