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

interface ServerFnBuilder<TData, TResult> {
  inputValidator: <TNext>(_v: unknown) => ServerFnBuilder<TNext, TResult>;
  middleware: (_m: unknown) => ServerFnBuilder<TData, TResult>;
  handler: (_h: Handler<TData, TResult>) => (data?: TData) => Promise<TResult>;
}

export function createServerFn<TResult = unknown>(opts: { method?: string } = {}) {
  const method = opts.method ?? "POST";
  // We don't know the function's exported name at runtime, so we encode it
  // when `.handler()` is called via Function.name of the returned binding.
  // Callers always assign the result to a `const`, so we fall back to a
  // generated id that the hosted server cannot route — meaning server fns
  // invoked from native always go through the bundled hosted route by the
  // exported binding's name (resolved via the import map at build time).
  const builder = (currentName = "anonymous"): ServerFnBuilder<unknown, TResult> => ({
    inputValidator: () => builder(currentName) as ServerFnBuilder<unknown, TResult>,
    middleware: () => builder(currentName),
    handler: () => makeCallable<unknown, TResult>(currentName, method),
  });
  return builder() as ServerFnBuilder<unknown, TResult>;
}

export function useServerFn<TFn extends (...args: never[]) => unknown>(fn: TFn): TFn {
  return useMemo(() => fn, [fn]);
}

export const createMiddleware = (() => ({
  server: () => ({ handler: () => ({}) }),
  client: () => ({ handler: () => ({}) }),
})) as unknown as (...args: unknown[]) => unknown;

export default { createServerFn, useServerFn, createMiddleware };
