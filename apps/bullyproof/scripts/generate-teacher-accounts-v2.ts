import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface School {
  id: string;
  name: string;
  code?: string;
  state_id?: string;
  sector_id?: string;
  email_domain?: string;
  address?: string;
  joined_at?: string;
  created_at: string;
  slug?: string;
  banner_url?: string;
  avatar_url?: string;
}

function generateEmailFromSchoolName(schoolName: string): string {
  // Take first two words of school name, no cleanup
  const words = schoolName.toLowerCase().split(' ').slice(0, 2);
  
  if (words.length === 0) {
    return 'teacher@school.edu.au';
  }
  
  const emailPrefix = words.join('');
  return `teacher@${emailPrefix}.edu.au`;
}

function generateSQLInserts(schools: School[]): string {
  const teacherRoleId = '9674fd6f-f6e8-42d1-b50b-449ee78b5ab4';
  
  const userCreations = schools.map(school => {
    const teacherEmail = generateEmailFromSchoolName(school.name);
    return `-- Creating teacher account for ${school.name}
SELECT create_user('${teacherEmail}', 'bullyproof');`;
  });

  const roleAssignments = schools.map(school => {
    const teacherEmail = generateEmailFromSchoolName(school.name);
    return `-- Assigning TEACHER role for ${school.name}
INSERT INTO user_roles (user_id, role_id, school_id, role_scope, assigned_at)
SELECT 
  u.id as user_id,
  '${teacherRoleId}'::uuid as role_id,
  '${school.id}'::uuid as school_id,
  'school' as role_scope,
  NOW() as assigned_at
FROM auth.users u 
WHERE u.email = '${teacherEmail}';`;
  });

  return userCreations.join('\n\n') + '\n\n-- Role Assignments\n\n' + roleAssignments.join('\n\n');
}

async function main() {
  try {
    console.log('This script generates SQL for teacher accounts based on schools in the database.');
    console.log('To use this script:');
    console.log('1. Run the SQL query: SELECT * FROM schools;');
    console.log('2. Save the results as schools.json in the same directory');
    console.log('3. Run this script again');
    console.log('');
    
    // Check if schools.json exists
    const schoolsPath = path.join(__dirname, 'schools.json');
    
    if (!fs.existsSync(schoolsPath)) {
      console.log('schools.json not found. Please create it first by running:');
      console.log('SELECT * FROM schools;');
      console.log('And save the results as schools.json');
      return;
    }
    
    // Read the schools data
    const schoolsData: School[] = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
    
    console.log(`Found ${schoolsData.length} schools`);
    
    // Generate SQL inserts
    const sqlInserts = generateSQLInserts(schoolsData);
    
    // Write to file
    const outputPath = path.join(__dirname, '02-teacher-accounts-with-roles.sql');
    fs.writeFileSync(outputPath, sqlInserts);
    
    console.log(`Generated SQL file: ${outputPath}`);
    console.log(`Total teacher accounts to be created: ${schoolsData.length}`);
    
    // Show a few examples
    console.log('\nExample teacher emails that will be created:');
    schoolsData.slice(0, 5).forEach(school => {
      const email = generateEmailFromSchoolName(school.name);
      console.log(`- ${school.name} -> ${email}`);
    });
    
  } catch (error) {
    console.error('Error generating teacher accounts:', error);
  }
}

main();
