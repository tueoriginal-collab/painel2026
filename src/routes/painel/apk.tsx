import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  ClipboardCopy,
  Download,
  Loader2,
  QrCode,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { hasModule, logActivity, useAuth } from "@/lib/auth";
import { useViewAs } from "@/lib/viewas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/painel/apk")({
  head: () => ({
    meta: [
      { title: "QR Code APK — Ghost Copier" },
      { name: "description", content: "Envie um APK e gere o QR de download direto." },
    ],
  }),
  component: ApkQr,
});

type Apk = {
  id: string;
  name: string;
  file_path: string;
  public_url: string;
  size: number;
  version: string | null;
  created_at: string;
  user_id: string;
};

const BUCKET = "apks";
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

function formatSize(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function qrSrc(url: string, size = 320) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(url)}`;
}

function ApkQr() {
  const { profile, isAdmin } = useAuth();
  const { targetId, targetUsername } = useViewAs();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const allowed = hasModule(profile, isAdmin, "apk");

  const { data: apks = [] } = useQuery({
    queryKey: ["apks", targetId],
    enabled: !!targetId && allowed,
    queryFn: async () => {
      const { data } = await supabase
        .from("apks")
        .select("*")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Apk[];
    },
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["apks", targetId] });

  const handleUpload = async (file: File) => {
    if (!targetId) return;
    if (!file.name.toLowerCase().endsWith(".apk")) {
      toast.error("Selecione um arquivo .apk.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande (máx. 500 MB).");
      return;
    }
    setBusy(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${targetId}/${nanoid()}-${cleanName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/vnd.android.package-archive",
      });
      if (upErr) throw upErr;

      // URL pública já com download forçado (Content-Disposition: attachment).
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path, {
        download: file.name,
      });

      const { error: insErr } = await supabase.from("apks").insert({
        user_id: targetId,
        name: file.name,
        file_path: path,
        public_url: pub.publicUrl,
        size: file.size,
      });
      if (insErr) throw insErr;

      if (profile) await logActivity(profile.id, "enviou APK", file.name);
      invalidate();
      toast.success("APK enviado! QR Code gerado.");
    } catch (e) {
      console.error(e);
      toast.error("Não consegui enviar o APK. Tente de novo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (apk: Apk) => {
    try {
      await supabase.storage.from(BUCKET).remove([apk.file_path]);
      await supabase.from("apks").delete().eq("id", apk.id);
      invalidate();
      toast.success("APK removido.");
    } catch {
      toast.error("Não consegui remover.");
    }
  };

  const downloadQr = (apk: Apk) => {
    const a = document.createElement("a");
    a.href = qrSrc(apk.public_url, 640);
    a.download = `qrcode-${apk.name.replace(/\.apk$/i, "")}.png`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  };

  if (!allowed)
    return <p className="text-muted-foreground">Você não tem acesso a este módulo.</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Code APK</h1>
          <p className="text-sm text-muted-foreground">
            Envie qualquer APK e gere um QR Code para download direto — @{targetUsername}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Enviando…
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" /> Enviar APK
              </>
            )}
          </Button>
        </div>
      </header>

      {/* zona de upload por clique / arrastar */}
      <div
        onClick={() => !busy && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) void handleUpload(f);
        }}
        className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-primary/30 bg-[radial-gradient(80%_120%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_9%,transparent),transparent_60%)] px-6 py-12 text-center transition-colors hover:border-primary/60"
      >
        <span className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
          <Upload className="size-8 text-primary [filter:drop-shadow(0_0_16px_color-mix(in_oklab,var(--color-primary)_60%,transparent))]" />
        </span>
        <h3 className="text-base font-semibold text-foreground">
          Arraste seu APK aqui ou clique para escolher
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Aceita qualquer APK (qualquer modelo/arquitetura) até 500 MB. O link gerado baixa o
          arquivo direto no celular.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {apks.map((apk) => (
          <Card
            key={apk.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border-border/70 bg-gradient-to-b from-card to-card/60 p-0 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_0_40px_color-mix(in_oklab,var(--color-primary)_22%,transparent),0_10px_30px_rgba(0,0,0,0.45)]"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] rounded-t-2xl bg-gradient-to-r from-primary via-[var(--color-neon-purple)] to-primary opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

            {/* QR Code */}
            <div className="relative z-10 flex items-center justify-center border-b border-border/70 bg-[radial-gradient(80%_120%_at_50%_-10%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_55%)] px-6 py-7">
              <div className="rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                <img
                  src={qrSrc(apk.public_url)}
                  alt={`QR Code de ${apk.name}`}
                  width={180}
                  height={180}
                  className="size-[180px] rounded-lg"
                  loading="lazy"
                />
              </div>
            </div>

            {/* infos */}
            <div className="relative z-10 flex-1 px-4 pb-2 pt-3.5">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 shrink-0 text-primary" />
                <h4 className="truncate text-[15px] font-semibold text-foreground">{apk.name}</h4>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatSize(apk.size)} · {new Date(apk.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* ações */}
            <div className="relative z-10 flex items-center gap-2 border-t border-border/70 px-3 py-3">
              <a href={apk.public_url} className="flex-1" target="_blank" rel="noreferrer">
                <Button size="sm" className="w-full rounded-lg font-semibold">
                  <Download className="mr-1.5 size-4" /> Baixar
                </Button>
              </a>
              <Button
                size="icon"
                variant="outline"
                className="rounded-lg"
                aria-label="Copiar link"
                title="Copiar link de download"
                onClick={() => {
                  void navigator.clipboard.writeText(apk.public_url);
                  toast.success("Link copiado.");
                }}
              >
                <ClipboardCopy className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-lg"
                aria-label="Baixar QR Code"
                title="Baixar imagem do QR Code"
                onClick={() => downloadQr(apk)}
              >
                <QrCode className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Excluir APK"
                title="Excluir"
                onClick={() => void remove(apk)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Card>
        ))}

        {apks.length === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-primary/25 bg-[radial-gradient(80%_120%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_8%,transparent),transparent_60%)] px-6 py-16 text-center">
            <span className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <QrCode className="size-8 text-primary [filter:drop-shadow(0_0_16px_color-mix(in_oklab,var(--color-primary)_60%,transparent))]" />
            </span>
            <h3 className="text-base font-semibold text-foreground">Nenhum APK enviado ainda</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Envie um APK acima para gerar o QR Code de download direto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
