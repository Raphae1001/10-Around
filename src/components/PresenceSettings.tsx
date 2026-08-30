import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { tapLight } from "@/lib/haptics";
import {
  getPresenceLevel,
  setPresenceLevel,
  type PresenceLevel,
  PRESENCE_LEVELS,
} from "@/lib/presence-prefs";

function levelKey(level: PresenceLevel): "Off" | "Ponctual" | "Active" {
  if (level === "off") return "Off";
  if (level === "active_foreground") return "Active";
  return "Ponctual";
}

/** Presence-level picker for /settings — fetches/saves the user's saved level. */
export function PresenceSettings({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation();
  const [presenceLevel, setPresenceLevelState] = useState<PresenceLevel>("ponctual");
  const [presenceLoading, setPresenceLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPresenceLevel(userId).then((level) => {
      if (!cancelled) {
        setPresenceLevelState(level);
        setPresenceLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function onPresenceChange(level: PresenceLevel) {
    if (level === presenceLevel) return;
    void tapLight();
    setPresenceLevelState(level);
    await setPresenceLevel(level, userId);
    toast.success(t("settings.presenceSaved"));
  }

  return (
    <>
      {presenceLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        PRESENCE_LEVELS.map((level, idx) => (
          <PresenceRow
            key={level}
            label={t(`settings.presence${levelKey(level)}`)}
            description={t(`settings.presence${levelKey(level)}Desc`)}
            selected={presenceLevel === level}
            isLast={idx === PRESENCE_LEVELS.length - 1}
            onSelect={() => void onPresenceChange(level)}
          />
        ))
      )}
      <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border/60 leading-relaxed">
        {t("settings.presenceFootnote")}
      </p>
    </>
  );
}

function PresenceRow({
  label,
  description,
  selected,
  isLast,
  onSelect,
}: {
  label: string;
  description: string;
  selected: boolean;
  isLast?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-4 py-3.5 flex items-start gap-3 text-left active:bg-muted/50 transition-colors ${
        !isLast ? "border-b border-border/60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-foreground">{label}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</div>
      </div>
      {selected && <Check className="h-5 w-5 text-gold shrink-0 mt-0.5" strokeWidth={2.5} />}
    </button>
  );
}
