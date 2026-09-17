import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Plus, QrCode, Sparkles, Trash2, Upload, Radio } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { hasModule, logActivity, useAuth } from "@/lib/auth";
import { useViewAs } from "@/lib/viewas";
import { aiText } from "@/lib/ai";
import { createLiveViewHtml } from "@/lib/live-view-html";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
                <iframe
                  title="previa"
                  srcDoc={html}
                  className="h-40 w-full rounded-lg border border-border bg-black"
                />
              </div>
              <DialogFooter>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((s, i) => (
          <Card key={s.id} className={s.is_active ? "ring-2 ring-primary" : undefined}>
            <CardContent className="space-y-3 p-4">
              <iframe
                title={s.name}
                srcDoc={s.html}
                className="pointer-events-none h-36 w-full rounded-lg border border-border bg-black"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    <span className="mr-2 text-xs text-muted-foreground">{i + 1}</span>
                    {s.name}
                  </p>
                  {s.is_active && (
                    <p className="flex items-center gap-1 text-xs text-primary">
                      <Radio className="size-3" /> no ar agora
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={s.is_active ? "secondary" : "default"}
                    onClick={() => void activate(s)}
                  >
                    {s.is_active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditing(s);
                    setName(s.name);
                    setHtml(s.html);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={async () => {
                    await supabase
                      .from("screens")
                      .insert({ user_id: targetId, name: `${s.name} (cópia)`, html: s.html });
                    invalidate();
                  }}
                >
                  Duplicar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await supabase.from("screens").delete().eq("id", s.id);
                    invalidate();
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {screens.length === 0 && <p className="text-muted-foreground">Nenhuma tela salva ainda.</p>}
      </div>
    </div>
  );
}
