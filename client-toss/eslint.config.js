import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/shared/lib/*"],
              message: "shared/lib는 @/shared/lib를 통해 import하세요.",
            },
            {
              group: ["@/shared/ui/*/*", "@/shared/assets/*/*"],
              message:
                "shared 슬라이스는 public API(index.ts)를 통해 import하세요. (예: @/shared/ui/score)",
            },
            {
              group: ["@/feature/*/*"],
              message:
                "feature는 슬라이스 단위 public API(index.ts)를 통해 import하세요. (예: @/feature/drawing)",
            },
            {
              group: ["@/entities/*/*"],
              message:
                "entities는 슬라이스 단위 public API(index.ts)를 통해 import하세요. (예: @/entities/phaseHeader)",
            },
            {
              group: ["@/views/*/*"],
              message:
                "views는 슬라이스 단위 public API(index.ts)를 통해 import하세요. (예: @/views/drawing)",
            },
          ],
        },
      ],
    },
  },
]);
