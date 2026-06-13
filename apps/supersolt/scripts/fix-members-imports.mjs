import fs from "node:fs";
import path from "node:path";

const apiRoot = "app/api";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

const importRe =
  /import \{\s*membersErrorResponse,\s*membersInternalErrorResponse,\s*\} from "@\/lib\/api\/members-error-response";/g;

let updated = 0;
for (const file of walk(apiRoot)) {
  let out = fs.readFileSync(file, "utf8");
  if (!out.includes("membersErrorResponse") && !out.includes("handleMembersRouteError")) continue;
  const before = out;
  out = out.replace(
    importRe,
    `import { handleMembersRouteError } from "@/lib/api/members-error-response";`,
  );
  if (out !== before) {
    fs.writeFileSync(file, out);
    updated++;
    console.log("fixed", file);
  }
}

console.log("total", updated);
