import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SYMBOL_SRC =
  "C:/Users/DELL/.gemini/antigravity/brain/96194b1e-0b7b-4d13-b6df-8d9c8c946b82/.user_uploaded/media_1790783261050.png";
const LOGO_SRC =
  "C:/Users/DELL/.gemini/antigravity/brain/96194b1e-0b7b-4d13-b6df-8d9c8c946b82/.user_uploaded/media_1790783261052.png";

const ROOT_DIR = process.cwd();
const PUBLIC_BRAND_DIR = path.join(ROOT_DIR, "public", "images", "brand");
const PUBLIC_ICONS_DIR = path.join(ROOT_DIR, "public", "icons");
const APP_DIR = path.join(ROOT_DIR, "src", "app");

async function getAccurateBBox(imagePath, threshold = 15) {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let maxX = 0;
  let minY = info.height;
  let maxY = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      if (data[idx + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function buildIco(buffers, sizes) {
  const count = buffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + count * 16;
  const entries = [];

  for (let i = 0; i < count; i++) {
    const s = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s >= 256 ? 0 : s, 0);
    entry.writeUInt8(s >= 256 ? 0 : s, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffers[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffers[i].length;
  }

  return Buffer.concat([header, ...entries, ...buffers]);
}

async function run() {
  await fs.mkdir(PUBLIC_BRAND_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_ICONS_DIR, { recursive: true });

  console.log("Analyzing symbol source...");
  const symbolBBox = await getAccurateBBox(SYMBOL_SRC);
  console.log("Symbol bbox:", symbolBBox);

  const croppedSymbolBuffer = await sharp(SYMBOL_SRC).extract(symbolBBox).toBuffer();

  console.log("Analyzing full logo source...");
  const logoBBox = await getAccurateBBox(LOGO_SRC);
  console.log("Logo bbox:", logoBBox);

  const croppedLogoBuffer = await sharp(LOGO_SRC).extract(logoBBox).toBuffer();

  // 1. Brand Mark: 512x512 transparent WebP and PNG
  const brandSymbol512 = await sharp(croppedSymbolBuffer)
    .resize(470, 470, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 21,
      bottom: 21,
      left: 21,
      right: 21,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp(brandSymbol512)
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(PUBLIC_BRAND_DIR, "azari-symbol.webp"));

  await sharp(brandSymbol512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC_BRAND_DIR, "azari-symbol.png"));

  // 2. Full Horizontal Logo: WebP and PNG
  await sharp(croppedLogoBuffer)
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(PUBLIC_BRAND_DIR, "azari-logo-full.webp"));

  await sharp(croppedLogoBuffer)
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC_BRAND_DIR, "azari-logo-full.png"));

  // 3. PWA Icons: app-icon-192.png & app-icon-512.png
  await sharp(croppedSymbolBuffer)
    .resize(176, 176, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_ICONS_DIR, "app-icon-192.png"));

  await sharp(croppedSymbolBuffer)
    .resize(470, 470, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 21,
      bottom: 21,
      left: 21,
      right: 21,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(PUBLIC_ICONS_DIR, "app-icon-512.png"));

  // 4. Maskable PWA Icon: 512x512 with safe-zone on clean #FFFFFF background
  const maskableSymbol = await sharp(croppedSymbolBuffer)
    .resize(340, 340, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#FFFFFF" },
  })
    .composite([{ input: maskableSymbol, gravity: "center" }])
    .png()
    .toFile(path.join(PUBLIC_ICONS_DIR, "app-icon-maskable-512.png"));

  // 5. Apple Touch Icon: 180x180 with clean safe margin on #FFFFFF
  const appleSymbol = await sharp(croppedSymbolBuffer)
    .resize(130, 130, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const appleTouchBuffer = await sharp({
    create: { width: 180, height: 180, channels: 4, background: "#FFFFFF" },
  })
    .composite([{ input: appleSymbol, gravity: "center" }])
    .png()
    .toBuffer();

  await fs.writeFile(path.join(PUBLIC_ICONS_DIR, "apple-touch-icon.png"), appleTouchBuffer);
  await fs.writeFile(path.join(APP_DIR, "apple-icon.png"), appleTouchBuffer);

  // 6. Next.js App Router icon.png (48x48)
  const icon48 = await sharp(croppedSymbolBuffer)
    .resize(48, 48, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(APP_DIR, "icon.png"), icon48);

  // 7. Multi-resolution Favicon: 16x16, 32x32, 48x48
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) =>
      sharp(croppedSymbolBuffer)
        .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    ),
  );

  const faviconIcoBuffer = buildIco(icoBuffers, icoSizes);
  await fs.writeFile(path.join(APP_DIR, "favicon.ico"), faviconIcoBuffer);
  await fs.writeFile(path.join(ROOT_DIR, "public", "favicon.ico"), faviconIcoBuffer);

  // 8. Update SVG placeholders with crisp vector wrapper embedding high-res brand symbol
  const symbolPngBase64 = (await sharp(brandSymbol512).png().toBuffer()).toString("base64");
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${symbolPngBase64}" width="512" height="512" />
</svg>
`;
  await fs.writeFile(path.join(PUBLIC_ICONS_DIR, "app-icon.svg"), svgContent, "utf-8");

  const maskablePngBase64 = (
    await fs.readFile(path.join(PUBLIC_ICONS_DIR, "app-icon-maskable-512.png"))
  ).toString("base64");
  const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${maskablePngBase64}" width="512" height="512" />
</svg>
`;
  await fs.writeFile(
    path.join(PUBLIC_ICONS_DIR, "app-icon-maskable.svg"),
    maskableSvgContent,
    "utf-8",
  );

  console.log("All brand assets, favicons, and icons successfully generated!");
}

run().catch((err) => {
  console.error("Error generating brand assets:", err);
  process.exit(1);
});
