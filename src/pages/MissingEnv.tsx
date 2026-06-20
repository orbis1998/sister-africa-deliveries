export default function MissingEnv() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#251C18] px-6 text-center text-[#F5EDE0]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#C9A876]/80">The Sister Africa Delivery</p>
      <h1 className="mt-4 font-display text-3xl">Configuration manquante</h1>
      <p className="mt-3 max-w-md text-sm text-[#F5EDE0]/70">
        Les variables <code className="text-[#C9A876]">VITE_SUPABASE_URL</code> et{" "}
        <code className="text-[#C9A876]">VITE_SUPABASE_ANON_KEY</code> ne sont pas définies sur
        Vercel. Ajoute-les dans Project Settings → Environment Variables, puis redéploie.
      </p>
    </div>
  );
}
