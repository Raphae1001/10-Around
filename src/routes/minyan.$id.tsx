/**
 * Shareable deep-link route: /minyan/{id}
 * Re-renders the same details UI by redirecting to /minyan?id=...
 * so we don't duplicate the (large) Details component.
 */
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/minyan/$id")({
  component: MinyanDeepLink,
});

function MinyanDeepLink() {
  const { id } = Route.useParams();
  return <Navigate to="/minyan" search={{ id }} replace />;
}
