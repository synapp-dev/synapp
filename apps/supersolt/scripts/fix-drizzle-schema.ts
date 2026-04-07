import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fixDrizzleSchema() {
  const schemaPath = join(__dirname, "../drizzle/schema.ts");
  let content = readFileSync(schemaPath, "utf-8");
  const originalContent = content;

  // drizzle-kit occasionally emits malformed default string literals
  content = content.replace(/\.default\('\)/g, ".default(sql`NULL`)");

  // drizzle-kit sometimes emits legacy securityInvoker payload
  content = content.replace(
    /\.with\(\{"securityInvoker":"on"\}\)/g,
    ".with({ securityInvoker: true })"
  );

  if (content !== originalContent) {
    writeFileSync(schemaPath, content, "utf-8");
  }
}

fixDrizzleSchema();
