import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="bg-warm flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80">Erreur 404</p>
        <h1 className="mt-3 font-display text-5xl">Page introuvable.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ce chemin n'existe pas dans votre tournée.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground hover:bg-primary/90">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
