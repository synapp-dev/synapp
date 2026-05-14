import * as React from "react";

import { getRadarImgObjectContainLayout, type RadarImgContainLayout } from "./radar-object-contain-layout";

/**
 * Recompute when the radar image resizes or loads so object-contain letterboxing stays aligned.
 */
export function useRadarImgLayout(imgRef: React.RefObject<HTMLImageElement | null>): {
  layout: RadarImgContainLayout | null;
  recompute: () => void;
} {
  const [layout, setLayout] = React.useState<RadarImgContainLayout | null>(null);

  const recompute = React.useCallback(() => {
    const el = imgRef.current;
    if (!el) {
      setLayout(null);
      return;
    }
    setLayout(getRadarImgObjectContainLayout(el));
  }, [imgRef]);

  React.useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    recompute();
    const ro = new ResizeObserver(() => {
      recompute();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [imgRef, recompute]);

  return { layout, recompute };
}
