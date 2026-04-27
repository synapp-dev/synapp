/**
 * Walks Bullyproof source trees and writes docs/code-reference/_inventory.json
 * plus optional markdown skeleton snippets. Used by docs:code-reference:check.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BULLYPROOF_ROOT = path.resolve(__dirname, "..");
const DOCS_REF = path.join(BULLYPROOF_ROOT, "docs", "code-reference");
const INVENTORY_PATH = path.join(DOCS_REF, "_inventory.json");

type DocSection =
  | "01-app-routing"
  | "02-app-api"
  | "03-server"
  | "04-entities"
  | "05-components"
  | "06-hooks-stores-providers"
  | "07-lib-utils-types-config"
  | "08-drizzle-and-data"
  | "09-scripts-and-ops";

type InventoryEntry = {
  path: string;
  section: DocSection;
  kind: string;
  firstDocblock: string | null;
};

const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "coverage",
]);

function isSourceFile(file: string): boolean {
  return (
    file.endsWith(".ts") ||
    file.endsWith(".tsx") ||
    file.endsWith(".sql") ||
    file.endsWith(".mjs")
  );
}

function walkDir(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      walkDir(full, out);
    } else if (ent.isFile() && isSourceFile(ent.name)) {
      out.push(full);
    }
  }
}

function relativeToBullyproof(abs: string): string {
  return path.relative(BULLYPROOF_ROOT, abs).split(path.sep).join("/");
}

function extractFirstDocblock(source: string): string | null {
  const m = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!m) return null;
  const inner = m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trimEnd())
    .join("\n")
    .trim();
  return inner.length > 0 ? inner.slice(0, 500) : null;
}

function isBarrelOnlyReexport(source: string): boolean {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();
  if (!stripped) return true;
  const lines = stripped
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return true;
  return lines.every((l) => {
    return (
      /^export\s+(\{[\s\S]*\}|type\s+[\s\S]+|\*\s+as\s+\w+|\w+)\s+from\s+["'][^"']+["'];?$/.test(
        l,
      ) || /^export\s+type\s+[\s\S]+from\s+["'][^"']+["'];?$/.test(l)
    );
  });
}

function inferKind(relPath: string, basename: string): string {
  if (basename === "middleware.ts") return "Middleware";
  if (basename === "route.ts") return "API route";
  if (basename === "page.tsx" || basename === "page.ts") return "Page";
  if (basename === "layout.tsx" || basename === "layout.ts") return "Layout";
  if (basename === "template.tsx" || basename === "template.ts")
    return "Template";
  if (basename === "loading.tsx" || basename === "loading.ts")
    return "Loading UI";
  if (basename === "error.tsx" || basename === "error.ts") return "Error UI";
  if (basename === "not-found.tsx" || basename === "not-found.ts")
    return "Not found UI";
  if (/\.repo\.ts$/.test(basename)) return "Repository";
  if (/\.service\.ts$/.test(basename)) return "Service";
  if (/\.validators\.ts$/.test(basename)) return "Validators";
  if (relPath.includes("/server/lib/")) return "Server lib";
  if (relPath.includes("/server/auth/")) return "Auth";
  if (relPath.includes("/server/db/")) return "DB wiring";
  if (relPath.includes("/entities/") && relPath.includes("/api/"))
    return "Client API";
  if (relPath.includes("/entities/") && relPath.includes("/ui/"))
    return "Feature UI";
  if (relPath.includes("/entities/") && relPath.includes("/model/"))
    return "Model / queries";
  if (relPath.startsWith("components/atoms/")) return "Atom";
  if (relPath.startsWith("components/molecules/")) return "Molecule";
  if (relPath.startsWith("components/organisms/")) return "Organism";
  if (relPath.startsWith("components/templates/")) return "Template UI";
  if (relPath.startsWith("hooks/")) return "Hook";
  if (relPath.startsWith("stores/")) return "Store";
  if (relPath.startsWith("providers/")) return "Provider";
  if (relPath.startsWith("types/")) return "Types";
  if (relPath.startsWith("config/")) return "Config";
  if (relPath.startsWith("lib/")) return "Lib";
  if (relPath.startsWith("utils/")) return "Util";
  if (basename === "next.config.mjs") return "Next config";
  if (basename === "drizzle.config.ts") return "Drizzle config";
  if (relPath.startsWith("drizzle/") && basename.endsWith(".sql"))
    return "SQL migration";
  if (relPath === "drizzle/schema.ts") return "Drizzle schema";
  if (relPath === "drizzle/relations.ts") return "Drizzle relations";
  if (relPath.startsWith("scripts/")) return "Script";
  if (relPath.startsWith("server/migrations/")) return "Server migration script";
  return "Module";
}

function sectionForPath(relPath: string): DocSection | null {
  if (relPath.startsWith("app/api/")) return "02-app-api";
  if (relPath.startsWith("app/")) return "01-app-routing";
  if (relPath.startsWith("server/")) {
    if (relPath.startsWith("server/migrations/")) return "09-scripts-and-ops";
    return "03-server";
  }
  if (relPath.startsWith("entities/")) return "04-entities";
  if (relPath.startsWith("components/")) return "05-components";
  if (
    relPath.startsWith("hooks/") ||
    relPath.startsWith("stores/") ||
    relPath.startsWith("providers/")
  ) {
    return "06-hooks-stores-providers";
  }
  if (
    relPath.startsWith("lib/") ||
    relPath.startsWith("utils/") ||
    relPath.startsWith("types/") ||
    relPath.startsWith("config/") ||
    relPath === "middleware.ts" ||
    relPath === "next.config.mjs" ||
    relPath === "drizzle.config.ts"
  ) {
    return "07-lib-utils-types-config";
  }
  if (relPath.startsWith("drizzle/")) return "08-drizzle-and-data";
  if (relPath.startsWith("scripts/")) return "09-scripts-and-ops";
  return null;
}

function heuristicSummary(entry: InventoryEntry): string {
  const { path: p, kind, section } = entry;
  const base = path.posix.basename(p);
  const dir = path.posix
    .dirname(p)
    .split("/")
    .filter(Boolean)
    .slice(-2)
    .join("/");

  if (kind === "Barrel")
    return `Re-exports symbols from sibling modules under \`${dir}\`.`;

  if (section === "02-app-api") {
    return `App Router HTTP handler at \`/api/${p.replace(/^app\/api\//, "").replace(/\/route\.ts$/, "")}\`. Implements request handling for this API surface.`;
  }

  if (kind === "Page") {
    return `Renders the UI for the route matching this \`page\` segment under the App Router (\`${dir}\`).`;
  }
  if (kind === "Layout") {
    return `Shared layout shell for nested routes under \`${dir}\`.`;
  }

  if (kind === "Repository") {
    return `Data access for ${base.replace(".repo.ts", "")} persistence (Drizzle queries and commands).`;
  }
  if (kind === "Service") {
    return `Domain orchestration and business rules for ${base.replace(".service.ts", "")}.`;
  }
  if (kind === "Validators") {
    return `Zod (or similar) validation schemas and helpers for ${base.replace(".validators.ts", "")} inputs and outputs.`;
  }

  if (kind === "Client API") {
    return `Typed client helpers and fetchers for entity APIs related to \`${p}\`.`;
  }
  if (kind === "Feature UI") {
    return `Feature-scoped UI for the Bullyproof domain tied to \`${p}\`.`;
  }

  if (["Atom", "Molecule", "Organism", "Template UI"].includes(kind)) {
    return `Shared ${kind.toLowerCase()} UI: \`${base}\`.`;
  }

  if (kind === "Hook") return `React hook: \`${base}\`.`;
  if (kind === "Store") return `Zustand (or similar) client store: \`${base}\`.`;
  if (kind === "Provider") return `React context/provider wiring: \`${base}\`.`;
  if (kind === "SQL migration")
    return `Postgres migration applied via Drizzle tooling: \`${base}\`.`;

  return `Source module \`${p}\` (${kind}).`;
}

function collectInventory(): InventoryEntry[] {
  const roots = [
    path.join(BULLYPROOF_ROOT, "app"),
    path.join(BULLYPROOF_ROOT, "server"),
    path.join(BULLYPROOF_ROOT, "entities"),
    path.join(BULLYPROOF_ROOT, "components"),
    path.join(BULLYPROOF_ROOT, "hooks"),
    path.join(BULLYPROOF_ROOT, "stores"),
    path.join(BULLYPROOF_ROOT, "providers"),
    path.join(BULLYPROOF_ROOT, "lib"),
    path.join(BULLYPROOF_ROOT, "utils"),
    path.join(BULLYPROOF_ROOT, "types"),
    path.join(BULLYPROOF_ROOT, "config"),
    path.join(BULLYPROOF_ROOT, "drizzle"),
    path.join(BULLYPROOF_ROOT, "scripts"),
  ];

  const absFiles: string[] = [];
  for (const root of roots) {
    if (fs.existsSync(root)) walkDir(root, absFiles);
  }

  const rootFiles = ["middleware.ts", "next.config.mjs", "drizzle.config.ts"];
  for (const rf of rootFiles) {
    const abs = path.join(BULLYPROOF_ROOT, rf);
    if (fs.existsSync(abs)) absFiles.push(abs);
  }

  const seen = new Set<string>();
  const entries: InventoryEntry[] = [];

  for (const abs of absFiles) {
    const rel = relativeToBullyproof(abs);
    if (rel.startsWith("docs/")) continue;
    const section = sectionForPath(rel);
    if (!section) continue;
    if (seen.has(rel)) continue;
    seen.add(rel);

    let source = "";
    try {
      source = fs.readFileSync(abs, "utf8");
    } catch {
      source = "";
    }

    const base = path.basename(rel);
    let kind = inferKind(rel, base);
    if (
      (base === "index.ts" || base === "index.tsx") &&
      isBarrelOnlyReexport(source)
    ) {
      kind = "Barrel";
    }

    entries.push({
      path: rel,
      section,
      kind,
      firstDocblock: extractFirstDocblock(source),
    });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

function loadDocMarkdownPaths(): string[] {
  if (!fs.existsSync(DOCS_REF)) return [];
  return fs
    .readdirSync(DOCS_REF)
    .filter(
      (f) =>
        f.endsWith(".md") &&
        f !== "README.md" &&
        !f.startsWith("_") &&
        /^\d{2}-/.test(f),
    )
    .map((f) => path.join(DOCS_REF, f));
}

/** Paths documented as `**Path**:` `relative/path` in markdown */
function documentedPathsFromMarkdown(): Set<string> {
  const set = new Set<string>();
  const files = loadDocMarkdownPaths();
  const re = /\*\*Path\*\*:\s*`([^`]+)`/g;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      set.add(m[1].trim());
    }
  }
  return set;
}

const mode = process.argv[2] ?? "write";

const inventory = collectInventory();

const bySection = inventory.reduce(
  (acc, e) => {
    acc[e.section] ??= [];
    acc[e.section].push(e);
    return acc;
  },
  {} as Record<DocSection, InventoryEntry[]>,
);

if (mode === "check") {
  const docPaths = documentedPathsFromMarkdown();
  const invPaths = new Set(inventory.map((e) => e.path));
  const missingInDocs: string[] = [];
  for (const p of invPaths) {
    if (!docPaths.has(p)) missingInDocs.push(p);
  }
  missingInDocs.sort();
  const extraInDocs: string[] = [];
  for (const p of docPaths) {
    if (!invPaths.has(p)) extraInDocs.push(p);
  }
  extraInDocs.sort();

  if (missingInDocs.length > 0) {
    console.error(
      `docs:code-reference:check FAILED — ${missingInDocs.length} inventory path(s) missing **Path** in markdown:\n`,
    );
    for (const p of missingInDocs.slice(0, 50)) console.error("  ", p);
    if (missingInDocs.length > 50)
      console.error(`  ... and ${missingInDocs.length - 50} more`);
    process.exit(1);
  }
  if (extraInDocs.length > 0) {
    console.warn(
      "Warning: markdown documents paths not in current inventory:",
    );
    for (const p of extraInDocs.slice(0, 20)) console.warn("  ", p);
  }
  console.log(
    `OK: all ${invPaths.size} inventory paths are documented in code-reference markdown.`,
  );
  process.exit(0);
}

fs.mkdirSync(DOCS_REF, { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  bullyproofRoot: "apps/bullyproof",
  entries: inventory,
  bySection,
};

fs.writeFileSync(INVENTORY_PATH, JSON.stringify(payload, null, 2), "utf8");
console.log(`Wrote ${inventory.length} entries to ${INVENTORY_PATH}`);

function entryBlock(e: InventoryEntry): string {
  const sum = heuristicSummary(e);
  const doc = e.firstDocblock
    ? ` Code comment: ${e.firstDocblock.replace(/\s+/g, " ").slice(0, 200)}${e.firstDocblock.length > 200 ? "…" : ""}`
    : "";
  return [
    `### \`${e.path}\``,
    "",
    `- **Path**: \`${e.path}\``,
    `- **Kind**: ${e.kind}`,
    `- **Summary**: ${sum}${doc}`,
    "",
  ].join("\n");
}

function sectionTitle(section: DocSection): string {
  const titles: Record<DocSection, string> = {
    "01-app-routing": "App Router UI (pages, layouts, colocated TSX)",
    "02-app-api": "App Router API routes",
    "03-server": "Server layer (repos, services, validators)",
    "04-entities": "Feature entities (API clients, UI, model)",
    "05-components": "Shared components (atomic design)",
    "06-hooks-stores-providers": "Hooks, stores, providers",
    "07-lib-utils-types-config": "Lib, utils, types, config, app wiring",
    "08-drizzle-and-data": "Drizzle schema and SQL migrations",
    "09-scripts-and-ops": "Scripts and maintenance tools",
  };
  return titles[section];
}

function writeSectionMarkdown(section: DocSection, list: InventoryEntry[]): void {
  const fileBase = `${section}.md`;
  const outPath = path.join(DOCS_REF, fileBase);
  const lines: string[] = [
    `# ${sectionTitle(section)}`,
    "",
    "This file is generated from `_inventory.json` by `pnpm docs:code-reference:generate`. Edit `scripts/generate-code-reference-inventory.ts` heuristics or add code comments to improve summaries, then regenerate.",
    "",
    `## Entries (${list.length})`,
    "",
  ];
  for (const e of list) lines.push(entryBlock(e));
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${list.length} entries → ${fileBase}`);
}

if (mode === "markdown" || mode === "write+markdown") {
  fs.mkdirSync(DOCS_REF, { recursive: true });
  const sections: DocSection[] = [
    "01-app-routing",
    "02-app-api",
    "03-server",
    "04-entities",
    "05-components",
    "06-hooks-stores-providers",
    "07-lib-utils-types-config",
    "08-drizzle-and-data",
    "09-scripts-and-ops",
  ];
  for (const s of sections) {
    writeSectionMarkdown(s, bySection[s] ?? []);
  }
  if (mode === "write+markdown") {
    // already wrote inventory above
  }
  if (mode === "markdown") process.exit(0);
}
