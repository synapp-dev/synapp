import { db } from '@/server/db/drizzle';
import { schools, states, schoolSectors, schoolLevels } from '@/server/db/schema';
import { count } from 'drizzle-orm';

async function testMigration() {
  console.log('🧪 Testing migration setup...');
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    
    // Count existing data
    const [stateCount] = await db.select({ count: count() }).from(states);
    const [sectorCount] = await db.select({ count: count() }).from(schoolSectors);
    const [levelCount] = await db.select({ count: count() }).from(schoolLevels);
    const [schoolCount] = await db.select({ count: count() }).from(schools);
    
    console.log(`📊 Current data counts:`);
    console.log(`  - States: ${stateCount?.count}`);
    console.log(`  - Sectors: ${sectorCount?.count}`);
    console.log(`  - Levels: ${levelCount?.count}`);
    console.log(`  - Schools: ${schoolCount?.count}`);
    
    if (stateCount?.count === 0 || sectorCount?.count === 0 || levelCount?.count === 0 || schoolCount?.count === 0) {
      console.log('⚠️  Reference data is missing. Please run: npm run seed:reference');
      return false;
    }
    
    console.log('✅ Database connection and reference data look good!');
    console.log('🚀 Ready to run migration: npm run migrate:schools');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testMigration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });

export { testMigration };
