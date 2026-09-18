import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Normaliza o nome de usuário EXATAMENTE como a tela de login (src/lib/auth.tsx),
// para que o e-mail técnico gerado aqui e o usado no login sempre coincidam.
const normalizeUsername = (u: string) =>
  u
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
const emailFor = (u: string) => `${normalizeUsername(u)}@painel.local`;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito ao administrador.");
  return db;
}

/** Cria (uma vez) o login admin e remove qualquer outro login legado. */
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const ADMIN_USERNAME = normalizeUsername(process.env["ADMIN_USERNAME"] ?? "");
  const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"];
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return { ok: true, created: false };
  const db = await admin();
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("username", ADMIN_USERNAME)
    .maybeSingle();
  if (existing) return { ok: true, created: false };

  const { data: created, error } = await db.auth.admin.createUser({
    email: emailFor(ADMIN_USERNAME),
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar admin");

  await db.from("profiles").insert({
    id: created.user.id,
    username: ADMIN_USERNAME,
    display_name: "Administrador",
    modules: ["playfake", "telas", "ia"],
  });
  await db.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
  return { ok: true, created: true };
});

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: false }),
      db.from("user_roles").select("user_id,role"),
    ]);
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, is_admin: adminIds.has(p.id) }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        username: z.string().min(2),
        password: z.string().min(4),
        display_name: z.string().optional(),
        modules: z.array(z.string()).default([]),
        expires_at: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const username = normalizeUsername(data.username);
    if (username.length < 2) throw new Error("Nome de usuário inválido.");
    const { data: created, error } = await db.auth.admin.createUser({
      email: emailFor(username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    const { error: pErr } = await db.from("profiles").insert({
      id: created.user.id,
      username,
      display_name: data.display_name ?? username,
      modules: data.modules,
      expires_at: data.expires_at || null,
    });
    if (pErr) {
      await db.auth.admin.deleteUser(created.user.id);
      throw new Error("Esse nome de usuário já existe.");
    }
    await db.from("user_roles").insert({ user_id: created.user.id, role: "user" });
    await db
      .from("activity_log")
      .insert({ user_id: context.userId, action: "criou usuário", detail: username });
    return { id: created.user.id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        modules: z.array(z.string()).optional(),
        expires_at: z.string().nullable().optional(),
        display_name: z.string().optional(),
        password: z.string().min(4).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const patch: {
      modules?: string[];
      display_name?: string | null;
      expires_at?: string | null;
    } = {};
    if (data.modules) patch.modules = data.modules;
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.expires_at !== undefined) patch.expires_at = data.expires_at || null;
    if (Object.keys(patch).length > 0) await db.from("profiles").update(patch).eq("id", data.id);
    if (data.password) await db.auth.admin.updateUserById(data.id, { password: data.password });
    await db
      .from("activity_log")
      .insert({ user_id: context.userId, action: "editou usuário", detail: data.id });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    if (data.id === context.userId) throw new Error("Você não pode apagar o próprio login.");
    await db.auth.admin.deleteUser(data.id);
    return { ok: true };
  });

export const duplicateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ id: z.string().uuid(), username: z.string().min(2), password: z.string().min(4) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const { data: src } = await db.from("profiles").select("*").eq("id", data.id).maybeSingle();
    if (!src) throw new Error("Usuário de origem não encontrado.");
    const username = normalizeUsername(data.username);
    if (username.length < 2) throw new Error("Nome de usuário inválido.");
    const { data: created, error } = await db.auth.admin.createUser({
      email: emailFor(username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao duplicar");
    await db.from("profiles").insert({
      id: created.user.id,
      username,
      display_name: username,
      modules: src.modules,
      expires_at: src.expires_at,
    });
    await db.from("user_roles").insert({ user_id: created.user.id, role: "user" });
    return { id: created.user.id };
  });

/** Dados de um app real da Play Store para preencher o editor. */
export const cloneRealApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ query: z.string().min(2) }).parse(d))
  .handler(async ({ data }) => {
    const q = data.query.trim();
    const url = q.startsWith("http")
      ? q
      : `https://play.google.com/store/apps/details?id=${encodeURIComponent(q)}&hl=pt_BR`;
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("Não consegui abrir esse link da Play Store.");
    const html = await res.text();
    const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/&amp;/g, "&").trim() ?? "";
    const name = pick(/<meta property="og:title" content="([^"]+)"/).replace(
      / - Apps? no Google Play/i,
      "",
    );
    const description = pick(/<meta name="description" content="([^"]+)"/);
    const icon = pick(/<meta property="og:image" content="([^"]+)"/);
    const developer = pick(/\/store\/apps\/dev(?:eloper)?\?id=[^"]*"[^>]*>([^<]+)</);
    const rating = pick(/(\d[.,]\d)\s*estrela/i) || "4,6";
    return { name, description, icon, developer, rating: rating.replace(",", ".") };
  });
