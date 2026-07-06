import type { ResolveFinalSlideOrderInput } from "./types";

/** Merge existing reorder IDs with new slides at explicit indices. */
export function mergeReorderWithNewSlidePositions(
  validReorderIds: string[],
  newSlidePositions: Array<[number, string]>
): string[] {
  const sorted = [...newSlidePositions].sort((a, b) => a[0] - b[0]);
  const totalSlides = validReorderIds.length + sorted.length;
  const finalOrder: string[] = [];
  let existingIndex = 0;
  let newSlideIndex = 0;

  for (let currentPosition = 0; currentPosition < totalSlides; currentPosition++) {
    if (
      newSlideIndex < sorted.length &&
      sorted[newSlideIndex]![0] === currentPosition
    ) {
      finalOrder.push(sorted[newSlideIndex]![1]);
      newSlideIndex++;
    } else if (existingIndex < validReorderIds.length) {
      finalOrder.push(validReorderIds[existingIndex]!);
      existingIndex++;
    }
  }

  return finalOrder;
}

/** Append newly created slides after existing reorder IDs (curriculum bulk-save). */
export function buildAppendNewSlidePositions(
  validReorderCount: number,
  createdSlideIds: string[]
): Array<[number, string]> {
  return createdSlideIds.map(
    (id, index) => [validReorderCount + index, id] as [number, string]
  );
}

/** Build positions from a slideId → intendedIndex map (certification bulk-save). */
export function buildNewSlidePositionsFromIndexMap(
  newSlideIndexBySlideId: Map<string, number>
): Array<[number, string]> {
  return Array.from(newSlideIndexBySlideId.entries()).map(
    ([slideId, index]) => [index, slideId] as [number, string]
  );
}

/**
 * Resolve the final slide ID order after creates/deletes.
 * Prefers desiredOrder; falls back to reorder + new slide positions.
 */
export function resolveFinalSlideOrder(
  input: ResolveFinalSlideOrderInput
): string[] | null {
  const { desiredOrder, reorder, deletedSlideIds, tempIdToSlideIdMap } = input;

  if (desiredOrder && desiredOrder.length > 0) {
    const resolved = desiredOrder
      .map((id) => tempIdToSlideIdMap.get(id) ?? id)
      .filter((id) => !deletedSlideIds.has(id));
    return resolved.length > 0 ? resolved : null;
  }

  if (reorder && reorder.length > 0) {
    const validReorderIds = reorder.filter((id) => !deletedSlideIds.has(id));

    if (input.newSlidePositions && input.newSlidePositions.length > 0) {
      return mergeReorderWithNewSlidePositions(
        validReorderIds,
        input.newSlidePositions
      );
    }

    return validReorderIds.length > 0 ? validReorderIds : null;
  }

  return null;
}

export function findSlidesNotOwnedByTopic(
  finalOrder: string[],
  validSlideIds: Set<string>
): string[] {
  return finalOrder.filter((slideId) => !validSlideIds.has(slideId));
}
