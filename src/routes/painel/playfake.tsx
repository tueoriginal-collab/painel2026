import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  ImageIcon,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  Languages,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { hasModule, useAuth } from "@/lib/auth";
import { useViewAs } from "@/lib/viewas";
import { aiImage, aiJson, aiText } from "@/lib/ai";
import { cloneRealApp } from "@/lib/admin.functions";
import {
  PlayFakePreview,
  defaultPlayFake,
  renderPlayFakeHtml,
  type PlayFakeData,
} from "@/components/PlayFakePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/painel/playfake")({
  head: () => ({
    meta: [
      { title: "Play Fake — Ghost Copier" },
      { name: "description", content: "Editor visual de páginas Play Fake." },
    ],
  }),
  component: PlayFake,
});

type Saved = { id: string; name: string; data: PlayFakeData };

function PlayFake() {
  const { profile, isAdmin } = useAuth();
  const { targetId } = useViewAs();
  const qc = useQueryClient();
  const [data, setData] = useState<PlayFakeData>(defaultPlayFake);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const allowed = hasModule(profile, isAdmin, "playfake");

  const { data: saved = [] } = useQuery({
    queryKey: ["playfake", targetId],
    enabled: !!targetId && allowed,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("playfake_apps")
        .select("id,name,data")
        .eq("user_id", targetId)
        .order("updated_at", { ascending: false });
      return (rows ?? []) as unknown as Saved[];
    },
  });

  if (!allowed) return <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>;

  const set = <K extends keyof PlayFakeData>(k: K, v: PlayFakeData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou");
    }
    setBusy(null);
  };

  const gerarPagina = () =>
    run("gerar", async () => {
      const out = await aiJson<Partial<PlayFakeData>>(
        `Gere os dados de uma página da Play Store em português do Brasil para: "${source}". Formato JSON: {"name","developer","rating","reviewsCount","downloads","ageRating","shortDescription","longDescription","whatsNew","reviews":[{"name","rating","date","text","likes"}]}. Use 6 avaliações com nomes brasileiros, datas relativas ("há 2 dias"), notas 4 e 5 e textos de tamanhos diferentes.`,
      );
      const reviews = (out.reviews ?? []).map((r, i) => ({
        ...r,
        avatar: `https://i.pravatar.cc/100?img=${((i * 7) % 60) + 1}`,
        likes: r.likes ?? Math.floor(Math.random() * 300),
      }));
      setData((d) => ({ ...d, ...out, reviews: reviews.length ? reviews : d.reviews }));
      toast.success("Página gerada.");
    });

  const clonar = () =>
    run("clonar", async () => {
      const app = await cloneRealApp({ data: { query: source } });
      setData((d) => ({
        ...d,
        name: app.name || d.name,
        developer: app.developer || d.developer,
        icon: app.icon || d.icon,
        rating: app.rating || d.rating,
        shortDescription: app.description || d.shortDescription,
      }));
      toast.success("App real importado.");
    });

  const gerarImagem = (kind: "icon" | "banner") =>
    run(kind, async () => {
      if (!source.trim() && !data.name.trim())
        throw new Error("Descreva o app antes de gerar a imagem.");
      const prompt =
        kind === "icon"
          ? `Ícone quadrado profissional de aplicativo para ${source || data.name}, sem texto, composição centralizada, pronto para uma loja de apps.`
          : `Banner horizontal profissional de aplicativo para ${source || data.name}, sem texto, proporção 3:2, visual publicitário premium.`;
      const url = await aiImage(prompt, kind === "icon" ? "1024x1024" : "1536x1024");
      if (kind === "icon") set("icon", url);
      else
        setData((current) => ({
          ...current,
          screenshots: [url, ...current.screenshots].slice(0, 6),
        }));
      toast.success(kind === "icon" ? "Ícone real gerado." : "Banner real gerado.");
    });

  const melhorar = (field: "shortDescription" | "longDescription" | "whatsNew") =>
    run(field, async () => {
      const out = await aiText(
        `Melhore este texto de loja de aplicativos, mantendo o sentido, em português do Brasil, sem aspas:\n\n${data[field]}`,
      );
      set(field, out.trim());
    });

  const traduzir = (lang: string) =>
    run("traduzir", async () => {
      const out = await aiJson<Record<string, string>>(
        `Traduza para ${lang} e responda JSON {"shortDescription","longDescription","whatsNew"}:\n${JSON.stringify(
          {
            shortDescription: data.shortDescription,
            longDescription: data.longDescription,
            whatsNew: data.whatsNew,
          },
        )}`,
      );
      setData((d) => ({ ...d, ...out }));
    });

  const salvar = () =>
    run("salvar", async () => {
      await supabase
        .from("playfake_apps")
        .insert({ user_id: targetId, name: data.name, data: data as never });
      void qc.invalidateQueries({ queryKey: ["playfake", targetId] });
      toast.success("Template salvo.");
    });

  const baixar = () => {
    const blob = new Blob([renderPlayFakeHtml(data)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.name.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Play Fake</h1>
        <p className="text-sm text-muted-foreground">
          Monte a página, veja a prévia realista e publique o arquivo.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Label>Gerar a partir de um link ou nome do app</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-40 flex-1"
                  placeholder="https://play.google.com/... ou 'app de banco digital'"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
                <Button onClick={gerarPagina} disabled={!!busy}>
                  {busy === "gerar" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Gerar com IA
                </Button>
                <Button variant="outline" onClick={clonar} disabled={!!busy}>
                  {busy === "clonar" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Clonar app real"
                  )}
                </Button>
                <Button variant="outline" onClick={() => gerarImagem("icon")} disabled={!!busy}>
                  {busy === "icon" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  Gerar ícone real
                </Button>
                <Button variant="outline" onClick={() => gerarImagem("banner")} disabled={!!busy}>
                  {busy === "banner" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  Gerar banner real
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A geração de imagem só consome créditos quando você clicar em um dos botões acima.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Nome" value={data.name} onChange={(v) => set("name", v)} />
              <Field
                label="Desenvolvedor"
                value={data.developer}
                onChange={(v) => set("developer", v)}
              />
              <Field label="Ícone (URL)" value={data.icon} onChange={(v) => set("icon", v)} />
              <Field label="Nota" value={data.rating} onChange={(v) => set("rating", v)} />
              <Field
                label="Avaliações"
                value={data.reviewsCount}
                onChange={(v) => set("reviewsCount", v)}
              />
              <Field
                label="Downloads"
                value={data.downloads}
                onChange={(v) => set("downloads", v)}
              />
              <Field
                label="Classificação"
                value={data.ageRating}
                onChange={(v) => set("ageRating", v)}
              />
              <Field
                label="Imagens (URLs separadas por vírgula)"
                value={data.screenshots.join(",")}
                onChange={(v) =>
                  set(
                    "screenshots",
                    v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />

              {(
                [
                  ["shortDescription", "Descrição curta"],
                  ["longDescription", "Descrição longa"],
                  ["whatsNew", "Novidades"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => melhorar(key)}
                      disabled={!!busy}
                    >
                      {busy === key ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 size-4" />
                      )}
                      Melhorar com IA
                    </Button>
                  </div>
                  <Textarea
                    value={data[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="min-h-24"
                  />
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Languages className="size-4 text-muted-foreground" />
                <Select onValueChange={traduzir}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Traduzir para…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="português do Brasil">Português (BR)</SelectItem>
                    <SelectItem value="inglês">Inglês</SelectItem>
                    <SelectItem value="espanhol">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={salvar} disabled={!!busy}>
                  <Save className="mr-2 size-4" /> Salvar template
                </Button>
                <Button variant="outline" onClick={baixar}>
                  <Download className="mr-2 size-4" /> Baixar página
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4">
              <Label>Templates salvos</Label>
              {saved.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum template salvo.</p>
              )}
              {saved.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 border-b border-border/60 py-2"
                >
                  <span className="truncate text-sm">{s.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setData(s.data)}>
                      Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await supabase.from("playfake_apps").delete().eq("id", s.id);
                        void qc.invalidateQueries({ queryKey: ["playfake", targetId] });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <PlayFakePreview data={data} />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
