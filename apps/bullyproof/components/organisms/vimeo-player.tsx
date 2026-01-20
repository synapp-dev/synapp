"use client";

import { convertToVimeoEmbedUrl, isVimeoUrl } from "@/utils/video";

interface VimeoPlayerProps {
  videoUrl: string;
  startTime?: number | null;
  endTime?: number | null;
  className?: string;
}

export function VimeoPlayer({
  videoUrl,
  startTime,
  endTime,
  className = "",
}: VimeoPlayerProps) {
  if (!isVimeoUrl(videoUrl)) {
    return (
      <div className={`flex items-center justify-center h-full w-full ${className}`}>
        <div className="text-destructive text-sm">Invalid Vimeo URL</div>
      </div>
    );
  }

  const embedUrl = convertToVimeoEmbedUrl(videoUrl, startTime, endTime);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Vimeo video"
      />
    </div>
  );
}
