import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals"; // Import globals

export default tseslint.config(
  {
    // Configuration for main TypeScript source files (src)
    files: ["src/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.json"], // Explicitly point to root tsconfig
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: "module",
      ecmaVersion: 2022,
    },
    rules: {
      // General JS/TS Rules from guidelines
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-unused-vars": "off", // Use TS version
      complexity: ["error", { max: 10 }],
      "max-lines": [
        "warn",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["warn", 3],
      "max-params": ["warn", 4],
      // TypeScript Specific Rules from guidelines
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-use-before-define": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/prefer-readonly": "warn",
      // Disable potentially conflicting/handled rules
      curly: "off",
      semi: "off",
      "no-throw-literal": "off",
      "@typescript-eslint/naming-convention": "off", // Often too noisy
    },
  },
  {
    // Configuration for root-level JS/MJS config files
    files: ["*.js", "*.mjs"],
    extends: [eslint.configs.recommended],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        ...globals.node, // Add Node.js globals like require, process, __dirname etc.
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "@typescript-eslint/no-require-imports": "off", // CommonJS imports are fine in JS/MJS config files
      "@typescript-eslint/no-var-requires": "off", // Allow require
      "max-lines": "off",
      complexity: "off",
      "no-undef": "error",
    },
  },
  {
    // Configuration for root-level TS config files (*.config.ts, .*rc.ts)
    files: ["*.config.ts", ".*rc.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended, // Basic TS rules, no type checking
    ],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        // Add node globals here too if needed for TS configs
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "max-lines": "off",
      complexity: "off",
      "no-undef": "off", // TS should handle this via imports or globals
    },
  },
  {
    // Ignore webview-ui for now, as it requires separate setup (vue plugin, tsconfig)
    ignores: ["webview-ui/**"],
  },
  // Apply Prettier last
  eslintPluginPrettierRecommended,
);
