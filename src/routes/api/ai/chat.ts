import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Não autorizado", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: userRes } = await sb.auth.getUser(token);
        if (!userRes?.user) return new Response("Não autorizado", { status: 401 });
        const [{ data: profile }, { data: isAdmin }] = await Promise.all([
          sb.from("profiles").select("modules,expires_at").eq("id", userRes.user.id).maybeSingle(),
          sb.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" }),
        ]);
        if (profile?.expires_at && new Date(profile.expires_at) < new Date()) {
          return new Response("Acesso expirado", { status: 403 });
        }
        if (!isAdmin && !profile?.modules?.includes("ia")) {
          return new Response("Módulo de IA não liberado", { status: 403 });
        }

        const body = (await request.json()) as {
          messages: { role: string; content: string }[];
          system?: string;
          stream?: boolean;
        };

        if (!process.env["LOVABLE_API_KEY"]) {
          return new Response("Serviço de IA não configurado", { status: 503 });
        }

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Lovable-API-Key": process.env["LOVABLE_API_KEY"] ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: body.stream !== false,
            messages: [
              {
                role: "system",
                content:
                  body.system ??
                  "Você é o assistente do painel, responde sempre em português do Brasil, de forma direta e prática.",
              },
              ...body.messages,
            ],
          }),
        });

        if (!res.ok) {
          const detail = await res.text();
          return new Response(detail || "Falha na IA", { status: res.status });
        }

        if (body.stream === false) {
          const json = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          return new Response(json.choices?.[0]?.message?.content ?? "", {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        return new Response(res.body, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
