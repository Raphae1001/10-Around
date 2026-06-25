// Capacitor / SPA bootstrap entry. Used by `vite.mobile.config.ts` to
// produce a static `dist-mobile/index.html` that Capacitor loads from disk.
// The SSR/Nitro build (vite.config.ts → dist/) is unchanged and still powers
// the hosted web deployment.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "./styles.css";
import "./i18n";
import { getRouter } from "./router";

const router = getRouter();

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
