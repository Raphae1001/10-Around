import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      // Native platform projects (Java/Kotlin/Swift/Obj-C + vendored deps)
      // and build output — never TS/TSX source, just costly to traverse.
      "android",
      "ios",
      "dist-mobile",
      ".vercel",
      ".tanstack",
      ".lovable",
      ".cursor",
      // Stray nested git worktree left over from an earlier session — a
      // full duplicate checkout (its own src/, android/, ios/, ...), not
      // something this project's lint should ever scan.
      ".claude/worktrees",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Not "error" yet: ~49 existing `any` usages (untyped RPC casts,
      // third-party globals) are a planned follow-up cleanup, not something
      // this CI should block on before that pass happens.
      "@typescript-eslint/no-explicit-any": "warn",
      // Not "error" yet: this is what would catch dead code creep going
      // forward, but flipping it on before the dead-code cleanup pass would
      // immediately flood CI with pre-existing findings unrelated to a given
      // change. Warn keeps it visible without blocking today.
      "@typescript-eslint/no-unused-vars": "warn",
      // `catch {}` is used deliberately throughout (localStorage unavailable
      // in private browsing, best-effort query cancellation, etc.) — allow
      // it without requiring a comment in every block.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // Google Analytics' and Microsoft Clarity's official bootstrap snippets
    // use `arguments` verbatim — not a style choice we can rewrite without
    // diverging from the vendor snippet.
    files: ["src/lib/analytics.ts"],
    rules: {
      "prefer-rest-params": "off",
    },
  },
  eslintPluginPrettier,
);
