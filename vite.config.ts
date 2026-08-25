import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  const envDefine: Record<string, string> = {};

  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const allEnv = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PROJECT_ID",
  ]) {
    if (allEnv[key]) envDefine[`process.env.${key}`] = JSON.stringify(allEnv[key]);
  }

  const plugins = [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    viteReact(),
  ];

  // Nitro packages the SSR/server build for Vercel (and other hosts).
  if (command === "build") {
    plugins.push(nitro({ preset: "vercel" }));
  }

  return {
    define: envDefine,
    plugins,
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
    },
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
  };
});
