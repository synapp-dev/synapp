import { db } from '../server/db/drizzle';
import { states, schoolSectors, schoolLevels } from '../drizzle/schema';

async function seedReferenceData() {
  console.log('🌱 Seeding reference data...');
  
  try {
    // Seed states
    console.log('📍 Seeding states...');
    const statesData = [
      { code: 'NSW', name: 'New South Wales' },
      { code: 'VIC', name: 'Victoria' },
      { code: 'QLD', name: 'Queensland' },
      { code: 'WA', name: 'Western Australia' },
      { code: 'SA', name: 'South Australia' },
      { code: 'TAS', name: 'Tasmania' },
      { code: 'ACT', name: 'Australian Capital Territory' },
      { code: 'NT', name: 'Northern Territory' },
    ];
    
    for (const state of statesData) {
      await db.insert(states).values(state).onConflictDoNothing();
    }
    console.log(`✅ Seeded ${statesData.length} states`);
    
    // Seed school sectors
    console.log('🏫 Seeding school sectors...');
    const sectorsData = [
      { name: 'Government', key: 'government' },
      { name: 'Catholic', key: 'catholic' },
      { name: 'Independent', key: 'independent' },
    ];
    
    for (const sector of sectorsData) {
      await db.insert(schoolSectors).values(sector).onConflictDoNothing();
    }
    console.log(`✅ Seeded ${sectorsData.length} school sectors`);
    
    // Seed school levels
    console.log('📚 Seeding school levels...');
    const levelsData = [
      { name: 'Primary', key: 'primary' },
      { name: 'Secondary', key: 'secondary' },
    ];
    
    for (const level of levelsData) {
      await db.insert(schoolLevels).values(level).onConflictDoNothing();
    }
    console.log(`✅ Seeded ${levelsData.length} school levels`);
    
    console.log('🎉 Reference data seeding completed!');
    
  } catch (error) {
    console.error('💥 Reference data seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedReferenceData()
  .then(() => {
    console.log('🎉 Reference data seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Reference data seeding failed:', error);
    process.exit(1);
  });

export { seedReferenceData };
