import { Link, useLocation } from "@tanstack/react-router";
import { Home, Map, Plus, Bell, User } from "lucide-react";

type Item = { to: "/home" | "/map" | "/create" | "/notifications" | "/profile"; label: string; icon: typeof Home; primary?: boolean };
const items: Item[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/map", label: "Map", icon: Map },
  { to: "/create", label: "Create", icon: Plus, primary: true },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <div className="sticky bottom-0 left-0 right-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-background/0">
      <nav className="relative bg-surface border border-border rounded-3xl shadow-lift backdrop-blur">
        <ul className="grid grid-cols-5 items-end">
          {items.map(({ to, label, icon: Icon, primary }) => {
            const active = pathname === to;
            if (primary) {
              return (
                <li key={to} className="flex justify-center -mt-6">
                  <Link
                    to={to}
                    className="h-14 w-14 rounded-2xl gold-gradient text-gold-foreground flex items-center justify-center shadow-glow-gold transition-transform active:scale-95"
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
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{label}</span>
                  {active && <span className="h-1 w-1 rounded-full bg-gold mt-0.5" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
