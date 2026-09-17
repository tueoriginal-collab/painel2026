import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/user/livescreen/$username")({
  head: () => ({
    meta: [
      { title: "Visualizador ao vivo" },
      { name: "description", content: "Tela transmitida ao vivo." },
      { property: "og:title", content: "Visualizador ao vivo" },
      { property: "og:description", content: "Tela transmitida ao vivo." },
      { name: "robots", content: "noindex" },
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white/60">
        Link inválido
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black">
      {screens.map((s) => (
        <iframe
          key={s.id}
          title={s.id}
          srcDoc={s.html}
          className="absolute inset-0 size-full border-0"
          style={{ visibility: s.id === activeId ? "visible" : "hidden" }}
        />
      ))}
      {state === "ready" && !activeId && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
          Nenhuma tela ativa no momento
        </div>
      )}
    </div>
  );
}
