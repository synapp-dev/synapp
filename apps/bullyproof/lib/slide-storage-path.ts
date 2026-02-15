/**
 * Central helper for topic slide storage paths.
 *
 * Uses stageId and topicId (UUIDs) for paths - stable and never changes when
 * stages or topics are renamed. Old format s4/t4 used stage code and stage_order
 * which were less robust.
 *
 * Path format: slides/topics/{stageId}/{topicId}/{slideId}.{ext}
 */

export function getTopicSlideStoragePath(
  stageId: string,
  topicId: string,
  slideId: string,
  fileExtension: string = "jpg"
): string {
  const fileName = `${slideId}.${fileExtension}`;
  return `slides/topics/${stageId}/${topicId}/${fileName}`;
}
