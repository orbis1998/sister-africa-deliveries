import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, History as HistoryIcon, Bell, User } from "lucide-react";
import logo from "@/assets/logo-ts.png";
import { useAuth } from "@/lib/auth";

const tabs = [
  { to: "/", label: "Tournée", icon: Home },
  { to: "/historique", label: "Historique", icon: HistoryIcon },
  { to: "/notifications", label: "Alertes", icon: Bell },
  { to: "/profil", label: "Profil", icon: User },
];

export default function AppShell() {
  const { courier } = useAuth();
  const { pathname } = useLocation();
  const onDetail = pathname.startsWith("/livraisons/");

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-warm">
      <header className="safe-top sticky top-0 z-30 border-b border-border/60 bg-background/85 px-5 py-3 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="The Sister Africa"
              className="h-11 w-11 shrink-0 object-contain"
              width={44}
              height={44}
            />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Delivery</p>
          </div>
          {courier && (
            <div className="text-right leading-tight">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Badge</p>
              <p className="font-mono text-sm text-foreground">{courier.badge_id}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {!onDetail && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border/60 bg-background/95 px-2 pt-2 backdrop-blur-xl">
          <ul className="grid grid-cols-4">
            {tabs.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="h-5 w-5" strokeWidth={1.6} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
