import { createRoot } from "react-dom/client";
import "./index.css";
import MissingEnv from "./pages/MissingEnv";

const hasSupabaseEnv =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const root = createRoot(document.getElementById("root")!);

if (!hasSupabaseEnv) {
  root.render(<MissingEnv />);
} else {
  void import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}
