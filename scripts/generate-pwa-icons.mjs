import fs from "node:fs/promises";
import sharp from "sharp";

const source = "src/assets/logo-ts.png";
const outDir = "public";

await fs.mkdir(outDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 37, g: 28, b: 24, alpha: 1 } })
    .png()
    .toFile(`${outDir}/icon-${size}.png`);
  console.log(`Generated public/icon-${size}.png`);
}
