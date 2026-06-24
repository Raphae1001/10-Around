/**
 * Open a URL in a real external browser tab — never inside the current
 * iframe / preview / webview. Must be called from a user gesture.
 *
 * Strategy: create a transient <a target="_blank" rel="noopener noreferrer">
 * and click it. This bypasses popup blockers better than window.open and,
 * crucially, escapes the Lovable preview iframe (where window.open() can
 * be intercepted and end up navigating the iframe itself, which then
 * triggers ERR_BLOCKED_BY_RESPONSE for sites like maps.google.com or
 * web.whatsapp.com that refuse to be framed).
 *
 * For custom schemes (whatsapp://, tel:, mailto:) we use top-frame
 * navigation since _blank does nothing with non-http schemes.
 */
export function openExternal(url: string): boolean {
  if (typeof window === "undefined") return false;
  const isHttp = /^https?:\/\//i.test(url);

  // Custom schemes (whatsapp://, geo:, tel:, mailto:) — navigate top frame.
  if (!isHttp) {
    try {
      // window.top may be cross-origin (preview iframe) — assigning .location
      // still works for navigation in most browsers.
      (window.top ?? window).location.href = url;
      return true;
    } catch {
      try { window.location.href = url; return true; } catch { return false; }
    }
  }

  // http(s) — use a transient anchor with _blank.
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      return !!w;
    } catch { return false; }
  }
}
