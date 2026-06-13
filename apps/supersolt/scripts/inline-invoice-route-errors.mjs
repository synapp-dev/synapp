import fs from "node:fs";
import path from "node:path";

const invoicesRoot = "app/api/organisations/[organisation]/venues/[venue]/invoices";

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === "route.ts") files.push(full);
  }
  return files;
}

let updated = 0;
for (const file of walk(invoicesRoot)) {
  let out = fs.readFileSync(file, "utf8");
  if (!out.includes("handleInvoicesRouteError")) continue;
  const before = out;

  out = out.replace(/import \{ handleInvoicesRouteError \} from "[^"]+";\n?/g, "");
  out = out.replace(
    /return handleInvoicesRouteError\(error\);/g,
    'return serviceErrorResponse(error, "invoices");',
  );

  if (!out.includes("serviceErrorResponse")) {
    if (out.includes('from "@/lib/api/route-auth"')) {
      out = out.replace(
        'import { requireRequestAuth } from "@/lib/api/route-auth";',
        'import { requireRequestAuth } from "@/lib/api/route-auth";\nimport { serviceErrorResponse } from "@/lib/api/service-error-response";',
      );
    } else {
      out = `import { serviceErrorResponse } from "@/lib/api/service-error-response";\n${out}`;
    }
  } else if (!out.match(/import \{[^}]*serviceErrorResponse[^}]*\}/)) {
    out = out.replace(
      /import \{([^}]+)\} from "@\/lib\/api\/service-error-response";/,
      (full, imports) => {
        const parts = imports.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.includes("serviceErrorResponse")) return full;
        return `import { ${[...parts, "serviceErrorResponse"].join(", ")} } from "@/lib/api/service-error-response";`;
      },
    );
  }

  if (out !== before) {
    fs.writeFileSync(file, out);
    updated++;
    console.log("updated", file);
  }
}

console.log("total", updated);
