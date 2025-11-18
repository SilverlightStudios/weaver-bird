import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/components": path.resolve(__dirname, "./src/ui/components"),
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@state": path.resolve(__dirname, "./src/state"),
      "@routes": path.resolve(__dirname, "./src/routes"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Use the modern Sass API to avoid deprecation warnings
        api: "modern-compiler",
      },
    },
  },
  server: {
    strictPort: true,
    port: 5173,
  },
  build: {
    target: "ES2020",
    minify: "terser",
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "**/__tests__",
      ],
    },
  },
});
