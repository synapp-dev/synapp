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

const catchBlockRe =
  /\} catch \(error\) \{\s*if \(error instanceof (\w+)\) \{\s*return NextResponse\.json\([\s\S]*?\);\s*\}\s*(?:console\.error\([^)]+\);\s*)?return NextResponse\.json\([\s\S]*?Internal server error[\s\S]*?\);\s*\}/g;

function logTag(filePath) {
  const rel = filePath.replaceAll("\\", "/");
  const parts = rel.split("/");
  const idx = parts.indexOf("venues");
  if (idx >= 0 && parts[idx + 2]) {
    const segment = parts[idx + 2];
    if (segment === "workforce" && parts[idx + 3]) return parts[idx + 3];
    if (segment === "insights" && parts[idx + 3]) return `insights/${parts[idx + 3]}`;
    if (segment === "xero" && parts[idx + 3]) return `xero/${parts[idx + 3]}`;
    return segment;
  }
  if (parts.includes("members")) return "members";
  if (parts.includes("award-rates")) return "award-rates";
  if (parts.includes("payroll-export")) return "payroll-export";
  if (parts.includes("leave-types")) return "leave-types";
  return parts.at(-2) ?? "api";
}

function stripUnusedServiceErrorImports(source) {
  return source.replace(
    /import \{([^}]+)\} from "(@\/server\/[^"]+)";/g,
    (full, imports, fromPath) => {
      const parts = imports.split(",").map((part) => part.trim()).filter(Boolean);
      const kept = parts.filter((part) => {
        const match = part.match(/(\w+ServiceError)/);
        if (!match) return true;
        return source.includes(match[1]);
      });
      if (kept.length === 0) return "";
      if (kept.length === parts.length) return full;
      return `import { ${kept.join(", ")} } from "${fromPath}";`;
    },
  );
}

function stripUnusedVenueAccessImport(source) {
  if (source.includes("VenueAccessError")) return source;
  return source.replace(
    /import \{ VenueAccessError \} from "@\/server\/access\/venue-access";\n?/g,
    "",
  );
}

let updated = 0;
for (const file of walk(apiRoot)) {
  if (file.includes("_lib")) continue;
  const src = fs.readFileSync(file, "utf8");
  if (!catchBlockRe.test(src)) continue;
  catchBlockRe.lastIndex = 0;

  const tag = logTag(file);
  let out = src.replace(
    catchBlockRe,
    `} catch (error) {\n    return serviceErrorResponse(error, "${tag}");\n  }`,
  );
  if (out === src) continue;

  if (!out.includes("serviceErrorResponse")) {
    if (out.includes('from "@/lib/api/route-auth"')) {
      out = out.replace(
        'import { requireRequestAuth } from "@/lib/api/route-auth";',
        'import { requireRequestAuth } from "@/lib/api/route-auth";\nimport { serviceErrorResponse } from "@/lib/api/service-error-response";',
      );
    } else if (out.includes('from "next/server"')) {
      out = out.replace(
        'import { NextResponse } from "next/server";',
        'import { NextResponse } from "next/server";\nimport { serviceErrorResponse } from "@/lib/api/service-error-response";',
      );
    } else {
      out = `import { serviceErrorResponse } from "@/lib/api/service-error-response";\n${out}`;
    }
  }

  out = stripUnusedServiceErrorImports(out);
  out = stripUnusedVenueAccessImport(out);
  fs.writeFileSync(file, out);
  updated++;
  console.log("updated", file);
}

console.log("total", updated);
