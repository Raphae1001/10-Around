import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmationPrompt } from "@/components/ConfirmationPrompt";
import { MinyanNotificationToast } from "@/components/MinyanNotificationToast";
import "@/i18n";
import { applySavedLang } from "@/i18n";
import { initTheme } from "@/hooks/use-theme";

// Apply saved theme synchronously before first paint to avoid flash
if (typeof window !== "undefined") initTheme();

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("common.pageNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.pageNotFoundDesc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("common.pageLoadFailed")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.pageLoadFailedDesc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("common.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

// Detect Capacitor at module init. On native, the WKWebView/Android WebView
// injects `window.Capacitor` BEFORE our bundle runs, so this check is safe
// even though it executes at import time. On SSR (no `window`) and on plain
// web (no `Capacitor` global), this is false.
//
// Why this matters: `shellComponent` renders a full <html><head><body> shell
// around the app. That is required for TanStack Start SSR (the dist/ build).
// But the Capacitor SPA build (dist-mobile/) already has its own index.html
// with <html>/<head>/<body>, so rendering the shell would nest a second
// <html>/<body> inside <div id="root">. The malformed DOM breaks the iOS
// Keyboard plugin and freezes inputs after the first keystroke.
const IS_CAPACITOR_RUNTIME =
  typeof window !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  !!(window as any).Capacitor &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Capacitor.isNativePlatform?.() === true;

const rootRouteOptions: Parameters<
  ReturnType<typeof createRootRouteWithContext<{ queryClient: QueryClient }>>
>[0] = {
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "MinyanNow — Start a minyan, anywhere, right now" },
      {
        name: "description",
        content:
          "Create or join a minyan right where you stand — street, airport, hotel, anywhere in the world.",
      },
      { name: "author", content: "MinyanNow" },
      { property: "og:title", content: "MinyanNow — Start a minyan, anywhere, right now" },
      {
        property: "og:description",
        content:
          "Create or join a minyan right where you stand — street, airport, hotel, anywhere in the world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "MinyanNow" },
      {
        name: "twitter:description",
        content: "Start a minyan right where you stand — in under 10 seconds.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
};

if (!IS_CAPACITOR_RUNTIME) {
  rootRouteOptions.shellComponent = RootShell;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(rootRouteOptions);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    applySavedLang();
  }, []);
  useEffect(() => {
    // Fire-and-forget analytics page_view on every route change. No-ops
    // when analytics is disabled or not configured. Lazy-imported so the
    // analytics module never blocks initial bundle.
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void import("@/lib/analytics").then(({ pageView }) => {
      if (cancelled) return;
      pageView(router.state.location.pathname);
      unsub = router.subscribe("onResolved", () => {
        pageView(router.state.location.pathname);
      });
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <ConfirmationPrompt />
      <MinyanNotificationToast />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
