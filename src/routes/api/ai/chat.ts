import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Não autorizado", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });
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

        const systemPrompt =
          body.system ??
          "Você é o assistente do painel, responde sempre em português do Brasil, de forma direta e prática.";
        const messages = [{ role: "system", content: systemPrompt }, ...body.messages];
        const wantStream = body.stream !== false;

        // Provedor de IA: "free" (padrão, sem chave nenhuma) ou "openai" (exige OPENAI_API_KEY).
        // Para usar OpenAI, defina no Netlify: AI_PROVIDER=openai
        const provider = (process.env["AI_PROVIDER"] || "free").toLowerCase();
        const useOpenAI = provider === "openai" && !!process.env["OPENAI_API_KEY"];

        if (useOpenAI) {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env["OPENAI_API_KEY"] ?? ""}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ model: "gpt-4o-mini", stream: wantStream, messages }),
          });
          if (!res.ok) {
            const detail = await res.text();
            return new Response(detail || "Falha na IA", { status: res.status });
          }
          if (!wantStream) {
            const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
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
        }

        // Provedor GRATUITO (Pollinations) — não precisa de chave nem de configuração no Netlify.
        let text = "";
        try {
          const res = await fetch("https://text.pollinations.ai/openai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "openai", messages, stream: false }),
          });
          if (res.ok) {
            const ct = res.headers.get("content-type") ?? "";
            if (ct.includes("application/json")) {
              const json = (await res.json()) as {
                choices?: { message?: { content?: string } }[];
              };
              text = json.choices?.[0]?.message?.content ?? "";
            } else {
              text = await res.text();
            }
          }
        } catch {
          /* cai no aviso de indisponibilidade abaixo */
        }

        if (!text.trim()) {
          return new Response(
            "A IA gratuita está indisponível no momento. Tente novamente em instantes.",
            { status: 503 },
          );
        }

        if (!wantStream) {
          return new Response(text, {
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        // Reempacota a resposta no formato SSE da OpenAI para o front (aiStream) funcionar igual.
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const chunk = { choices: [{ delta: { content: text } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, {
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
