/**
 * Script to normalize slide positions for topic_slides and course_topic_slides.
 * Recomputes fractional positions based on current order.
 *
 * Run with: pnpm backfill:slide-positions
 */

import { runBackfillSlidePositions } from "../server/migrations/backfill-slide-positions";

async function main() {
  console.log("Normalizing slide positions...\n");

  try {
    const result = await runBackfillSlidePositions();

    console.log("topic_slides:");
    console.log(
      `  ${result.topicSlides.updated} slides updated across ${result.topicSlides.topics} topics`
    );

    console.log("\ncourse_topic_slides:");
    console.log(
      `  ${result.courseTopicSlides.updated} slides updated across ${result.courseTopicSlides.topics} topics`
    );

    console.log(`\nDone. Total: ${result.total} slides updated.`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
