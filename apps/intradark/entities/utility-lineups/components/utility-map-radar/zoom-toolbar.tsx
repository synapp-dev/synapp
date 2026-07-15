"use client";

import * as React from "react";
import { type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";

import { Button } from "@workspace/ui/components/button";

/** Zoom / reset — driven by `TransformWrapper` ref (toolbar sits beside filters, outside the wrapper). */
export function UtilityMapZoomToolbar({
  transformRef,
}: {
  transformRef: React.RefObject<ReactZoomPanPinchContentRef | null>;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-8 px-2"
        onClick={() => transformRef.current?.zoomIn(0.15, 200)}
        aria-label="Zoom in"
      >
        +
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-8 px-2"
        onClick={() => transformRef.current?.zoomOut(0.15, 200)}
        aria-label="Zoom out"
      >
        −
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => transformRef.current?.resetTransform(200)}
        aria-label="Reset pan and zoom"
      >
        Reset
      </Button>
    </div>
  );
}
