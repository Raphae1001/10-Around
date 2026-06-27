// SPA build for Capacitor (iOS / Android). Emits a static
// `dist-mobile/index.html` that the native shell loads from disk.
//
// This config is intentionally separate from `vite.config.ts` (SSR/TanStack Start).
// Do NOT merge them — the TanStack Start plugin is SSR-only and does not emit an index.html.
import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig(({ mode }) => {
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
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
    define: {
      ...envDefine,
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    },
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(__dirname, "src") },
        {
          find: /^@tanstack\/react-start(\/.*)?$/,
          replacement: path.resolve(
            __dirname,
            "src/lib/mobile/tanstack-start-stub.ts",
          ),
        },
      ],
    },
    build: {
      outDir: "dist-mobile",
      emptyOutDir: true,
      target: "es2020",
      sourcemap: false,
    },
  };
});
