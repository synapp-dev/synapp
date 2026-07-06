import { nextJsConfig } from "@workspace/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: ["drizzle/schema.ts", "drizzle/relations.ts", "drizzle/**/*.ts"],
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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
];
