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
      "**/__mocks__/**",
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

  // Story files can have multiple components for documentation
  {
    files: ["**/*.stories.{ts,tsx}"],
    rules: {
      "react/no-multi-comp": "off",
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
          ignoreRestSiblings: false, // Strict: catch unused rest siblings (often dead code)
        },
      ],

      // Dead code rules
      "no-unreachable": "error",
      "no-unused-expressions": "error",
      "no-constant-condition": "error",
      "no-constant-binary-expression": "error",
      "no-unreachable-loop": "error",

      // No console in production (disabled for debugging)
      "no-console": "off",

      // Limit cyclomatic complexity - encourages breaking down complex functions
      "complexity": ["warn", 15],

      // Prevent unhandled promises - critical for Tauri/Rust backend calls
      "@typescript-eslint/no-floating-promises": "error",

      // Use ?? instead of || for null/undefined checks
      "@typescript-eslint/prefer-nullish-coalescing": "warn",

      // Limit nesting depth - improves readability
      "max-depth": ["warn", 4],

      // Always use === and !== instead of == and !=, except for null checks
      "eqeqeq": ["error", "always", { "null": "ignore" }],

      // Prevent inline type imports - use top-level imports instead
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          "prefer": "type-imports",
          "disallowTypeAnnotations": true,
          "fixStyle": "separate-type-imports"
        }
      ],
    },
  },

  // File size limits - enforce DRY, clean, concise code
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.fixture.{ts,tsx}", "**/*.stories.{ts,tsx}", "**/generated/**", "**/generated.ts", "**/*.generated.ts", "**/constants/**", "**/docs/**"],
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
