import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Components must go through lib/api hooks, never raw JSON.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/mocks/mock-data.json"],
              message: "Import data through lib/api hooks, not the mock JSON.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/mock/**", "tests/**"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
