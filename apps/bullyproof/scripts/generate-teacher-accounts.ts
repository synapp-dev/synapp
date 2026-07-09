import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface School {
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
  const functionDefinition = `-- Function to create users (run this first if it doesn't exist)
CREATE OR REPLACE FUNCTION public.create_user(
    email text,
    password text
) RETURNS void AS $$
  declare
  user_id uuid;
  encrypted_pw text;
BEGIN
  user_id := gen_random_uuid();
  encrypted_pw := crypt(password, gen_salt('bf'));
  
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', email, encrypted_pw, NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '');
  
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, email)::jsonb, 'email', NOW(), NOW(), NOW());
END;
$$ LANGUAGE plpgsql;

`;

  const inserts = schools.map(school => {
    const teacherEmail = generateEmailFromSchoolName(school.schoolName);
    
    return `-- Creating teacher account for ${school.schoolName}
SELECT create_user('${teacherEmail}', 'bullyproof');`;
  });

  return functionDefinition + inserts.join('\n\n');
}

async function main() {
  try {
    // Read the schools data
    const schoolsPath = path.join(__dirname, '../components/organisms/schools.json');
    const schoolsData = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
    
    console.log(`Found ${schoolsData.length} schools`);
    
    // Generate SQL inserts
    const sqlInserts = generateSQLInserts(schoolsData);
    
    // Write to file
    const outputPath = path.join(__dirname, 'teacher-accounts.sql');
    fs.writeFileSync(outputPath, sqlInserts);
    
    console.log(`Generated SQL file: ${outputPath}`);
    console.log(`Total teacher accounts to be created: ${schoolsData.length}`);
    
    // Show a few examples
    console.log('\nExample teacher emails that will be created:');
    schoolsData.slice(0, 5).forEach(school => {
      const email = generateEmailFromSchoolName(school.schoolName);
      console.log(`- ${school.schoolName} -> ${email}`);
    });
    
  } catch (error) {
    console.error('Error generating teacher accounts:', error);
  }
}

main();
