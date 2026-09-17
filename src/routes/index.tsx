import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { emailFor, useAuth } from "@/lib/auth";
import { bootstrapAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoAsset from "@/assets/ghost-copier-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Ghost Copier" },
      { name: "description", content: "Acesso restrito ao painel Ghost Copier." },
      { property: "og:title", content: "Entrar — Ghost Copier" },
      { property: "og:description", content: "Acesso restrito ao painel de operação." },
    ],
  }),
  component: Login,
});

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    void bootstrapAdmin();
  }, []);

  useEffect(() => {
    if (session) void navigate({ to: "/painel" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailFor(username),
      password,
    });
    if (error || !data.user) {
      setBusy(false);
      toast.error("Usuário ou senha inválidos.");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("expires_at")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.expires_at && new Date(profile.expires_at) < new Date()) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error("Esse acesso expirou. Fale com o administrador.");
      return;
    }
    toast.success("Bem-vindo de volta.");
    void navigate({ to: "/painel" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="neon-panel relative w-full max-w-sm overflow-hidden rounded-lg border border-primary/30 bg-card p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={logoAsset.url}
            alt="Ghost Copier"
            className="logo-pulse size-28 object-contain"
          />
          <h1 className="font-display text-xl font-bold text-primary [text-shadow:0_0_15px_color-mix(in_oklab,var(--color-primary)_50%,transparent)]">
            GHOST COPIER
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Acesse seu painel de operação</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">Usuário</Label>
            <Input
              id="user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass">Senha</Label>
            <Input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="neon-button w-full font-semibold" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
