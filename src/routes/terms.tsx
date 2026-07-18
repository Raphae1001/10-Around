import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft, FileText } from "lucide-react";
import { TERMS_SECTIONS } from "@/lib/legal-content";
import { navigateBack } from "@/lib/navigate-back";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MinyanNow" },
      {
        name: "description",
        content:
          "Terms governing your use of MinyanNow — community guidelines, responsibilities, and liability.",
      },
      { property: "og:title", content: "Terms of Service — MinyanNow" },
      { property: "og:description", content: "Terms governing your use of MinyanNow." },
    ],
  }),
  component: Terms,
});

function Terms() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() =>
            navigateBack(router.history, () => {
              void navigate({ to: "/settings" });
            })
          }
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> {t("common.back")}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-semibold text-3xl tracking-tight">Terms of Service</h1>
            <p className="text-xs text-muted-foreground">Last updated: July 2026</p>
          </div>
        </div>

        <div className="space-y-4">
          {TERMS_SECTIONS.map((s) => (
            <section key={s.title} className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold text-lg">{s.title}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="underline">
            Privacy
          </Link>
          <Link to="/support" className="underline">
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
