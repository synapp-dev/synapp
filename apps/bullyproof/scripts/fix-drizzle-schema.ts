import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Fixes common lint errors in drizzle schema.ts file after running drizzle-kit pull/introspect
 *
 * Fixes:
 * 1. Unterminated string literals: `.default(')` → `.default(sql`NULL`)`
 * 2. Type errors: `.with({"securityInvoker":"on"})` → `.with({ securityInvoker: true })`
 */
function fixDrizzleSchema() {
  console.log("🔧 Fixing drizzle schema.ts lint errors...");

  try {
    const schemaPath = join(__dirname, "../drizzle/schema.ts");
    let content = readFileSync(schemaPath, "utf-8");

    const originalContent = content;
    let fixesApplied = 0;

    // Fix 1: Replace unterminated string literals `.default(')` with `.default(sql`NULL`)`
    const unterminatedPattern = /\.default\('\)/g;
    const unterminatedMatches = content.match(unterminatedPattern);
    if (unterminatedMatches) {
      content = content.replace(unterminatedPattern, ".default(sql`NULL`)");
      fixesApplied += unterminatedMatches.length;
      console.log(
        `  ✅ Fixed ${unterminatedMatches.length} unterminated string literal(s)`
      );
    }

    // Fix 2: Replace `.with({"securityInvoker":"on"})` with `.with({ securityInvoker: true })`
    const securityInvokerPattern = /\.with\(\{"securityInvoker":"on"\}\)/g;
    const securityInvokerMatches = content.match(securityInvokerPattern);
    if (securityInvokerMatches) {
      content = content.replace(
        securityInvokerPattern,
        ".with({ securityInvoker: true })"
      );
      fixesApplied += securityInvokerMatches.length;
      console.log(
        `  ✅ Fixed ${securityInvokerMatches.length} securityInvoker type error(s)`
      );
    }

    // Only write if changes were made
    if (content !== originalContent) {
      writeFileSync(schemaPath, content, "utf-8");
      console.log(`\n✅ Schema file fixed successfully!`);
      console.log(`📊 Total fixes applied: ${fixesApplied}`);
      console.log(`📄 File: ${schemaPath}`);
    } else {
      console.log(`\n✨ No fixes needed - schema file is already clean!`);
    }
  } catch (error) {
    console.error("💥 Failed to fix schema file:", error);
    process.exit(1);
  }
}

// Run the fix
fixDrizzleSchema();
