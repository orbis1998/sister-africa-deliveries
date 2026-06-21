import fs from "node:fs/promises";
import sharp from "sharp";

const headerLogo = "src/assets/logo-ts.png";
const appIcon192 = "public/app-icon-192.png";
const appIcon512 = "public/app-icon-512.png";
const splash192 = "public/splash-icon-192.png";
const splash512 = "public/splash-icon-512.png";
const notification192 = "public/notification-icon-192.png";
const bg = { r: 37, g: 28, b: 24, alpha: 1 }; // #251C18

// Keep existing brown-square icons as installed app icons (opening/home screen look).
try {
  await fs.copyFile("public/icon-192.png", appIcon192);
  await fs.copyFile("public/icon-512.png", appIcon512);
  console.log("App icons copied from public/icon-192.png and icon-512.png");
} catch {
  console.warn("Missing public/icon-192.png — run after adding app icons");
}

for (const [size, out] of [
  [192, splash192],
  [512, splash512],
  [192, notification192],
]) {
  await sharp(headerLogo)
    .resize(Math.round(size * 0.72), Math.round(size * 0.72), { fit: "contain", background: bg })
    .extend({
      top: Math.round(size * 0.14),
      bottom: Math.round(size * 0.14),
      left: Math.round(size * 0.14),
      right: Math.round(size * 0.14),
      background: bg,
    })
    .png()
    .toFile(out);
  console.log(`Generated ${out}`);
}
