import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, QrCode, Activity, Users, MonitorPlay } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/painel/")({
  head: () => ({
    meta: [
      { title: "Visão geral — Ghost Copier" },
      { name: "description", content: "Resumo de telas, páginas e atividade do painel." },
    ],
  }),
  component: Home,
});

function Home() {
  const { profile, isAdmin } = useAuth();
  const link =
    typeof window !== "undefined" && profile
      ? `${window.location.origin}/user/livescreen/${profile.username}`
      : "";

  const { data: stats } = useQuery({
    queryKey: ["stats", isAdmin],
    queryFn: async () => {
      const since = new Date(Date.now() - 864e5).toISOString();
      const [users, live, acts, activity] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("screens").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase
          .from("activity_log")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since),
        supabase
          .from("activity_log")
          .select("action,detail,created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      return {
        users: users.count ?? 0,
        live: live.count ?? 0,
        acts: acts.count ?? 0,
        activity: activity.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Usuários", value: stats?.users ?? 0, icon: Users },
    { label: "Telas no ar agora", value: stats?.live ?? 0, icon: MonitorPlay },
    { label: "Trocas em 24h", value: stats?.acts ?? 0, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {profile?.display_name || profile?.username}
        </h1>
        <p className="text-sm text-muted-foreground">Resumo rápido da sua operação.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seu link de visualização</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">
            {link}
          </code>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Link copiado.");
            }}
          >
            <Copy className="mr-2 size-4" /> Copiar
          </Button>
          {link && (
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline">
                <QrCode className="mr-2 size-4" /> QR code
              </Button>
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de atividade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(stats?.activity ?? []).length === 0 && (
            <p className="text-muted-foreground">Nada registrado ainda.</p>
          )}
          {(stats?.activity ?? []).map((a, i) => (
            <div key={i} className="flex justify-between gap-4 border-b border-border/60 pb-2">
              <span>
                {a.action}{" "}
                {a.detail ? <span className="text-muted-foreground">— {a.detail}</span> : null}
              </span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
