import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  modules: string[];
  expires_at: string | null;
};

export const MODULES = [
  { key: "playfake", label: "Play Fake" },
  { key: "telas", label: "Telas Pretas" },
  { key: "ia", label: "Assistente IA" },
  { key: "apk", label: "QR Code APK" },
] as const;

export const emailFor = (username: string) =>
  `${username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")}@painel.local`;

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,username,display_name,modules,expires_at")
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    const nextProfile = (p as Profile) ?? null;
    if (nextProfile?.expires_at && new Date(nextProfile.expires_at) < new Date()) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    setProfile(nextProfile);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => void load(s?.user.id), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    profile,
    isAdmin,
    loading,
    refresh: () => load(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setIsAdmin(false);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function hasModule(profile: Profile | null, isAdmin: boolean, mod: string) {
  if (isAdmin) return true;
  return !!profile?.modules?.includes(mod);
}

export async function logActivity(userId: string, action: string, detail?: string) {
  await supabase.from("activity_log").insert({ user_id: userId, action, detail: detail ?? null });
}
