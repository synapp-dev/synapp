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

const replacements = [
  [
    '@/app/api/organisations/[organisation]/workforce/payroll-export/_lib/payroll-error-response',
    "@/lib/api/payroll-error-response",
  ],
  [
    '@/app/api/organisations/[organisation]/award-rates/_lib/award-error-response',
    "@/lib/api/award-error-response",
  ],
  [
    `import {
  membersErrorResponse,
  membersInternalErrorResponse,
} from "@/lib/api/members-error-response";`,
    `import { handleMembersRouteError } from "@/lib/api/members-error-response";`,
  ],
  [
    "return membersErrorResponse(error) ?? membersInternalErrorResponse();",
    "return handleMembersRouteError(error);",
  ],
];

let updated = 0;
for (const file of walk(apiRoot)) {
  let out = fs.readFileSync(file, "utf8");
  const before = out;
  for (const [from, to] of replacements) {
    out = out.replaceAll(from, to);
  }
  if (out !== before) {
    fs.writeFileSync(file, out);
    updated++;
    console.log("updated", file);
  }
}

console.log("total", updated);
