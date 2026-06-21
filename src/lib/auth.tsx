import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type Courier } from "./deliveryTypes";
import { supabase } from "./supabase";
import { refreshWebPushSubscription, subscribeToWebPush } from "./push";

interface AuthState {
  courier: Courier | null;
  loading: boolean;
  signIn: (badgeId: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);
const STORAGE_KEY = "tsa.delivery.session";

interface CourierLoginResponse {
  courier?: Courier;
  error?: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCourier(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!courier?.id || loading) return;
    void refreshWebPushSubscription(courier.id);
  }, [courier?.id, loading]);

  const signIn: AuthState["signIn"] = async (badgeId, password) => {
    if (!badgeId.trim() || password.length < 4) {
      return { error: "Identifiants invalides." };
    }

    const { data, error } = await supabase.rpc("courier_login", {
      p_badge_id: badgeId.trim().toUpperCase(),
      p_password: password,
    });

    if (error) {
      return { error: error.message || "Connexion impossible. Vérifiez vos identifiants." };
    }

    const result = data as CourierLoginResponse | null;

    if (result?.error) {
      return { error: result.error };
    }

    if (!result?.courier) {
      return { error: "Réponse de connexion invalide." };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.courier));
    setCourier(result.courier);
    void subscribeToWebPush(result.courier.id);
    return {};
  };

  const signOut = () => {
    void supabase.auth.signOut();
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
