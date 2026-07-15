import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { ChevronLeft, Type, Languages, Bookmark, ChevronDown } from "lucide-react";
import { useState } from "react";
import { guardLegacyScreen } from "@/lib/legacy-route";

export const Route = createFileRoute("/siddur")({
  beforeLoad: guardLegacyScreen,
  component: Siddur,
});

// Lightweight contextual content — Mincha · Nusach Ari (excerpt)
const sections = [
  {
    id: "ashrei",
    title: "Ashrei",
    he: [
      "אַשְׁרֵי יוֹשְׁבֵי בֵיתֶךָ, עוֹד יְהַלְלוּךָ סֶּלָה.",
      "אַשְׁרֵי הָעָם שֶׁכָּכָה לּוֹ, אַשְׁרֵי הָעָם שֶׁיהוה אֱלֹהָיו.",
      "תְּהִלָּה לְדָוִד, אֲרוֹמִמְךָ אֱלוֹהַי הַמֶּלֶךְ, וַאֲבָרְכָה שִׁמְךָ לְעוֹלָם וָעֶד.",
    ],
    tr: [
      "Ashrei yoshvei veitecha, od y'hallelucha selah.",
      "Ashrei ha'am shekacha lo, ashrei ha'am sheAdonai Elohav.",
      "Tehillah l'David, aromimcha Elohai haMelech, va'avarcha shimcha l'olam va'ed.",
    ],
  },
  {
    id: "amidah",
    title: "Shemoneh Esrei — Opening",
    he: [
      "אֲדֹנָי שְׂפָתַי תִּפְתָּח, וּפִי יַגִּיד תְּהִלָּתֶךָ.",
      "בָּרוּךְ אַתָּה יהוה אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, אֱלֹהֵי אַבְרָהָם, אֱלֹהֵי יִצְחָק, וֵאלֹהֵי יַעֲקֹב.",
      "הָאֵל הַגָּדוֹל הַגִּבּוֹר וְהַנּוֹרָא, אֵל עֶלְיוֹן, גּוֹמֵל חֲסָדִים טוֹבִים.",
    ],
    tr: [
      "Adonai s'fatai tiftach, ufi yagid tehillatecha.",
      "Baruch atah Adonai Eloheinu vElohei avoteinu, Elohei Avraham, Elohei Yitzchak, vElohei Yaakov.",
      "Ha'el hagadol hagibor v'hanora, El elyon, gomel chasadim tovim.",
    ],
  },
  {
    id: "kaddish",
    title: "Kaddish Shalem",
    he: [
      "יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא.",
      "בְּעָלְמָא דִּי בְרָא כִרְעוּתֵהּ, וְיַמְלִיךְ מַלְכוּתֵהּ.",
      "יְהֵא שְׁמֵהּ רַבָּא מְבָרַךְ לְעָלַם וּלְעָלְמֵי עָלְמַיָּא.",
    ],
    tr: [
      "Yitgadal v'yitkadash sh'mei raba.",
      "B'alma di v'ra chir'utei, v'yamlich malchutei.",
      "Y'hei sh'mei raba m'varach l'alam u'l'almei almaya.",
    ],
  },
];

function Siddur() {
  const [showTr, setShowTr] = useState(true);
  const [size, setSize] = useState(2); // 1..3
  const sizeCls = size === 1 ? "text-lg" : size === 3 ? "text-3xl" : "text-2xl";

  return (
    <MobileFrame showNav={false}>
      {/* Header */}
      <div className="px-5 pt-2 pb-3 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
        <Link
          to="/success"
          className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Contextual Siddur
          </div>
          <div className="font-display text-base leading-tight flex items-center gap-1 justify-center">
            Mincha · Nusach Ari <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setSize((s) => (s % 3) + 1)}
            className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center"
            aria-label="Text size"
          >
            <Type className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowTr((v) => !v)}
            className={`h-9 w-9 rounded-full border flex items-center justify-center ${
              showTr
                ? "gold-gradient text-gold-foreground border-transparent"
                : "bg-surface border-border"
            }`}
            aria-label="Transliteration"
          >
            <Languages className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Now playing — synced with minyan */}
      <div className="mx-5 mt-4 rounded-2xl border border-gold/30 bg-gold/5 p-3 flex items-center gap-3">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span className="absolute inset-0 rounded-full bg-gold opacity-50 live-pulse-ring" />
          <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
        <div className="text-xs leading-tight flex-1">
          <div className="font-semibold">Synced with Aaron's Loft</div>
          <div className="text-muted-foreground">10/10 confirmed · started 2 min ago</div>
        </div>
      </div>

      {/* Section nav */}
      <div className="px-5 mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border ${
              i === 0
                ? "bg-foreground text-background border-foreground"
                : "bg-surface border-border"
            }`}
          >
            {s.title}
          </a>
        ))}
      </div>

      {/* Prayers */}
      <div className="px-5 pb-12 mt-2 space-y-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
                {s.title}
              </h2>
              <button className="text-muted-foreground">
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5">
              {s.he.map((line, i) => (
                <div key={i}>
                  <p dir="rtl" className={`font-display ${sizeCls} leading-loose`}>
                    {line}
                  </p>
                  {showTr && (
                    <p className="text-xs text-muted-foreground italic mt-1.5 leading-relaxed">
                      {s.tr[i]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </MobileFrame>
  );
}
