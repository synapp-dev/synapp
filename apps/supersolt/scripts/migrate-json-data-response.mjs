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

function ensureImport(source, name) {
  const serviceImportRe =
    /import \{([^}]+)\} from "@\/lib\/api\/service-error-response";/;
  const match = source.match(serviceImportRe);
  if (match) {
    const parts = match[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.includes(name)) return source;
    return source.replace(
      serviceImportRe,
      `import { ${[...parts, name].join(", ")} } from "@/lib/api/service-error-response";`,
    );
  }

  if (source.includes('from "@/lib/api/route-auth"')) {
    return source.replace(
      'import { requireRequestAuth } from "@/lib/api/route-auth";',
      `import { requireRequestAuth } from "@/lib/api/route-auth";\nimport { ${name} } from "@/lib/api/service-error-response";`,
    );
  }

  if (source.includes('from "next/server"')) {
    return source.replace(
      'import { NextResponse } from "next/server";',
      `import { NextResponse } from "next/server";\nimport { ${name} } from "@/lib/api/service-error-response";`,
    );
  }

  return `import { ${name} } from "@/lib/api/service-error-response";\n${source}`;
}

function stripUnusedNextResponse(source) {
  if (!source.includes("NextResponse")) return source;
  if (/NextResponse\./.test(source.replace(/import[^;]+NextResponse[^;]+;/, ""))) {
    return source;
  }
  return source.replace(/import \{ NextResponse \} from "next\/server";\n?/g, "");
}

let updated = 0;

for (const file of walk(apiRoot)) {
  if (file.includes("_lib")) continue;
  let out = fs.readFileSync(file, "utf8");
  const before = out;

  out = out.replace(
    /return NextResponse\.json\(\{ data: ([^,]+?), error: null \}, \{ status: (\d+) \}\);/g,
    "return jsonDataResponse($1, $2);",
  );
  out = out.replace(
    /return NextResponse\.json\(\{ data, error: null \}, \{ status: (\d+) \}\);/g,
    "return jsonDataResponse(data, $1);",
  );
  out = out.replace(
    /return NextResponse\.json\(\{ data: ([^,]+?), error: null \}\);/g,
    "return jsonDataResponse($1);",
  );
  out = out.replace(
    /return NextResponse\.json\(\{ data, error: null \}\);/g,
    "return jsonDataResponse(data);",
  );

  out = out.replace(
    /return NextResponse\.json\(\s*\{\s*data: null,\s*error: \{\s*message: "([^"]+)",\s*status: (\d+),?\s*\},?\s*\},\s*\{ status: \2 \}\s*\);/gs,
    'return validationErrorResponse("$1", $2);',
  );

  if (out === before) continue;

  if (out.includes("jsonDataResponse(")) {
    out = ensureImport(out, "jsonDataResponse");
  }
  if (out.includes("validationErrorResponse(")) {
    out = ensureImport(out, "validationErrorResponse");
  }
  out = stripUnusedNextResponse(out);

  fs.writeFileSync(file, out);
  updated++;
  console.log("updated", file);
}

console.log("total", updated);
