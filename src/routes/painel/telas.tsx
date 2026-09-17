import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  CopyPlus,
  Download,
  Pencil,
  Plus,
  QrCode,
  Radio,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { hasModule, logActivity, useAuth } from "@/lib/auth";
import { useViewAs } from "@/lib/viewas";
import { aiText } from "@/lib/ai";
import { createLiveViewHtml } from "@/lib/live-view-html";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/painel/telas")({
  head: () => ({
    meta: [
      { title: "Telas Pretas — Ghost Copier" },
      { name: "description", content: "Crie e controle telas em tempo real." },
    ],
  }),
  component: Telas,
});

type Screen = {
  id: string;
  name: string;
  html: string;
  is_active: boolean;
  user_id: string;
};

const BLANK = `<div style="position:fixed;inset:0;background:#000"></div>`;

function Telas() {
  const { profile, isAdmin } = useAuth();
  const { targetId, targetUsername } = useViewAs();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Screen | null>(null);
  const [name, setName] = useState("");
  const [html, setHtml] = useState(BLANK);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allowed = hasModule(profile, isAdmin, "telas");

  const { data: screens = [] } = useQuery({
    queryKey: ["screens", targetId],
    enabled: !!targetId && allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("screens")
        .select("*")
        .eq("user_id", targetId)
        .order("created_at", { ascending: true });
      return (data ?? []) as Screen[];
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["screens", targetId] });

  const activate = async (s: Screen) => {
    await supabase.from("screens").update({ is_active: !s.is_active }).eq("id", s.id);
    if (profile)
      await logActivity(profile.id, s.is_active ? "desativou tela" : "ativou tela", s.name);
    invalidate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName))
      )
        return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && screens[n - 1]) void activate(screens[n - 1]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screens]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome para a tela.");
      return;
    }
    if (editing) {
      await supabase.from("screens").update({ name, html }).eq("id", editing.id);
    } else {
      await supabase.from("screens").insert({ user_id: targetId, name, html });
    }
    setOpen(false);
    setEditing(null);
    invalidate();
    toast.success("Tela salva.");
  };

  const gerarComIA = async () => {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const out = await aiText(
        `Crie uma tela em HTML completa (só o HTML, com CSS inline em <style>) para exibir em tela cheia no celular: ${aiPrompt}. Fundo preto por padrão, sem scroll, ocupando 100% da tela.`,
        "Você gera HTML puro, sem explicação e sem blocos de código.",
      );
      setHtml(
        out
          .replace(/^```(?:html)?/i, "")
          .replace(/```$/, "")
          .trim(),
      );
      toast.success("Tela gerada, confira antes de salvar.");
    } catch {
      toast.error("Não consegui gerar agora.");
    }
    setAiBusy(false);
  };

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/user/livescreen/${targetUsername}`
      : "";

  const downloadViewer = () => {
    if (!targetUsername || !link) return;
    const viewerHtml = createLiveViewHtml(targetUsername, window.location.origin);
    const blob = new Blob([viewerHtml], { type: "text/html;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `Tela_Preta_${targetUsername}.html`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    toast.success(`HTML de @${targetUsername} baixado.`);
  };

  if (!allowed) return <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telas Pretas</h1>
          <p className="text-sm text-muted-foreground">
            Troca instantânea — use as teclas 1 a 9 para alternar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={downloadViewer}
          >
            <Download className="mr-2 size-4" /> Baixar HTML de @{targetUsername}
          </Button>
          <Button
            variant="outline"
            aria-label="Copiar link da visualização"
            title="Copiar link da visualização"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Link copiado.");
            }}
          >
            <Copy className="size-4" />
          </Button>
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline">
              <QrCode className="mr-2 size-4" /> QR
            </Button>
          </a>
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify(screens, null, 2)], {
                type: "application/json",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "telas.json";
              a.click();
            }}
          >
            <Download className="mr-2 size-4" /> Exportar
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 size-4" /> Importar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const list = JSON.parse(await f.text()) as Screen[];
              await supabase
                .from("screens")
                .insert(list.map((s) => ({ user_id: targetId, name: s.name, html: s.html })));
              invalidate();
              toast.success("Templates importados.");
            }}
          />
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (v && !editing) {
                setName("");
                setHtml(BLANK);
              }
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Nova tela
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar tela" : "Nova tela"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gerar com IA</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ex: tela preta com relógio branco no centro"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <Button variant="outline" onClick={gerarComIA} disabled={aiBusy}>
                      <Sparkles className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>HTML da tela</Label>
                  <Textarea
                    className="h-56 font-mono text-xs"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prévia</Label>
                  <div className="flex items-center justify-center rounded-lg border border-border bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_8%,transparent),color-mix(in_oklab,var(--color-neon-purple)_8%,transparent))] py-6">
                    <div className="relative h-[300px] w-[165px] overflow-hidden rounded-[22px] border-2 border-white/15 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
                      <iframe
                        title="previa"
                        srcDoc={html}
                        className="pointer-events-none h-[500px] w-[275px] origin-top-left border-0 bg-black"
                        style={{ transform: "scale(0.6)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((s, i) => (
          <Card
            key={s.id}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border-border/70 bg-gradient-to-b from-card to-card/60 p-0 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_0_40px_color-mix(in_oklab,var(--color-primary)_22%,transparent),0_10px_30px_rgba(0,0,0,0.45)] ${
              s.is_active
                ? "border-primary/70 ring-2 ring-primary/40 shadow-[0_0_35px_color-mix(in_oklab,var(--color-primary)_28%,transparent)]"
                : ""
            }`}
          >
            {/* glow neon de fundo (aparece no hover) */}
            <span className="pointer-events-none absolute -inset-px z-0 rounded-2xl bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {/* faixa neon no topo */}
            <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] rounded-t-2xl bg-gradient-to-r from-primary via-[var(--color-neon-purple)] to-primary opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

            {/* área de preview — moldura de celular com a tela real */}
            <div className="relative z-10 flex h-56 items-center justify-center overflow-hidden border-b border-border/70 bg-[radial-gradient(80%_120%_at_50%_-10%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_55%),linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_7%,transparent),color-mix(in_oklab,var(--color-neon-purple)_9%,transparent))]">
              <span className="absolute left-3 top-3 z-10 flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-black/70 text-sm font-bold text-primary shadow-[0_0_10px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] backdrop-blur">
                {i + 1}
              </span>
              {s.is_active && (
                <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-primary/40 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-[0_0_12px_color-mix(in_oklab,var(--color-primary)_40%,transparent)] backdrop-blur">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  no ar
                </span>
              )}
              {/* celular */}
              <div className="relative h-[182px] w-[100px] overflow-hidden rounded-[22px] border-[3px] border-white/20 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-transform duration-300 group-hover:scale-[1.06]">
                {/* notch */}
                <span className="absolute left-1/2 top-1.5 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/25" />
                <iframe
                  title={s.name}
                  srcDoc={s.html}
                  tabIndex={-1}
                  className="pointer-events-none h-[390px] w-[214px] origin-top-left border-0 bg-black"
                  style={{ transform: "scale(0.467)" }}
                />
              </div>
            </div>

            {/* nome + status */}
            <div className="relative z-10 flex-1 px-4 pb-2 pt-3.5">
              <h4 className="truncate text-[15px] font-semibold text-foreground">{s.name}</h4>
              {s.is_active ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary [text-shadow:0_0_8px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]">
                  <Radio className="size-3.5" /> no ar agora
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block size-2 rounded-full bg-muted-foreground/40" /> inativa
                </p>
              )}
            </div>

            {/* ações */}
            <div className="relative z-10 flex items-center gap-2 border-t border-border/70 px-3 py-3">
              <Button
                size="sm"
                className="flex-1 rounded-lg font-semibold"
                variant={s.is_active ? "secondary" : "default"}
                onClick={() => void activate(s)}
              >
                {s.is_active ? "Desativar" : "Ativar"}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-lg"
                aria-label="Editar tela"
                title="Editar"
                onClick={() => {
                  setEditing(s);
                  setName(s.name);
                  setHtml(s.html);
                  setOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-lg"
                aria-label="Duplicar tela"
                title="Duplicar"
                onClick={async () => {
                  await supabase
                    .from("screens")
                    .insert({ user_id: targetId, name: `${s.name} (cópia)`, html: s.html });
                  invalidate();
                }}
              >
                <CopyPlus className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Excluir tela"
                title="Excluir"
                onClick={async () => {
                  await supabase.from("screens").delete().eq("id", s.id);
                  invalidate();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
        {screens.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-primary/25 bg-[radial-gradient(80%_120%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_8%,transparent),transparent_60%)] px-6 py-20 text-center">
            <span className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Radio className="size-8 text-primary [filter:drop-shadow(0_0_16px_color-mix(in_oklab,var(--color-primary)_60%,transparent))]" />
            </span>
            <h3 className="text-base font-semibold text-foreground">Nenhuma tela salva ainda</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Clique em <span className="font-medium text-foreground">Nova tela</span> para criar a
              sua primeira tela preta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
