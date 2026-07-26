/**
 * Public, logged-out-safe landing page for a shared minyan link
 * (`{appOrigin}/minyan/{id}`, the exact URL src/lib/share.ts generates).
 *
 * If the app is installed, iOS/Android universal links intercept this URL
 * before it ever loads and open the real in-app details screen instead —
 * this route only renders for people without the app (or link-preview
 * crawlers like WhatsApp's, which never run JS and need the head() tags
 * below present in the initial server-rendered HTML).
 *
 * Deliberately reads only public_minyan_summary() — coarse fields, never
 * exact address/lat-lng/creator_id — so this page can't be used to bulk-scrape
 * what the RLS fix in 20260726121500_close_world_read_rls.sql just closed.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { appOrigin } from "@/lib/share";
import { Logo } from "@/components/Logo";
import { BRAND_BLUE, BRAND_TEXT, BRAND_TEXT_SOFT } from "@/lib/brand";

type PublicSummary = {
  id: string;
  type: "street" | "stay" | "scheduled";
  prayer: "shacharit" | "mincha" | "arvit" | "maariv" | "other";
  city: string | null;
  present_count: number;
  scheduled_at: string | null;
  confirmed_at: string | null;
  is_live: boolean;
  expires_at: string;
} | null;

const PRAYER_LABEL: Record<string, string> = {
  shacharit: "Shacharit",
  mincha: "Mincha",
  arvit: "Maariv",
  maariv: "Maariv",
  other: "Prayer",
};

const NEEDED = 10;

export const Route = createFileRoute("/minyan_/$id")({
  ssr: true,
  loader: async ({ params }): Promise<PublicSummary> => {
    const { data } = await supabase
      .rpc("public_minyan_summary", { _id: params.id })
      .maybeSingle();
    return (data as PublicSummary) ?? null;
  },
  head: ({ loaderData, params }) => {
    const m = loaderData;
    const url = `${appOrigin()}/minyan/${params.id}`;
    if (!m) {
      return {
        meta: [
          { title: "Minyan — MinyanNow" },
          { name: "description", content: "Join a minyan on MinyanNow." },
        ],
      };
    }
    const prayerLabel = PRAYER_LABEL[m.prayer] ?? "Minyan";
    const title = `${m.present_count}/${NEEDED} · ${prayerLabel}${m.city ? " · " + m.city : ""}`;
    const description = m.confirmed_at
      ? "This minyan is confirmed — join now on MinyanNow."
      : `${m.present_count}/${NEEDED} confirmed so far — help make the minyan on MinyanNow.`;
    return {
      meta: [
        { title: `${title} — MinyanNow` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: `${appOrigin()}/icon-512.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: PublicMinyanPage,
});

function PublicMinyanPage() {
  const m = Route.useLoaderData();
  const { id } = Route.useParams();

  if (!m) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center px-8 text-center bg-background">
        <Logo size={56} />
        <h1 className="font-semibold text-xl mt-6" style={{ color: BRAND_TEXT }}>
          This minyan is no longer available.
        </h1>
        <Link to="/" className="mt-6 text-sm underline" style={{ color: BRAND_BLUE }}>
          Open MinyanNow
        </Link>
      </div>
    );
  }

  const count = m.present_count ?? 0;
  const confirmed = !!m.confirmed_at || count >= NEEDED;
  const prayerLabel = PRAYER_LABEL[m.prayer] ?? "Minyan";
  const inAppUrl = `/minyan?id=${encodeURIComponent(id)}`;

  return (
    <div className="min-h-dvh w-full flex flex-col items-center px-6 pt-14 pb-10 text-center bg-background">
      <Logo size={56} />

      <div
        className="font-semibold text-6xl leading-none tabular-nums mt-8"
        style={{ color: BRAND_BLUE }}
      >
        {count}
        <span className="opacity-40">/{NEEDED}</span>
      </div>
      <div
        className="text-xs uppercase tracking-[0.25em] mt-3"
        style={{ color: BRAND_TEXT_SOFT }}
      >
        {confirmed ? "Confirmed minyan" : "Forming now"}
      </div>

      <h1 className="font-semibold text-2xl mt-6 max-w-xs" style={{ color: BRAND_TEXT }}>
        {prayerLabel}
        {m.city ? ` · ${m.city}` : ""}
      </h1>
      <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: BRAND_TEXT_SOFT }}>
        {confirmed
          ? "This minyan is happening — join on MinyanNow to see exactly where."
          : `${count} of ${NEEDED} confirmed so far. Open the app to join and see the location.`}
      </p>

      <div className="flex items-center gap-1.5 mt-6 text-sm" style={{ color: BRAND_TEXT_SOFT }}>
        <Users className="h-4 w-4" />
        {count} {count === 1 ? "person" : "people"}
      </div>

      <a
        href={inAppUrl}
        className="mt-10 w-full max-w-xs flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white shadow-lift"
        style={{ backgroundColor: BRAND_BLUE }}
      >
        <Download className="h-4 w-4" />
        Open in MinyanNow
      </a>
      <Link to="/" className="mt-4 text-xs underline" style={{ color: BRAND_TEXT_SOFT }}>
        Don't have the app? Get MinyanNow
      </Link>
    </div>
  );
}
