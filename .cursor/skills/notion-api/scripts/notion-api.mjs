#!/usr/bin/env node
/**
 * Notion Internal Connection CLI — one token per workspace via env.
 * Usage: node notion-api.mjs --workspace supersolt search "Module Overview"
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const NOTION_VERSION = "2022-06-28";
const BASE = "https://api.notion.com/v1";

const WORKSPACE_ENV = {
  supersolt: "NOTION_SUPERSOLT_TOKEN",
  bullyproof: "NOTION_BULLYPROOF_TOKEN",
};

loadEnvFile(join(homedir(), ".cursor", "notion.env"));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const args = [...argv];
  let workspace = null;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--workspace" || args[i] === "-w") {
      workspace = args[++i];
    } else if (args[i] === "--json") {
      rest.push("--json");
    } else {
      rest.push(args[i]);
    }
  }
  return { workspace, rest, json: rest.includes("--json") };
}

function tokenFor(workspace) {
  const key = WORKSPACE_ENV[workspace];
  if (!key) {
    console.error(`Unknown workspace "${workspace}". Use: ${Object.keys(WORKSPACE_ENV).join(", ")}`);
    process.exit(1);
  }
  const token = process.env[key];
  if (!token) {
    console.error(`Missing ${key}. Add it to ~/.cursor/notion.env — see workspaces.md`);
    process.exit(1);
  }
  return token;
}

function uuidFromInput(input) {
  if (!input) return null;
  const hex32 = input.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(hex32)) {
    return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-${hex32.slice(12, 16)}-${hex32.slice(16, 20)}-${hex32.slice(20)}`;
  }
  const m = input.match(/([0-9a-f]{32})/i);
  if (m) return uuidFromInput(m[1]);
  return null;
}

async function notion(token, path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.message || res.statusText;
    console.error(`Notion API ${res.status}: ${msg}`);
    if (body.code) console.error(`  code: ${body.code}`);
    process.exit(1);
  }
  return body;
}

function richText(rt = []) {
  return rt.map((t) => t.plain_text || "").join("");
}

function blockToLines(block, depth = 0) {
  const indent = "  ".repeat(depth);
  const type = block.type;
  const payload = block[type];
  if (!payload) return [];

  const lines = [];
  switch (type) {
    case "paragraph":
    case "quote":
    case "callout":
      lines.push(`${indent}${richText(payload.rich_text)}`);
      break;
    case "heading_1":
      lines.push(`${indent}# ${richText(payload.rich_text)}`);
      break;
    case "heading_2":
      lines.push(`${indent}## ${richText(payload.rich_text)}`);
      break;
    case "heading_3":
      lines.push(`${indent}### ${richText(payload.rich_text)}`);
      break;
    case "bulleted_list_item":
    case "numbered_list_item":
      lines.push(`${indent}- ${richText(payload.rich_text)}`);
      break;
    case "to_do":
      lines.push(`${indent}- [${payload.checked ? "x" : " "}] ${richText(payload.rich_text)}`);
      break;
    case "code":
      lines.push(`${indent}\`\`\`${payload.language || ""}\n${richText(payload.rich_text)}\n${indent}\`\`\``);
      break;
    case "divider":
      lines.push(`${indent}---`);
      break;
    case "child_page":
      lines.push(`${indent}[Child page: ${payload.title}]`);
      break;
    case "child_database":
      lines.push(`${indent}[Child database: ${payload.title}]`);
      break;
    default:
      if (payload.rich_text) lines.push(`${indent}${richText(payload.rich_text)}`);
  }
  return lines;
}

async function fetchBlockTree(token, blockId, depth = 0) {
  const lines = [];
  let cursor;
  do {
    const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : "?page_size=100";
    const data = await notion(token, `/blocks/${blockId}/children${qs}`);
    for (const block of data.results || []) {
      lines.push(...blockToLines(block, depth));
      if (block.has_children) {
        lines.push(...(await fetchBlockTree(token, block.id, depth + 1)));
      }
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return lines;
}

async function cmdMe(token) {
  return notion(token, "/users/me");
}

async function cmdSearch(token, query) {
  return notion(token, "/search", {
    method: "POST",
    body: JSON.stringify({ query, page_size: 20 }),
  });
}

async function cmdPage(token, idOrUrl) {
  const id = uuidFromInput(idOrUrl);
  if (!id) {
    console.error("Could not parse page UUID from:", idOrUrl);
    process.exit(1);
  }
  const page = await notion(token, `/pages/${id}`);
  const body = (await fetchBlockTree(token, id)).join("\n");
  return { page, body };
}

async function cmdDatabase(token, idOrUrl, filterJson) {
  const id = uuidFromInput(idOrUrl);
  if (!id) {
    console.error("Could not parse database UUID from:", idOrUrl);
    process.exit(1);
  }
  const body = { page_size: 100 };
  if (filterJson) body.filter = JSON.parse(filterJson);
  return notion(token, `/databases/${id}/query`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function printSearch(data) {
  for (const r of data.results || []) {
    const title =
      r.properties?.Name?.title?.[0]?.plain_text ||
      r.properties?.title?.title?.[0]?.plain_text ||
      r.title?.[0]?.plain_text ||
      r.object;
    console.log(`${r.id}\t${title}\t${r.url || ""}`);
  }
}

function printPage(data) {
  const title =
    data.page.properties?.title?.title?.[0]?.plain_text ||
    data.page.properties?.Name?.title?.[0]?.plain_text ||
    "(untitled)";
  console.log(`# ${title}`);
  console.log(`id: ${data.page.id}`);
  console.log(`url: ${data.page.url}`);
  console.log(`last_edited: ${data.page.last_edited_time}`);
  console.log("");
  console.log(data.body);
}

function printDbQuery(data) {
  for (const row of data.results || []) {
    const name =
      row.properties?.Name?.title?.[0]?.plain_text ||
      row.properties?.title?.title?.[0]?.plain_text ||
      row.id;
    console.log(`${row.id}\t${name}\t${row.url}`);
  }
  if (data.has_more) console.error("\n(has_more — paginate with start_cursor in a follow-up call)");
}

async function main() {
  const { workspace, rest, json } = parseArgs(process.argv.slice(2));
  if (!workspace) {
    console.error(`Usage: node notion-api.mjs --workspace ${Object.keys(WORKSPACE_ENV).join("|")} <command> [args]

Commands:
  me                          — verify token + bot user
  search <query>              — workspace search
  page <uuid-or-url>          — page metadata + body as markdown-ish text
  database <uuid> [filterJson] — query database rows
`);
    process.exit(1);
  }

  const token = tokenFor(workspace);
  const [cmd, ...cmdArgs] = rest.filter((a) => a !== "--json");

  let result;
  switch (cmd) {
    case "me":
      result = await cmdMe(token);
      break;
    case "search":
      result = await cmdSearch(token, cmdArgs.join(" ") || "");
      break;
    case "page":
      result = await cmdPage(token, cmdArgs[0]);
      break;
    case "database":
      result = await cmdDatabase(token, cmdArgs[0], cmdArgs[1]);
      break;
    default:
      console.error(`Unknown command: ${cmd || "(none)"}`);
      process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === "me") {
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === "search") {
    printSearch(result);
  } else if (cmd === "page") {
    printPage(result);
  } else if (cmd === "database") {
    printDbQuery(result);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
