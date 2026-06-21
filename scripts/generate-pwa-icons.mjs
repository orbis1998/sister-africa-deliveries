import fs from "node:fs/promises";

const headerLogo = "src/assets/logo-ts.png";
const appIcon192 = "public/app-icon-192.png";
const publicLogo = "public/logo-ts.png";

// App icon on phone = brown square (icon-192.png).
try {
  await fs.copyFile("public/icon-192.png", appIcon192);
  console.log("App icon: public/app-icon-192.png");
} catch {
  console.warn("Missing public/icon-192.png");
}

// Transparent logo for header, splash screen, and notifications.
await fs.copyFile(headerLogo, publicLogo);
console.log("Copied public/logo-ts.png");

// Remove unused 512 assets.
for (const file of [
  "public/icon-512.png",
  "public/app-icon-512.png",
  "public/splash-icon-512.png",
  "public/splash-icon-192.png",
]) {
  try {
    await fs.unlink(file);
    console.log(`Removed ${file}`);
  } catch {
    /* already gone */
  }
}
