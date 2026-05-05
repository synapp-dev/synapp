/**
 * ESLint flat config: **architecture boundaries only** (no eslint-plugin-only-warn).
 * Run via `pnpm lint:architecture` so sibling-app imports and @workspace/ui → Supabase
 * violations fail CI with real severity (see ARCHITECTURE.md §4).
 */
import tsParser from "@typescript-eslint/parser"
import { monorepoBoundariesBlock } from "./packages/eslint-config/monorepo-boundaries.js"

const tsLanguageOptions = {
  parser: tsParser,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
}

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/out/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
  ...monorepoBoundariesBlock.map((block) => ({
    ...block,
    files: [
      "apps/**/*.{ts,tsx,mts,cts,mjs,cjs,js}",
      "packages/*/src/**/*.{ts,tsx,mts,cts,mjs,cjs,js}",
    ],
    languageOptions: {
      ...block.languageOptions,
      ...tsLanguageOptions,
    },
  })),
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    languageOptions: tsLanguageOptions,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@workspace/supabase",
              message:
                "@workspace/ui must not depend on @workspace/supabase (ARCHITECTURE.md §3.2).",
            },
          ],
          patterns: [
            {
              group: ["@supabase/*"],
              message:
                "@workspace/ui must not import Supabase clients (ARCHITECTURE.md §3.2).",
            },
          ],
        },
      ],
    },
  },
]
