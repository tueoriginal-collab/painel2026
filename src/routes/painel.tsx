import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  MonitorPlay,
  Store,
  Sparkles,
  Users,
  LogOut,
  Moon,
  Sun,
  EyeOff,
  Search,
  QrCode,
} from "lucide-react";

import { hasModule, useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useViewAs } from "@/lib/viewas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/ghost-copier-logo.png.asset.json";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Ghost Copier" },
      { name: "description", content: "Gerencie telas pretas, Play Fake e o assistente IA." },
      { property: "og:title", content: "Painel — Ghost Copier" },
      {
        property: "og:description",
        content: "Gerencie telas pretas, Play Fake e o assistente IA.",
      },
    ],
  }),
  component: PainelLayout,
});

function PainelLayout() {
  const { session, profile, isAdmin, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { impersonating, setViewAs } = useViewAs();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const items = [
    { to: "/painel", label: "Início", icon: LayoutDashboard, mod: null, exact: true },
    { to: "/painel/telas", label: "Telas Pretas", icon: MonitorPlay, mod: "telas" },
    { to: "/painel/playfake", label: "Play Fake", icon: Store, mod: "playfake" },
    { to: "/painel/ia", label: "Assistente IA", icon: Sparkles, mod: "ia" },
    { to: "/painel/apk", label: "QR Code APK", icon: QrCode, mod: "apk" },
    ...(isAdmin ? [{ to: "/painel/usuarios", label: "Usuários", icon: Users, mod: null }] : []),
  ].filter((i) => !i.mod || hasModule(profile, isAdmin, i.mod));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-primary via-neon-purple to-primary opacity-50" />
        <div className="border-b border-sidebar-border px-5 pb-5 pt-4 text-center">
          <img
            src={logoAsset.url}
            alt="Ghost Copier"
            className="logo-pulse mx-auto size-24 object-contain [image-rendering:auto]"
          />
          <p className="font-display mt-1 text-sm font-bold text-primary [text-shadow:0_0_14px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]">
            GHOST COPIER
          </p>
          <p className="mt-1 text-xs text-sidebar-foreground/55">@{profile?.username}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
          {items.map((i) => {
            const active = i.exact ? path === i.to : path.startsWith(i.to);
            return (
              <Link
                key={i.to}
                to={i.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_var(--color-primary),0_0_18px_color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <i.icon className="size-4" />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex gap-2 border-t border-sidebar-border p-4">
          <Button
            aria-label="Alternar tema"
            title="Alternar tema"
            variant="outline"
            size="icon"
            onClick={toggle}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-[60px] items-center justify-between border-b border-border bg-card/50 px-8 backdrop-blur md:flex">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="size-4 text-primary" />
            <span>Busca rápida</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
              Ctrl K
            </kbd>
          </div>
          <span className="font-display text-xs text-primary/80">PAINEL ONLINE</span>
        </header>
        <div className="flex items-center gap-2 overflow-x-auto border-b border-sidebar-border bg-sidebar p-2 md:hidden">
          <img
            src={logoAsset.url}
            alt="Ghost Copier"
            className="size-9 shrink-0 object-contain"
          />
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                path === i.to || (!i.exact && path.startsWith(i.to))
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground/60",
              )}
            >
              {i.label}
            </Link>
          ))}
        </div>

        {impersonating && (
          <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            <span>
              Você está vendo o painel de <strong>@{impersonating.username}</strong>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setViewAs(null)}>
              <EyeOff className="mr-1 size-4" /> Sair
            </Button>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
