/** Shared bulk-save reorder payload (curriculum + certification). */
export type BulkSaveReorderOperations = {
  desiredOrder?: string[];
  reorder?: string[];
};

export type ResolveFinalSlideOrderInput = BulkSaveReorderOperations & {
  deletedSlideIds: Set<string>;
  tempIdToSlideIdMap: Map<string, string>;
  /** Insert positions for newly created slides when using legacy reorder merge. */
  newSlidePositions?: Array<[number, string]>;
};
