import fs from "node:fs/promises";
import sharp from "sharp";

const headerLogo = "src/assets/logo-ts.png";
const appIcon192 = "public/app-icon-192.png";
const splash192 = "public/splash-icon-192.png";
const publicLogo = "public/logo-ts.png";
const bg = { r: 37, g: 28, b: 24, alpha: 1 }; // #251C18

// App icon on phone = brown square (icon-192.png).
try {
  await fs.copyFile("public/icon-192.png", appIcon192);
  console.log("App icon: public/app-icon-192.png");
} catch {
  console.warn("Missing public/icon-192.png");
}

// Logo header for splash, notifications, and in-app static URLs.
await fs.copyFile(headerLogo, publicLogo);
console.log("Copied public/logo-ts.png");

for (const out of [splash192]) {
  await sharp(headerLogo)
    .resize(138, 138, { fit: "contain", background: bg })
    .extend({ top: 27, bottom: 27, left: 27, right: 27, background: bg })
    .png()
    .toFile(out);
  console.log(`Generated ${out}`);
}

// Remove unused 512 assets.
for (const file of [
  "public/icon-512.png",
  "public/app-icon-512.png",
  "public/splash-icon-512.png",
]) {
  try {
    await fs.unlink(file);
    console.log(`Removed ${file}`);
  } catch {
    /* already gone */
  }
}
