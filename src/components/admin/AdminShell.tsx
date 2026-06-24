import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Mic,
  Users,
  Images,
  HeartHandshake,
  ExternalLink,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  /** Public route this section manages (opens in a new tab for now). */
  href?: string;
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Episódios", icon: Mic, href: "/episodios" },
  { label: "Artistas", icon: Users, href: "/artistas" },
  { label: "Acervo", icon: Images, href: "/galeria" },
  { label: "Apoio", icon: HeartHandshake, href: "/apoio" },
];

export function AdminShell({
  email,
  onSignOut,
  children,
}: {
  email: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [active, setActive] = useState("Dashboard");

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-semibold">PQOQ Admin</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.label;
            const base =
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors";
            const cls = isActive
              ? `${base} bg-primary text-primary-foreground`
              : `${base} text-muted-foreground hover:bg-muted`;
            return item.href ? (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={cls}
                onClick={() => setActive(item.label)}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ) : (
              <button
                key={item.label}
                type="button"
                className={cls}
                onClick={() => setActive(item.label)}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Painel administrativo</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Ver site
            </Link>
            <Button variant="outline" size="sm" className="md:hidden" onClick={onSignOut}>
              Sair
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
