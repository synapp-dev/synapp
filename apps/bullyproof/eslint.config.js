import { nextJsConfig } from "@workspace/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: [
      "drizzle/schema.ts",
      "drizzle/relations.ts",
      "drizzle/**/*.ts",
      // Vendored/minified static assets (e.g. pdf.js worker) are not our source.
      "public/**",
    ],
  },
  {
    files: [
      "entities/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*"],
              message:
                "Do not import server modules in client code. Use @/lib/, @/types/, or entity model types.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      // Allow an underscore prefix to mark an intentionally-unused binding
      // (e.g. a parameter kept for a shared signature/API contract). Genuinely
      // dead imports and locals must still be removed, not underscored.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
];
