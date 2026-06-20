// Auth context — placeholder for Supabase Edge Function `courier-login`.
// Real flow: POST { badge_id, password } -> { token, courier } ; token stored in memory + localStorage.
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { MOCK_COURIER, type Courier } from "./mockData";

interface AuthState {
  courier: Courier | null;
  loading: boolean;
  signIn: (badgeId: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);
const STORAGE_KEY = "tsa.delivery.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCourier(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const signIn: AuthState["signIn"] = async (badgeId, password) => {
    // PLACEHOLDER: replace with supabase.functions.invoke('courier-login', { body: { badge_id, password } })
    await new Promise((r) => setTimeout(r, 700));
    if (!badgeId.trim() || password.length < 4) {
      return { error: "Identifiants invalides." };
    }
    // demo: any badge ID accepted, returns mock courier identity
    const c: Courier = { ...MOCK_COURIER, badge_id: badgeId.toUpperCase() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setCourier(c);
    return {};
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCourier(null);
  };

  return (
    <AuthCtx.Provider value={{ courier, loading, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
