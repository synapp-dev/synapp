import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = join(__dirname, "..");

function runPull() {
  try {
    execSync("pnpm drizzle-kit pull", {
      stdio: "inherit",
      cwd: appRoot,
    });
  } catch (error: any) {
    if (error?.status === 1 || String(error?.message ?? "").includes("not found")) {
      execSync("pnpm drizzle-kit introspect", {
        stdio: "inherit",
        cwd: appRoot,
      });
      return;
    }
    throw error;
  }
}

function fixSchemaFile() {
  const schemaPath = join(appRoot, "drizzle/schema.ts");
  let content = readFileSync(schemaPath, "utf-8");
  const originalContent = content;

  content = content.replace(/\.default\('\)/g, ".default(sql`NULL`)");
  content = content.replace(
    /\.with\(\{"securityInvoker":"on"\}\)/g,
    ".with({ securityInvoker: true })"
  );

  if (content !== originalContent) {
    writeFileSync(schemaPath, content, "utf-8");
  }
}

try {
  runPull();
  fixSchemaFile();
} catch (error) {
  console.error("Failed to pull and fix drizzle schema:", error);
  process.exit(1);
}
