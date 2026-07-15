import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Helper function to generate URL-friendly slug with state suffix
function generateSlug(name: string, state: string): string {
  // Get state code from state name
  const stateCodeMap: Record<string, string> = {
    'queensland': 'qld',
    'victoria': 'vic',
    'new south wales': 'nsw',
    'western australia': 'wa',
    'south australia': 'sa',
    'tasmania': 'tas',
    'australian capital territory': 'act',
    'northern territory': 'nt'
  };
  
  const stateCode = stateCodeMap[state.toLowerCase()] || 'unknown';
  
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  return `${baseSlug}-${stateCode}`;
}

// State name mapping
const stateNameMap: Record<string, string> = {
  'queensland': 'Queensland',
  'victoria': 'Victoria',
  'new south wales': 'New South Wales',
  'nsw': 'New South Wales',
  'qld': 'Queensland',
  'vic': 'Victoria'
};

// Level mapping
const levelMap: Record<string, string> = {
  'primary': 'primary',
  'secondary': 'secondary'
};

function generateSQL() {
  console.log('📊 Generating SQL from schools JSON...');
  
  try {
    // Read the legacy JSON file
    const jsonPath = join(__dirname, '../components/organisms/schools.json');
    const jsonData = readFileSync(jsonPath, 'utf-8');
    const legacySchools: LegacySchool[] = JSON.parse(jsonData);
    
    console.log(`📋 Found ${legacySchools.length} schools in legacy data`);
    
    // Generate SQL statements
    let sql = `-- School Data Migration SQL
-- Generated from legacy schools.json
-- Run this in Supabase SQL Editor
-- Note: Assumes reference data (states, school_sectors, school_levels) already exists

-- Insert schools
`;

    const schoolInserts: string[] = [];
    const levelAssignments: string[] = [];

    for (const school of legacySchools) {
      // Map state
      const normalizedStateName = stateNameMap[school.state.toLowerCase()] || school.state;
      
      // Map sector
      const sectorKey = school.schoolType.toLowerCase();
      
      // Generate slug with state suffix
      const slug = generateSlug(school.schoolName, school.state);
      
      // Format joining date
      const joinedAt = school.joiningDate ? `'${new Date(school.joiningDate).toISOString()}'` : 'NULL';
      
      // Create school insert
      const schoolInsert = `INSERT INTO schools (name, code, state_id, sector_id, slug, joined_at, created_at) VALUES (
  '${school.schoolName.replace(/'/g, "''")}',
  '${school.schoolId}',
  (SELECT id FROM states WHERE name = '${normalizedStateName}'),
  (SELECT id FROM school_sectors WHERE key = '${sectorKey}'),
  '${slug}',
  ${joinedAt},
  NOW()
);`;
      
      schoolInserts.push(schoolInsert);
      
      // Handle school levels (many-to-many)
      const schoolLevels = school.schoolLevel.split(',').map(level => level.trim());
      
      for (const levelName of schoolLevels) {
        const levelKey = levelName.toLowerCase();
        if (levelMap[levelKey]) {
          const levelAssignment = `INSERT INTO school_level_assignments (school_id, level_id) VALUES (
  (SELECT id FROM schools WHERE code = '${school.schoolId}'),
  (SELECT id FROM school_levels WHERE key = '${levelKey}')
);`;
          levelAssignments.push(levelAssignment);
        }
      }
    }
    
    // Combine all SQL
    sql += schoolInserts.join('\n\n');
    sql += '\n\n-- School level assignments\n\n';
    sql += levelAssignments.join('\n\n');
    
    // Add summary
    sql += `\n\n-- Summary:
-- ${legacySchools.length} schools processed
-- ${schoolInserts.length} school inserts
-- ${levelAssignments.length} level assignments
-- Run this script in Supabase SQL Editor
`;
    
    // Write to file
    const outputPath = join(__dirname, 'school-migration.sql');
    writeFileSync(outputPath, sql);
    
    console.log(`✅ SQL generated successfully!`);
    console.log(`📄 Output file: ${outputPath}`);
    console.log(`📊 Summary:`);
    console.log(`  - Schools: ${schoolInserts.length}`);
    console.log(`  - Level assignments: ${levelAssignments.length}`);
    console.log(`\n🚀 Copy the contents of school-migration.sql and run in Supabase SQL Editor`);
    
  } catch (error) {
    console.error('💥 SQL generation failed:', error);
    process.exit(1);
  }
}

// Run the generation
generateSQL();
