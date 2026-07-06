/**
 * Re-export from shared lib for server-side consumers.
 * Implementation lives in @/lib/fractional-position.ts
 */
export {
  compareSlidesByPosition,
  computePositionsForOrder,
  generatePositionBetween,
} from "@/lib/fractional-position";
