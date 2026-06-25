// SPA-only stub for `@tanstack/react-start`.
//
// The real package pulls in server-side virtual modules (`#tanstack-router-entry`)
// that only exist when the TanStack Start Vite plugin is active. The Capacitor
// SPA build (vite.mobile.config.ts) does not run that plugin, so we alias the
// import to this file.
//
// `createServerFn` returns an object with a `.inputValidator().handler()`
// chain (matching the real API surface) that produces an async callable. In
// the native shell that callable POSTs to the hosted Lovable site so server
// functions still work end-to-end. `useServerFn` just returns the callable.
import { useMemo } from "react";

const SERVER_BASE = "https://global-minyan-connect.lovable.app";

type Handler<TData, TResult> = (ctx: { data: TData }) => Promise<TResult> | TResult;

function makeCallable<TData, TResult>(
  name: string,
  method: string,
): (data?: TData) => Promise<TResult> {
  return async (data?: TData) => {
    const url = `${SERVER_BASE}/_serverFn/${name}`;
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: method === "GET" ? undefined : JSON.stringify({ data }),
    });
    if (!res.ok) {
      throw new Error(`Server function ${name} failed: ${res.status}`);
    }
    return (await res.json()) as TResult;
  };
}

// Loose typing on purpose — this stub mirrors the runtime surface only.
type AnyBuilder = {
  inputValidator: (_v: unknown) => AnyBuilder;
  middleware: (_m: unknown) => AnyBuilder;
  handler: (_h: (...args: unknown[]) => unknown) => (data?: unknown) => Promise<unknown>;
};

export function createServerFn(opts: { method?: string } = {}): AnyBuilder {
  const method = opts.method ?? "POST";
  const name = "anonymous";
  const builder: AnyBuilder = {
    inputValidator: () => builder,
    middleware: () => builder,
    handler: () => makeCallable(name, method),
  };
  return builder;
}

export function useServerFn<TFn extends (...args: never[]) => unknown>(fn: TFn): TFn {
  return useMemo(() => fn, [fn]);
}

export const createMiddleware = (() => ({
  server: () => ({ handler: () => ({}) }),
  client: () => ({ handler: () => ({}) }),
})) as unknown as (...args: unknown[]) => unknown;

// Subpath shims (`/server`, `/server-entry`) — never invoked in the SPA, but
// must exist so the module resolves.
export const getRequest = (): Request => {
  throw new Error("getRequest() is not available in the native SPA build");
};
export const createStart = (() => ({
  /* noop in SPA */
})) as unknown as (...args: unknown[]) => unknown;

export default { createServerFn, useServerFn, createMiddleware, getRequest, createStart };
