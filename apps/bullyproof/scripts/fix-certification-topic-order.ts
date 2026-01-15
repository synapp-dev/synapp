/**
 * Script to fix certification topic stageOrder values to match file paths
 * 
 * This script:
 * 1. Gets all certification topics
 * 2. Extracts topic numbers from slide imageUrl paths
 * 3. Updates stageOrder to match the most common topic number found in file paths
 * 
 * Run with: npx tsx scripts/fix-certification-topic-order.ts
 */

import { db } from '../server/db/drizzle';
import { certificationTopics, certificationSlides, certificationStages } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface TopicWithSlides {
  id: string;
  stageId: string;
  stageOrder: number | null;
  title: string;
  slides: Array<{
    id: string;
    imageUrl: string | null;
  }>;
}

async function fixCertificationTopicOrder() {
  console.log('🔍 Starting certification topic order fix...\n');

  try {
    // Get all stages
    const stages = await db.select().from(certificationStages);
    console.log(`Found ${stages.length} certification stages\n`);

    let totalFixed = 0;
    let totalChecked = 0;

    for (const stage of stages) {
      console.log(`\n📋 Processing stage: ${stage.code} (${stage.name})`);
      
      // Get all topics for this stage
      const topics = await db
        .select()
        .from(certificationTopics)
        .where(eq(certificationTopics.stageId, stage.id))
        .orderBy(certificationTopics.stageOrder);

      console.log(`  Found ${topics.length} topics`);

      for (const topic of topics) {
        totalChecked++;
        
        // Get all slides for this topic
        const slides = await db
          .select({
            id: certificationSlides.id,
            imageUrl: certificationSlides.imageUrl,
          })
          .from(certificationSlides)
          .where(eq(certificationSlides.topicId, topic.id));

        // Extract topic numbers from imageUrl paths
        // Pattern: .../slides/certification/{stageCode}/t{topicNumber}/{fileName}
        const topicNumbers: number[] = [];
        
        for (const slide of slides) {
          if (slide.imageUrl) {
            const topicMatch = slide.imageUrl.match(/\/t(\d+)\//);
            if (topicMatch) {
              const topicNum = parseInt(topicMatch[1], 10);
              topicNumbers.push(topicNum);
            }
          }
        }

        if (topicNumbers.length === 0) {
          console.log(`  ⚠️  Topic "${topic.title}" (order ${topic.stageOrder}) - No slides with imageUrl found, skipping`);
          continue;
        }

        // Find the most common topic number (mode)
        const topicNumberCounts = new Map<number, number>();
        for (const num of topicNumbers) {
          topicNumberCounts.set(num, (topicNumberCounts.get(num) || 0) + 1);
        }

        let mostCommonTopicNumber = topicNumbers[0];
        let maxCount = topicNumberCounts.get(mostCommonTopicNumber) || 0;
        
        for (const [num, count] of topicNumberCounts.entries()) {
          if (count > maxCount) {
            mostCommonTopicNumber = num;
            maxCount = count;
          }
        }

        const expectedStageOrder = mostCommonTopicNumber;
        const currentStageOrder = topic.stageOrder;

        if (currentStageOrder === expectedStageOrder) {
          console.log(`  ✅ Topic "${topic.title}" (order ${currentStageOrder}) - Already correct`);
        } else {
          console.log(`  🔧 Topic "${topic.title}" - Updating stageOrder from ${currentStageOrder} to ${expectedStageOrder}`);
          console.log(`     Found ${topicNumbers.length} slides, ${maxCount} point to t${expectedStageOrder}/`);
          
          // Update the stageOrder
          await db
            .update(certificationTopics)
            .set({ stageOrder: expectedStageOrder })
            .where(eq(certificationTopics.id, topic.id));
          
          totalFixed++;
        }
      }
    }

    console.log(`\n\n✨ Fix complete!`);
    console.log(`   Checked: ${totalChecked} topics`);
    console.log(`   Fixed: ${totalFixed} topics`);
    
  } catch (error) {
    console.error('❌ Error fixing topic order:', error);
    throw error;
  }
}

// Run the script
fixCertificationTopicOrder()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
