import * as React from "react";

const MAX_CAPTURE_DIMENSION = 960;

function captureVideoFrameDataUrl(videoUrl: string, timeMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(url);
    };

    const draw = () => {
      if (settled) return;
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) {
          finish(null);
          return;
        }
        let tw = vw;
        let th = vh;
        if (vw > MAX_CAPTURE_DIMENSION) {
          tw = MAX_CAPTURE_DIMENSION;
          th = (vh * MAX_CAPTURE_DIMENSION) / vw;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(tw);
        canvas.height = Math.round(th);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.88));
      } catch {
        finish(null);
      }
    };

    video.onerror = () => finish(null);

    video.onloadedmetadata = () => {
      const dur = video.duration;
      const tSec = timeMs / 1000;
      const safeDur = Number.isFinite(dur) && dur > 0 ? dur : 0;
      const target =
        safeDur > 0 ? Math.min(Math.max(0, tSec), Math.max(0, safeDur - 1 / 60)) : Math.max(0, tSec);
      video.addEventListener("seeked", draw, { once: true });
      video.currentTime = target;
    };

    video.src = videoUrl;
  });
}

/**
 * Decodes `videoUrl`, seeks to `timeMs`, draws to canvas when CORS allows (same-origin / CORS-enabled CDN).
 * Returns `null` if capture fails (tainted canvas / decode error) — caller may fall back to a paused `<video>`.
 */
export function useUtilityLineupVideoStillFrame(
  videoUrl: string | null,
  timeMs: number,
): { dataUrl: string | null } {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!videoUrl) {
      setDataUrl(null);
      return;
    }
    setDataUrl(null);
    let cancelled = false;
    void captureVideoFrameDataUrl(videoUrl, timeMs).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
      setDataUrl(null);
    };
  }, [videoUrl, timeMs]);

  return { dataUrl };
}
