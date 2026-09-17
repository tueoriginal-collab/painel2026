import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";

export type ViewAs = { id: string; username: string } | null;
const KEY = "painel-view-as";
const EVT = "painel-view-as-change";

export function useViewAs() {
  const { profile, isAdmin } = useAuth();
  const [viewAs, setState] = useState<ViewAs>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<NonNullable<ViewAs>>) : null;
        setState(
          parsed && typeof parsed.id === "string" && typeof parsed.username === "string"
            ? { id: parsed.id, username: parsed.username }
            : null,
        );
      } catch {
        localStorage.removeItem(KEY);
        setState(null);
      }
    };
    read();
    window.addEventListener(EVT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const setViewAs = useCallback((v: ViewAs) => {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVT));
  }, []);

  const active = isAdmin ? viewAs : null;
  return {
    setViewAs,
    impersonating: active,
    targetId: active?.id ?? profile?.id ?? "",
    targetUsername: active?.username ?? profile?.username ?? "",
  };
}
