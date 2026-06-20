import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "plhdpaqdtukhcvfvrnxa";
const FUNCTION_SLUG = "send-push";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (Supabase Dashboard → Account → Access Tokens, prefix sbp_)");
  process.exit(1);
}

const secrets = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? "BLW9X73LMU6XxcBWO10QDQJLUxJpKKuxBlVXx3D_MRlrw66rxv838bzV42Rt2rFzCBdH3kXNdflRD1lwS1_P34c",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? "oxF2546XYW1rHZYgRSeA5mrJTfaL2lLbX2KDPJrUa3Y",
  VAPID_SUBJECT: process.env.VAPID_SUBJECT ?? "mailto:contact@thesisterafrica.com",
};

const fnPath = path.join(ROOT, "supabase", "functions", "send-push", "index.ts");
const source = await fs.readFile(fnPath);

async function api(pathname, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${pathname}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json;
}

console.log("Setting Edge Function secrets…");
await api("/secrets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(
    Object.entries(secrets).map(([name, value]) => ({ name, value }))
  ),
});

console.log("Deploying send-push Edge Function…");
const form = new FormData();
form.append(
  "metadata",
  JSON.stringify({
    name: "send-push",
    entrypoint_path: "index.ts",
    verify_jwt: false,
  })
);
form.append("file", new Blob([source], { type: "text/typescript" }), "index.ts");

const deployRes = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FUNCTION_SLUG}`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }
);
const deployBody = await deployRes.text();
if (!deployRes.ok) {
  throw new Error(`${deployRes.status} deploy: ${deployBody}`);
}

console.log("Deploy OK:", deployBody);

console.log("Testing function invoke…");
const testRes = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_SLUG}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ courier_id: "00000000-0000-0000-0000-000000000001", title: "Test", body: "Ping" }),
});
console.log("Invoke:", testRes.status, await testRes.text());
