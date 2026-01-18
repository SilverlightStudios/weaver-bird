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
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

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

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",

      // Enforce one React component per file
      // This can only be disabled if the second component is necessary and extremely simple
      "react/no-multi-comp": ["error", { ignoreStateless: false }],
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

  // File size limits - enforce DRY, clean, concise code
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.fixture.{ts,tsx}", "**/generated/**"],
    rules: {
      // Max 300 lines per file - break down large files into child components
      // Organize as components/childcomponent/index.tsx and styles.module.tsx
      // Or separate into logic files. Keep code DRY, clean, and concise
      "max-lines": [
        "error",
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
);
