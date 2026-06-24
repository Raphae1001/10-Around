import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield, Lock, Database, MapPin, Share2, Trash2, Mail, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MinyanStreet" },
      { name: "description", content: "MinyanStreet privacy policy: what data we collect, how we use it, and your rights." },
      { property: "og:title", content: "Privacy Policy — MinyanStreet" },
      { property: "og:description", content: "Transparent data practices for the global minyan network." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { t } = useTranslation();
  const icons = { data: Database, use: Shield, location: MapPin, sharing: Share2, retention: Trash2, contact: Mail };
  const sections = ["data", "use", "location", "sharing", "retention", "contact"] as const;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-tight">{t("privacy.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("privacy.updated")}</p>
          </div>
        </div>

        <p className="mt-6 text-base text-muted-foreground leading-relaxed">{t("privacy.intro")}</p>

        <div className="mt-8 space-y-4">
          {sections.map((k) => {
            const Icon = icons[k];
            return (
              <section key={k} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-lg">{t(`privacy.sections.${k}.title` as any)}</h2>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t(`privacy.sections.${k}.body` as any)}</p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-muted-foreground">
          MinyanStreet · app.lovable.minyanstreet
        </div>
      </div>
    </div>
  );
}
