/**
 * @workspace/ui must stay presentation-only (ARCHITECTURE.md §3.2).
 * Merged into react-internal config; effective when ESLint cwd is packages/ui.
 */
export const workspaceUiPresentationImportsBlock = [
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
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
                "@workspace/ui must not import Supabase clients; use @workspace/supabase in apps or composed packages (ARCHITECTURE.md §3.2).",
            },
          ],
        },
      ],
    },
  },
]
