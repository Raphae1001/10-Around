import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { tapLight } from "@/lib/haptics";
import { useBlockedUsers } from "@/hooks/use-blocked-users";

/** Settings list of blocked users, with a way to unblock each one. */
export function BlockedUsersList({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation();
  const { blocked, unblock } = useBlockedUsers(userId);

  if (blocked.length === 0) {
    return (
      <p className="px-4 py-3.5 text-[13px] text-muted-foreground">{t("settings.noBlocked")}</p>
    );
  }

  return (
    <>
      {blocked.map((b, idx) => (
        <div
          key={b.blocked_id}
          className={`px-4 py-3 flex items-center gap-3 ${
            idx < blocked.length - 1 ? "border-b border-border/60" : ""
          }`}
        >
          <div className="flex-1 min-w-0 text-[15px] font-medium truncate">
            {b.blocked_name ||
              t("chats.blockedUserFallback", {
                date: new Date(b.created_at).toLocaleDateString(),
              })}
          </div>
          <button
            type="button"
            onClick={async () => {
              void tapLight();
              const { error } = await unblock(b.blocked_id);
              if (error) toast.error(t("chats.blockError"), { description: error.message });
              else toast.success(t("settings.unblocked"));
            }}
            className="text-[13px] font-semibold text-accent px-2 py-1 active:opacity-60"
          >
            {t("settings.unblock")}
          </button>
        </div>
      ))}
    </>
  );
}
