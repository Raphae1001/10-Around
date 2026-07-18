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

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <div className="sticky bottom-0 left-0 right-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-background/0">
      <nav className="relative bg-surface rounded-3xl shadow-lifted backdrop-blur">
        <ul className="grid grid-cols-4 items-end">
          {items.map(({ to, key, icon: Icon, primary }) => {
            const active = pathname === to;
            const label = t(`nav.${key}`);
            if (primary) {
              return (
                <li key={to} className="flex justify-center -mt-6">
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
