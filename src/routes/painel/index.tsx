import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MonitorPlay, Sparkles, Store, Users, QrCode } from "lucide-react";

import { hasModule, useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/painel/")({
  head: () => ({
    meta: [
      { title: "Início — Ghost Copier" },
      { name: "description", content: "Escolha um módulo para começar." },
    ],
  }),
  component: Home,
});

function Home() {
  const { profile, isAdmin } = useAuth();
  const name = profile?.display_name || profile?.username || "";

  const options = [
    {
      to: "/painel/playfake",
      label: "Play Fake",
      desc: "Crie páginas realistas no estilo Play Store.",
      icon: Store,
      mod: "playfake" as string | null,
    },
    {
      to: "/painel/telas",
      label: "Telas Pretas",
      desc: "Monte e controle telas em tempo real.",
      icon: MonitorPlay,
      mod: "telas" as string | null,
    },
    {
      to: "/painel/ia",
      label: "Assistente IA",
      desc: "Gere textos, ideias e conteúdo na hora.",
      icon: Sparkles,
      mod: "ia" as string | null,
    },
    {
      to: "/painel/apk",
      label: "QR Code APK",
      desc: "Envie um APK e gere o QR de download direto.",
      icon: QrCode,
      mod: "apk" as string | null,
    },
    ...(isAdmin
      ? [
          {
            to: "/painel/usuarios",
            label: "Usuários",
            desc: "Gerencie acessos e permissões.",
            icon: Users,
            mod: null as string | null,
          },
        ]
      : []),
  ].filter((o) => !o.mod || hasModule(profile, isAdmin, o.mod));

  return (
    <div className="space-y-10">
      <header className="pt-6 text-center md:pt-10">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary/70">
          Ghost Copier
        </p>
        <h1 className="font-display mt-3 text-4xl font-extrabold leading-tight tracking-tight text-primary [text-shadow:0_0_18px_color-mix(in_oklab,var(--color-primary)_60%,transparent),0_0_40px_color-mix(in_oklab,var(--color-neon-purple)_35%,transparent)] md:text-6xl">
          Bem-vindo{name ? "," : ""}
          {name ? <span className="mt-1 block">{name}</span> : null}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Escolha abaixo o que você quer usar.
        </p>
      </header>

      <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
        {options.map((o) => (
          <Link key={o.to} to={o.to} className="group block">
            <Card className="relative flex h-full items-start gap-4 overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_0_28px_color-mix(in_oklab,var(--color-primary)_20%,transparent),0_6px_24px_rgba(0,0,0,0.35)]">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-[var(--color-neon-purple)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_18px_color-mix(in_oklab,var(--color-primary)_18%,transparent)] transition-transform duration-300 group-hover:scale-105">
                <o.icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-foreground">{o.label}</h2>
                  <ArrowRight className="size-4 text-primary/70 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {options.length === 0 && (
        <p className="text-center text-muted-foreground">
          Nenhum módulo liberado para o seu acesso ainda. Fale com o administrador.
        </p>
      )}
    </div>
  );
}
