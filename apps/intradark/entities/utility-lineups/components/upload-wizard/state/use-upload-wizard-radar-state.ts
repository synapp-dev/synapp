"use client";

import * as React from "react";

import {
  mapDisplayRadarNormToStored,
  mapStoredRadarNormToDisplay,
  type RadarNormMapping,
} from "@/entities/utility-lineups/lib/radar-display-mapping";
import {
  clientPointToDisplayNormInObjectContain,
  displayNormToOverlayPercent,
  displayNormToSvgPercent,
} from "@/entities/utility-lineups/lib/radar-object-contain-layout";
import { useRadarImgLayout } from "@/entities/utility-lineups/lib/use-radar-img-layout";

export function useUploadWizardRadarState({
  mapping,
  selectedMapSlug,
}: {
  mapping: RadarNormMapping;
  selectedMapSlug: string | null;
}) {
  const dialogRadarImgRef = React.useRef<HTMLImageElement | null>(null);
  const { layout: dialogRadarLayout, recompute: recomputeDialogRadarLayout } =
    useRadarImgLayout(dialogRadarImgRef);

  const [radarDialogKind, setRadarDialogKind] = React.useState<
    "throw" | "land" | null
  >(null);
  const [pendingRadarNorm, setPendingRadarNorm] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [throwSpotNamingOpen, setThrowSpotNamingOpen] = React.useState(false);
  const [throwSpotLabelDraft, setThrowSpotLabelDraft] = React.useState("");
  const [landSpotNamingOpen, setLandSpotNamingOpen] = React.useState(false);
  const [landSpotLabelDraft, setLandSpotLabelDraft] = React.useState("");
  const [throwNorm, setThrowNorm] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [landNorm, setLandNorm] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [throwLabel, setThrowLabel] = React.useState("");
  const [landLabel, setLandLabel] = React.useState("");

  React.useEffect(() => {
    setThrowNorm(null);
    setLandNorm(null);
  }, [selectedMapSlug]);

  const openThrowRadarForPick = React.useCallback(() => {
    if (throwNorm !== null) {
      setThrowNorm(null);
      setThrowLabel("");
    }
    setPendingRadarNorm(null);
    setThrowSpotNamingOpen(false);
    setThrowSpotLabelDraft("");
    setRadarDialogKind("throw");
  }, [throwNorm]);

  const openLandRadarForPick = React.useCallback(() => {
    if (landNorm !== null) {
      setLandNorm(null);
      setLandLabel("");
    }
    setPendingRadarNorm(null);
    setLandSpotNamingOpen(false);
    setLandSpotLabelDraft("");
    setRadarDialogKind("land");
  }, [landNorm]);

  const onDialogRadarClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const img = dialogRadarImgRef.current;
      let dx: number;
      let dy: number;
      if (img?.naturalWidth) {
        const pt = clientPointToDisplayNormInObjectContain(
          img,
          e.clientX,
          e.clientY,
        );
        if (!pt) return;
        dx = pt.x;
        dy = pt.y;
      } else {
        const rect = (
          e.currentTarget as HTMLDivElement
        ).getBoundingClientRect();
        dx = (e.clientX - rect.left) / rect.width;
        dy = (e.clientY - rect.top) / rect.height;
      }
      setPendingRadarNorm(mapDisplayRadarNormToStored(dx, dy, mapping));
    },
    [mapping],
  );

  const dialogPinOverlayStyle = React.useMemo((): React.CSSProperties | null => {
    if (!pendingRadarNorm) return null;
    const disp = mapStoredRadarNormToDisplay(
      pendingRadarNorm.x,
      pendingRadarNorm.y,
      mapping,
    );
    if (!dialogRadarLayout) {
      return {
        left: `${disp.x * 100}%`,
        top: `${disp.y * 100}%`,
      };
    }
    const { leftPct, topPct } = displayNormToOverlayPercent(
      dialogRadarLayout,
      disp.x,
      disp.y,
    );
    return { left: `${leftPct}%`, top: `${topPct}%` };
  }, [pendingRadarNorm, dialogRadarLayout, mapping]);

  const landRadarOverlaySvgPoint = React.useCallback(
    (storedNx: number, storedNy: number) => {
      const d = mapStoredRadarNormToDisplay(storedNx, storedNy, mapping);
      if (!dialogRadarLayout) {
        return { x: d.x * 100, y: d.y * 100 };
      }
      return displayNormToSvgPercent(dialogRadarLayout, d.x, d.y);
    },
    [mapping, dialogRadarLayout],
  );

  const landRadarThrowPinStyle = React.useMemo((): React.CSSProperties | null => {
    if (!throwNorm) return null;
    const disp = mapStoredRadarNormToDisplay(
      throwNorm.x,
      throwNorm.y,
      mapping,
    );
    if (!dialogRadarLayout) {
      return {
        left: `${disp.x * 100}%`,
        top: `${disp.y * 100}%`,
      };
    }
    const { leftPct, topPct } = displayNormToOverlayPercent(
      dialogRadarLayout,
      disp.x,
      disp.y,
    );
    return { left: `${leftPct}%`, top: `${topPct}%` };
  }, [throwNorm, mapping, dialogRadarLayout]);

  const throwRadarPositionComplete =
    throwNorm !== null && throwLabel.trim() !== "";

  const landRadarPositionComplete =
    landNorm !== null && landLabel.trim() !== "";

  const handleRadarDialogOk = React.useCallback(() => {
    if (!pendingRadarNorm || !radarDialogKind) return;
    if (radarDialogKind === "throw") {
      setThrowSpotLabelDraft("");
      setThrowSpotNamingOpen(true);
      return;
    }
    if (radarDialogKind === "land") {
      setLandSpotLabelDraft("");
      setLandSpotNamingOpen(true);
      return;
    }
  }, [pendingRadarNorm, radarDialogKind]);

  const handleThrowSpotNamingConfirm = React.useCallback(() => {
    const label = throwSpotLabelDraft.trim();
    if (!label || !pendingRadarNorm) return;
    setThrowNorm(pendingRadarNorm);
    setThrowLabel(label);
    setThrowSpotNamingOpen(false);
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
  }, [throwSpotLabelDraft, pendingRadarNorm]);

  const handleLandSpotNamingConfirm = React.useCallback(() => {
    const label = landSpotLabelDraft.trim();
    if (!label || !pendingRadarNorm) return;
    setLandNorm(pendingRadarNorm);
    setLandLabel(label);
    setLandSpotNamingOpen(false);
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
  }, [landSpotLabelDraft, pendingRadarNorm]);

  const closeRadarDialog = React.useCallback(() => {
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
    setThrowSpotNamingOpen(false);
    setLandSpotNamingOpen(false);
  }, []);

  const reset = React.useCallback(() => {
    setThrowNorm(null);
    setLandNorm(null);
    setThrowLabel("");
    setLandLabel("");
    setRadarDialogKind(null);
    setPendingRadarNorm(null);
    setThrowSpotNamingOpen(false);
    setThrowSpotLabelDraft("");
    setLandSpotNamingOpen(false);
    setLandSpotLabelDraft("");
  }, []);

  return {
    dialogRadarImgRef,
    recomputeDialogRadarLayout,
    radarDialogKind,
    pendingRadarNorm,
    throwSpotNamingOpen,
    setThrowSpotNamingOpen,
    throwSpotLabelDraft,
    setThrowSpotLabelDraft,
    landSpotNamingOpen,
    setLandSpotNamingOpen,
    landSpotLabelDraft,
    setLandSpotLabelDraft,
    throwNorm,
    landNorm,
    throwLabel,
    landLabel,
    openThrowRadarForPick,
    openLandRadarForPick,
    onDialogRadarClick,
    dialogPinOverlayStyle,
    landRadarOverlaySvgPoint,
    landRadarThrowPinStyle,
    throwRadarPositionComplete,
    landRadarPositionComplete,
    handleRadarDialogOk,
    handleThrowSpotNamingConfirm,
    handleLandSpotNamingConfirm,
    closeRadarDialog,
    reset,
  };
}
