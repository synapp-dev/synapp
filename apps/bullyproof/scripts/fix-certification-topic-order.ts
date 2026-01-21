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
import { courseTopics, courseTopicSlides, certificationCourses } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface TopicWithSlides {
  id: string;
  courseId: string;
  courseOrder: number | null;
  title: string;
  slides: Array<{
    id: string;
    imageUrl: string | null;
  }>;
}

async function fixCertificationTopicOrder() {
  console.log('🔍 Starting certification topic order fix...\n');

  try {
    // Get all courses
    const courses = await db.select().from(certificationCourses);
    console.log(`Found ${courses.length} certification courses\n`);

    let totalFixed = 0;
    let totalChecked = 0;

    for (const course of courses) {
      console.log(`\n📋 Processing course: ${course.code} (${course.name})`);
      
      // Get all topics for this course
      const topics = await db
        .select()
        .from(courseTopics)
        .where(eq(courseTopics.courseId, course.id))
        .orderBy(courseTopics.courseOrder);

      console.log(`  Found ${topics.length} topics`);

      for (const topic of topics) {
        totalChecked++;
        
        // Get all slides for this topic
        const slides = await db
          .select({
            id: courseTopicSlides.id,
            imageUrl: courseTopicSlides.imageUrl,
          })
          .from(courseTopicSlides)
          .where(eq(courseTopicSlides.topicId, topic.id));

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
          console.log(`  ⚠️  Topic "${topic.title}" (order ${topic.courseOrder}) - No slides with imageUrl found, skipping`);
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

        const expectedCourseOrder = mostCommonTopicNumber;
        const currentCourseOrder = topic.courseOrder;

        if (currentCourseOrder === expectedCourseOrder) {
          console.log(`  ✅ Topic "${topic.title}" (order ${currentCourseOrder}) - Already correct`);
        } else {
          console.log(`  🔧 Topic "${topic.title}" - Updating courseOrder from ${currentCourseOrder} to ${expectedCourseOrder}`);
          console.log(`     Found ${topicNumbers.length} slides, ${maxCount} point to t${expectedCourseOrder}/`);
          
          // Update the courseOrder
          await db
            .update(courseTopics)
            .set({ courseOrder: expectedCourseOrder })
            .where(eq(courseTopics.id, topic.id));
          
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
