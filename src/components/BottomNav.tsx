import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Home, CalendarDays, Plus, User } from "lucide-react";

type Item = {
  to: "/home" | "/planned" | "/create" | "/profile";
  key: "home" | "planned" | "create" | "profile";
  icon: typeof Home;
  primary?: boolean;
};

const items: Item[] = [
  { to: "/home", key: "home", icon: Home },
  { to: "/planned", key: "planned", icon: CalendarDays },
  { to: "/create", key: "create", icon: Plus, primary: true },
  { to: "/profile", key: "profile", icon: User },
];

/** Always pinned at the bottom of MobileFrame — visible without scrolling. */
export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <div className="shrink-0 z-50 px-4 pt-2 pb-3 bg-background/95 backdrop-blur-md border-t border-hairline">
      <nav className="relative bg-surface rounded-3xl shadow-lifted">
        <ul className="grid grid-cols-4 items-end">
          {items.map(({ to, key, icon: Icon, primary }) => {
            const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
            const label = t(`nav.${key}`);
            if (primary) {
              return (
                <li key={to} className="flex justify-center -mt-5">
                  <Link
                    to={to}
                    className="h-14 w-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-fab transition-transform active:scale-[0.97]"
                    aria-label={label}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.4} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                    active ? "text-accent" : "text-ink-soft"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${active ? "" : "opacity-80"}`}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  <span>{label}</span>
                  {active && <span className="h-1 w-1 rounded-full bg-accent mt-0.5" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
