import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Runs drizzle-kit pull/introspect and then automatically fixes common lint errors
 * 
 * Usage: pnpm pull-and-fix-schema
 */
async function pullAndFixSchema() {
  console.log('🔄 Pulling schema from database with drizzle-kit...\n');
  
  try {
    // Run drizzle-kit introspect (or pull in newer versions)
    // Try 'pull' first, fall back to 'introspect' if it doesn't exist
    try {
      execSync('pnpm drizzle-kit pull', { 
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
    } catch (error: any) {
      // If 'pull' doesn't work, try 'introspect'
      if (error.message?.includes('command not found') || error.status === 1) {
        console.log('⚠️  "pull" command not found, trying "introspect"...\n');
        execSync('pnpm drizzle-kit introspect', { 
          stdio: 'inherit',
          cwd: join(__dirname, '..')
        });
      } else {
        throw error;
      }
    }
    
    console.log('\n🔧 Fixing lint errors in schema.ts...\n');
    
    // Now fix the schema file
    const schemaPath = join(__dirname, '../drizzle/schema.ts');
    let content = readFileSync(schemaPath, 'utf-8');
    
    const originalContent = content;
    let fixesApplied = 0;
    
    // Fix 1: Replace unterminated string literals `.default(')` with `.default(sql`NULL`)`
    const unterminatedPattern = /\.default\('\)/g;
    const unterminatedMatches = content.match(unterminatedPattern);
    if (unterminatedMatches) {
      content = content.replace(unterminatedPattern, '.default(sql`NULL`)');
      fixesApplied += unterminatedMatches.length;
      console.log(`  ✅ Fixed ${unterminatedMatches.length} unterminated string literal(s)`);
    }
    
    // Fix 2: Replace `.with({"securityInvoker":"on"})` with `.with({ securityInvoker: true })`
    const securityInvokerPattern = /\.with\(\{"securityInvoker":"on"\}\)/g;
    const securityInvokerMatches = content.match(securityInvokerPattern);
    if (securityInvokerMatches) {
      content = content.replace(securityInvokerPattern, '.with({ securityInvoker: true })');
      fixesApplied += securityInvokerMatches.length;
      console.log(`  ✅ Fixed ${securityInvokerMatches.length} securityInvoker type error(s)`);
    }
    
    // Only write if changes were made
    if (content !== originalContent) {
      writeFileSync(schemaPath, content, 'utf-8');
      console.log(`\n✅ Schema file fixed successfully!`);
      console.log(`📊 Total fixes applied: ${fixesApplied}`);
    } else {
      console.log(`\n✨ No fixes needed - schema file is already clean!`);
    }
    
    console.log(`\n🎉 Done! Schema pulled and fixed.`);
    
  } catch (error: any) {
    // Check if this is the known drizzle-kit check constraint error
    const errorMessage = error?.message || error?.toString() || '';
    const isCheckConstraintError = 
      errorMessage.includes("Cannot read properties of undefined (reading 'replace')") ||
      errorMessage.includes('checkValue') ||
      errorMessage.includes('check constraints');
    
    if (isCheckConstraintError) {
      console.error('\n❌ Error: drizzle-kit failed to process check constraints');
      console.error('\n📋 This is a known issue with drizzle-kit when processing certain check constraints.');
      console.error('\n💡 Possible solutions:');
      console.error('   1. Update drizzle-kit to the latest version (already updated to 0.31.8)');
      console.error('   2. Check your database for check constraints with null/undefined values');
      console.error('   3. Try running: pnpm install (to update dependencies)');
      console.error('   4. If the issue persists, you may need to manually fix check constraints in your database');
      console.error('\n🔍 To diagnose, run this SQL query in your database:');
      console.error(`
        SELECT 
          conname AS constraint_name,
          pg_get_constraintdef(oid) AS constraint_definition
        FROM pg_constraint
        WHERE contype = 'c'
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY conname;
      `);
    } else {
      console.error('\n💥 Failed:', error);
    }
    process.exit(1);
  }
}

// Run the script
pullAndFixSchema();
