import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = join(__dirname, "..");

try {
  execSync("pnpm drizzle-kit pull", { stdio: "inherit", cwd: appRoot });
  execSync("pnpm fix:schema", { stdio: "inherit", cwd: appRoot });
} catch (error) {
  console.error("Failed to pull and fix drizzle schema:", error);
  process.exit(1);
}
