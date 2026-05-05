import boundaries from "eslint-plugin-boundaries"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const configDir = dirname(fileURLToPath(import.meta.url))
/** Repo root: …/synapp (this file lives in packages/eslint-config). */
const monorepoRoot = resolve(configDir, "../..")

/**
 * Monorepo import boundaries (see ARCHITECTURE.md §3–4).
 * - Apps must not import sibling apps; share via packages/* only.
 * - Packages must not import apps/*.
 */
export const monorepoBoundariesBlock = [
  {
    files: ["**/*.{ts,tsx,mjs,cjs,js}"],
    settings: {
      "boundaries/elements": [
        { type: "package", pattern: "packages/*", mode: "folder", capture: ["pkg"] },
        { type: "app", pattern: "apps/*", mode: "folder", capture: ["appName"] },
      ],
      "boundaries/root-path": monorepoRoot,
      "boundaries/flag-as-external": {
        inNodeModules: true,
        unresolvableAlias: true,
        outsideRootPath: false,
      },
      "boundaries/legacy-templates": false,
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
        node: {
          extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"],
        },
      },
    },
    plugins: {
      boundaries,
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: { type: "app" },
              disallow: {
                to: {
                  type: "app",
                  captured: { appName: "!{{ from.captured.appName }}" },
                },
              },
              message:
                "Do not import another product under apps/. Share code through packages/* (ARCHITECTURE.md §3.1).",
            },
            {
              from: { type: "package" },
              disallow: { to: { type: "app" } },
              message:
                "Packages must not import application code under apps/ (ARCHITECTURE.md §3).",
            },
          ],
        },
      ],
    },
  },
]
