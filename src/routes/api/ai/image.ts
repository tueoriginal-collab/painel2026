import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/ai/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Não autorizado", { status: 401 });

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
        const { data: auth } = await sb.auth.getUser(token);
        if (!auth.user) return new Response("Não autorizado", { status: 401 });
        const { data: profile } = await sb
          .from("profiles")
          .select("modules,expires_at")
          .eq("id", auth.user.id)
          .maybeSingle();
        const { data: admin } = await sb.rpc("has_role", {
          _user_id: auth.user.id,
          _role: "admin",
        });
        if (profile?.expires_at && new Date(profile.expires_at) < new Date()) {
          return new Response("Acesso expirado", { status: 403 });
        }
        if (!admin && !profile?.modules?.includes("playfake")) {
          return new Response("Módulo Play Fake não liberado", { status: 403 });
        }

        const body = (await request.json()) as {
          prompt?: string;
          size?: "1024x1024" | "1536x1024";
        };
        if (!body.prompt?.trim()) return new Response("Descreva a imagem", { status: 400 });
        const lovableKey = process.env["LOVABLE_API_KEY"];
        if (!lovableKey) return new Response("IA não configurada", { status: 401 });

        const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": lovableKey,
          },
          body: JSON.stringify({
            model: "openai/gpt-image-2.5-sunburst",
            prompt: body.prompt,
            size: body.size ?? "1024x1024",
            response_format: "b64_json",
          }),
        });
        if (!response.ok) {
          const message = await response.text();
          return new Response(message || "Falha ao gerar imagem", { status: response.status });
        }
        const result = (await response.json()) as {
          data?: Array<{ b64_json?: string; url?: string }>;
        };
        const image = result.data?.[0];
        const url = image?.b64_json ? `data:image/png;base64,${image.b64_json}` : image?.url;
        if (!url) return new Response("A geração não retornou uma imagem", { status: 502 });
        return Response.json({ url });
      },
    },
  },
});
