import sharp from "sharp";
import fs from "fs";
import path from "path";

const dir = path.resolve("public/images/landing");

async function optimize() {
  const images = ["hero-entrepreneur.jpg", "business-growth.jpg"];

  for (const imgName of images) {
    const srcPath = path.join(dir, imgName);
    const baseName = path.parse(imgName).name;

    // WebP output target < 80 KB
    const webpPath = path.join(dir, `${baseName}.webp`);
    await sharp(srcPath)
      .resize({ width: 960, withoutEnlargement: true })
      .webp({ quality: 78, effort: 6 })
      .toFile(webpPath);
    const webpSize = (fs.statSync(webpPath).size / 1024).toFixed(1);
    console.log(`WebP created: ${baseName}.webp, size: ${webpSize} KB`);

    // AVIF output target < 80 KB
    const avifPath = path.join(dir, `${baseName}.avif`);
    await sharp(srcPath)
      .resize({ width: 960, withoutEnlargement: true })
      .avif({ quality: 72, effort: 6 })
      .toFile(avifPath);
    const avifSize = (fs.statSync(avifPath).size / 1024).toFixed(1);
    console.log(`AVIF created: ${baseName}.avif, size: ${avifSize} KB`);
  }
}

optimize().catch((e) => {
  console.error("Optimize error:", e);
  process.exit(1);
});
