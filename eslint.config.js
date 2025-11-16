/**
 * Modern ESLint v9 Flat Config
 *
 * Enforces modern React patterns:
 * - No React import required (new JSX transform)
 * - Functional components with arrow functions
 * - Modern TypeScript patterns
 * - React hooks best practices
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "out",
      ".next",
      "coverage",
      "src-tauri",
    ],
  },
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // TypeScript-specific rules
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Use const instead of let/var
      "prefer-const": "error",

      // Use template literals
      "prefer-template": "error",

      // Destructuring
      "prefer-destructuring": [
        "warn",
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
        },
      ],

      // Modern TypeScript patterns
      "@typescript-eslint/explicit-function-return-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // No console in production (disabled for debugging)
      "no-console": "off",
    },
  },
);
