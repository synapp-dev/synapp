import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../server/db/drizzle';
import { 
  schools, 
  states, 
  schoolSectors, 
  schoolLevels, 
  schoolLevelAssignments 
} from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Types for the legacy JSON data
interface LegacySchool {
  schoolName: string;
  schoolId: string;
  state: string;
  schoolType: string;
  schoolLevel: string;
  joiningDate: string | null;
  firstName: string;
  lastName: string;
  email: string;
  isNew: boolean;
  currentStatus: string;
  accountStatus: string | null;
  teacherCount: string;
  studentCount: string;
  cultureRatingCount: string;
}

// Helper function to generate URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

// Helper function to check if school already exists
async function schoolExists(name: string): Promise<boolean> {
  const existing = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.name, name))
    .limit(1);
  
  return existing.length > 0;
}

async function migrateSchools() {
  console.log('🚀 Starting school data migration...');
  
  try {
    // Read the legacy JSON file
    const jsonPath = join(__dirname, '../components/organisms/schools.json');
    const jsonData = readFileSync(jsonPath, 'utf-8');
    const legacySchools: LegacySchool[] = JSON.parse(jsonData);
    
    console.log(`📊 Found ${legacySchools.length} schools in legacy data`);
    
    // Query reference data
    console.log('🔍 Querying reference data...');
    
    const allStates = await db.select().from(states);
    const allSectors = await db.select().from(schoolSectors);
    const allLevels = await db.select().from(schoolLevels);
    
    console.log(`📋 Found ${allStates.length} states, ${allSectors.length} sectors, ${allLevels.length} levels`);
    
    // Check if reference data exists
    if (allStates.length === 0) {
      console.log('⚠️  No states found. Please run the seed script first: npm run seed:reference');
      process.exit(1);
    }
    
    if (allSectors.length === 0) {
      console.log('⚠️  No school sectors found. Please run the seed script first: npm run seed:reference');
      process.exit(1);
    }
    
    if (allLevels.length === 0) {
      console.log('⚠️  No school levels found. Please run the seed script first: npm run seed:reference');
      process.exit(1);
    }
    
    // Create lookup maps
    const stateMap = new Map(allStates.map(s => [s.name.toLowerCase(), s.id]));
    const sectorMap = new Map(allSectors.map(s => [s.key, s.id]));
    const levelMap = new Map(allLevels.map(l => [l.key, l.id]));
    
    // State name mapping (handle variations)
    const stateNameMap: Record<string, string> = {
      'queensland': 'Queensland',
      'victoria': 'Victoria',
      'new south wales': 'New South Wales',
      'nsw': 'New South Wales',
      'qld': 'Queensland',
      'vic': 'Victoria'
    };
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const school of legacySchools) {
      try {
        // Check if school already exists
        if (await schoolExists(school.schoolName)) {
          console.log(`⏭️  Skipping existing school: ${school.schoolName}`);
          skipped++;
          continue;
        }
        
        // Map state
        const normalizedStateName = stateNameMap[school.state.toLowerCase()] || school.state;
        const stateId = stateMap.get(normalizedStateName.toLowerCase());
        if (!stateId) {
          console.warn(`⚠️  State not found: ${school.state} (normalized: ${normalizedStateName})`);
          continue;
        }
        
        // Map sector
        const sectorKey = school.schoolType.toLowerCase();
        const sectorId = sectorMap.get(sectorKey);
        if (!sectorId) {
          console.warn(`⚠️  Sector not found: ${school.schoolType}`);
          continue;
        }
        
        // Generate slug
        const slug = generateSlug(school.schoolName);
        
        // Insert school
        const insertedSchools = await db
          .insert(schools)
          .values({
            name: school.schoolName,
            code: school.schoolId,
            stateId,
            sectorId,
            slug,
            joinedAt: school.joiningDate ? new Date(school.joiningDate).toISOString() : null,
          })
          .returning({ id: schools.id });
        
        const insertedSchool = insertedSchools[0];
        if (!insertedSchool) {
          throw new Error('Failed to insert school');
        }
        
        console.log(`✅ Inserted school: ${school.schoolName} (ID: ${insertedSchool.id})`);
        
        // Handle school levels (many-to-many)
        const schoolLevels = school.schoolLevel.split(',').map(level => level.trim());
        
        for (const levelName of schoolLevels) {
          const levelKey = levelName.toLowerCase();
          const levelId = levelMap.get(levelKey);
          
          if (levelId) {
            await db.insert(schoolLevelAssignments).values({
              schoolId: insertedSchool.id,
              levelId,
            });
            console.log(`  📚 Added level: ${levelName}`);
          } else {
            console.warn(`  ⚠️  Level not found: ${levelName}`);
          }
        }
        
        imported++;
        
      } catch (error) {
        console.error(`❌ Error processing school ${school.schoolName}:`, error);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Imported: ${imported} schools`);
    console.log(`⏭️  Skipped: ${skipped} schools (already exist)`);
    console.log(`❌ Errors: ${errors} schools`);
    console.log(`📊 Total processed: ${legacySchools.length} schools`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateSchools()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

export { migrateSchools };
