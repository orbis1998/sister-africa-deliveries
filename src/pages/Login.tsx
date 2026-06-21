import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, IdCard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-ts.png";
import { toast } from "sonner";

export default function Login() {
  const { courier, signIn } = useAuth();
  const navigate = useNavigate();
  const [badge, setBadge] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (courier) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(badge.trim(), password);
    setLoading(false);
    if (error) return toast.error(error);
    toast.success("Bienvenue 👋");
    navigate("/", { replace: true });
  };

  return (
    <div className="bg-warm flex min-h-full flex-col px-6 pb-10 pt-16">
      <div className="mx-auto w-full max-w-sm flex-1 animate-fade-up">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="The Sister Africa"
            width={96}
            height={96}
            className="h-24 w-24 object-contain"
          />
          <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-primary/80">
            Powered by The Sisters
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            Espace <em className="text-primary not-italic">de livraison</em>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connectez-vous avec le badge livreur créé par l'administration pour démarrer votre tournée.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="badge" className="text-xs uppercase tracking-wider text-muted-foreground">
              Identifiant de badge
            </Label>
            <div className="relative">
              <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="badge"
                autoComplete="username"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="LIV001"
                className="h-12 rounded-xl border-border/70 bg-input/50 pl-10 font-mono uppercase tracking-wider"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
              Mot de passe
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 rounded-xl border-border/70 bg-input/50 pl-10 pr-11"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
        © The Sister Africa
      </p>
    </div>
  );
}
