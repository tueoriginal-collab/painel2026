import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/user/livescreen/$username")({
  head: () => ({
    meta: [
      { title: "Visualizador ao vivo" },
      { name: "description", content: "Tela transmitida ao vivo." },
      { property: "og:title", content: "Visualizador ao vivo" },
      { property: "og:description", content: "Tela transmitida ao vivo." },
      { name: "robots", content: "noindex" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
      },
    ],
  }),
  component: LiveScreen,
  ssr: false,
});

type Screen = { id: string; html: string; is_active: boolean };

function LiveScreen() {
  const { username } = Route.useParams();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [showGate, setShowGate] = useState(true);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  // Mantém a tela ligada enquanto a página estiver visível.
  const requestWakeLock = async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void>; addEventListener: (e: string, cb: () => void) => void }> };
      };
      if (nav.wakeLock) {
        const sentinel = await nav.wakeLock.request("screen");
        wakeLockRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      /* alguns navegadores negam sem HTTPS */
    }
  };

  const enterFullscreen = async () => {
    setShowGate(false);
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* iOS Safari pode negar; segue assim mesmo */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      if (orientation?.lock) await orientation.lock("portrait");
    } catch {
      /* nem todo aparelho permite travar */
    }
    await requestWakeLock();
  };

  // Trava scroll/zoom e reobtém o wake lock ao voltar para a aba.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onVisibility = () => {
      if (!document.hidden && wakeLockRef.current === null) void requestWakeLock();
    };
    const noZoom = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("gesturestart", noZoom as EventListener);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("gesturestart", noZoom as EventListener);
      void wakeLockRef.current?.release();
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!profile) {
        setState("notfound");
        return;
      }
      const load = async () => {
        const { data } = await supabase
          .from("screens")
          .select("id,html,is_active")
          .eq("user_id", profile.id);
        const list = (data ?? []) as Screen[];
        setScreens(list);
        setActiveId(list.find((s) => s.is_active)?.id ?? null);
        setState("ready");
      };
      await load();

      channel = supabase
        .channel(`live-${profile.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "screens", filter: `user_id=eq.${profile.id}` },
          () => void load(),
        )
        .subscribe();
    })();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [username]);

  if (state === "notfound")
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white/60">
        Link inválido
      </div>
    );

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {screens.map((s) => (
        <iframe
          key={s.id}
          title={s.id}
          srcDoc={s.html}
          scrolling="no"
          className="absolute inset-0 size-full border-0 bg-black"
          style={{ visibility: s.id === activeId ? "visible" : "hidden" }}
        />
      ))}

      {state === "ready" && !activeId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-sm text-white/40">
          Nenhuma tela ativa no momento
        </div>
      )}

      {/* Convite para entrar em tela cheia — exige um toque do usuário no celular. */}
      {showGate && state !== "notfound" && (
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black text-white"
        >
          <span className="flex size-20 items-center justify-center rounded-[22px] border-2 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.28)]">
            <Maximize className="size-9 text-cyan-400" />
          </span>
          <span className="text-[17px] font-semibold">Toque para abrir em tela cheia</span>
          <span className="text-[13px] text-white/50">Mantém a tela ligada e sem barras</span>
        </button>
      )}
    </div>
  );
}
