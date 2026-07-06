export type {
  BulkSaveReorderOperations,
  ResolveFinalSlideOrderInput,
} from "./types";

export {
  buildAppendNewSlidePositions,
  buildNewSlidePositionsFromIndexMap,
  findSlidesNotOwnedByTopic,
  mergeReorderWithNewSlidePositions,
  resolveFinalSlideOrder,
} from "./order";
