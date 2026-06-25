// SPA build for Capacitor (iOS / Android). Emits a static
// `dist-mobile/index.html` that the native shell loads from disk.
//
// This config is intentionally separate from `vite.config.ts` (which uses
// @lovable.dev/vite-tanstack-config for SSR/Nitro). Do NOT merge them — the
// TanStack Start plugin is SSR-only and does not emit an index.html.
import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, "src/routes"),
      generatedRouteTree: path.resolve(__dirname, "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist-mobile",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
  },
  define: {
    // TanStack Start exposes this at SSR time; stub it for the SPA build so
    // any guarded code that reads it does not crash at import time.
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV ?? "production",
    ),
  },
});
