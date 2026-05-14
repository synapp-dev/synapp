/**
 * Map 0–1 **display** radar coordinates (same space as `mapStoredRadarNormToDisplay`) onto the
 * painted bitmap when the `<img>` uses `object-fit: contain` — letterboxing must match between
 * click picking, pin overlay, and the utility map viewer.
 */
export type RadarImgContainLayout = {
  elementW: number;
  elementH: number;
  displayedW: number;
  displayedH: number;
  offsetX: number;
  offsetY: number;
};

export function getRadarImgObjectContainLayout(
  img: HTMLImageElement,
): RadarImgContainLayout | null {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const rect = img.getBoundingClientRect();
  if (!nw || !nh || rect.width <= 0 || rect.height <= 0) return null;

  const scale = Math.min(rect.width / nw, rect.height / nh);
  const displayedW = nw * scale;
  const displayedH = nh * scale;
  const offsetX = (rect.width - displayedW) / 2;
  const offsetY = (rect.height - displayedH) / 2;

  return {
    elementW: rect.width,
    elementH: rect.height,
    displayedW,
    displayedH,
    offsetX,
    offsetY,
  };
}

/** Client → 0–1 over the **bitmap** (display space). Returns null if outside the painted area. */
export function clientPointToDisplayNormInObjectContain(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const lay = getRadarImgObjectContainLayout(img);
  if (!lay) return null;

  const rect = img.getBoundingClientRect();
  const lx = clientX - rect.left - lay.offsetX;
  const ly = clientY - rect.top - lay.offsetY;
  if (
    lx < -0.5 ||
    lx > lay.displayedW + 0.5 ||
    ly < -0.5 ||
    ly > lay.displayedH + 0.5
  ) {
    return null;
  }

  const x = lx / lay.displayedW;
  const y = ly / lay.displayedH;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

/** Pin / overlay: `left` / `top` as % of the same positioned parent as the img (sized to img box). */
export function displayNormToOverlayPercent(
  lay: RadarImgContainLayout,
  dispX: number,
  dispY: number,
): { leftPct: number; topPct: number } {
  const px = lay.offsetX + dispX * lay.displayedW;
  const py = lay.offsetY + dispY * lay.displayedH;
  return {
    leftPct: (px / lay.elementW) * 100,
    topPct: (py / lay.elementH) * 100,
  };
}

/** SVG viewBox 0–100 with `preserveAspectRatio="none"` (matches current utility map overlay). */
export function displayNormToSvgPercent(
  lay: RadarImgContainLayout,
  dispX: number,
  dispY: number,
): { x: number; y: number } {
  const { leftPct, topPct } = displayNormToOverlayPercent(lay, dispX, dispY);
  return { x: leftPct, y: topPct };
}
