import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export const Route = createFileRoute("/api/public/live-view/$username")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ params }) => {
        const username = params.username.trim().toLowerCase();
        if (!/^[a-z0-9._-]{1,64}$/.test(username)) {
          return Response.json({ error: "Usuário inválido." }, { status: 400, headers: corsHeaders });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id,expires_at")
          .eq("username", username)
          .maybeSingle();

        if (!profile || (profile.expires_at && new Date(profile.expires_at) < new Date())) {
          return Response.json(
            { activeTemplateId: null, html: "", name: "" },
            { headers: corsHeaders },
          );
        }

        const { data: screen } = await supabaseAdmin
          .from("screens")
          .select("id,name,html")
          .eq("user_id", profile.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        return Response.json(
          {
            activeTemplateId: screen?.id ?? null,
            html: screen?.html ?? "",
            name: screen?.name ?? "",
          },
          { headers: corsHeaders },
        );
      },
    },
  },
});