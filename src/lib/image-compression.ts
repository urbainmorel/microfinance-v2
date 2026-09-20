/**
 * Compression client-side ultra-rapide des images (KYC).
 * Réduit le poids des photos de smartphones/webcams (5-15 Mo) à ~150-250 Ko
 * en quelques dizaines de millisecondes sans bloquer l'UI.
 */

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export function calculateDimensions(width: number, height: number, maxDim: number) {
  if (width <= maxDim && height <= maxDim) {
    return { width, height };
  }
  const ratio = Math.min(maxDim / width, maxDim / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Impossible de compresser l'image"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Compresse un fichier image en JPEG optimisé tout en préservant la lisibilité.
 * Si le fichier est un PDF ou n'est pas une image, il est retourné tel quel.
 */
export async function compressImageFile(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const img = await loadImageElement(file);
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxDimension,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, quality);
    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

    return new File([blob], fileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
