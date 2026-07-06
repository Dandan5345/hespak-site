// Helpers for turning a user-selected image File into a data URL the chat
// worker can forward to Gemini's vision API. We resize/compress large images
// client-side so we don't blow up the request body or the token quota —
// Gemini's vision tier works fine at ~1024px and JPEG quality 0.8.

/** Max dimension (width or height) we'll send. Larger images are scaled down
 * on a canvas before encoding. 1280px is a good balance of legibility vs.
 * payload size for Gemini vision. */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;
/** Soft cap on the resulting data-URL length (~3.5 MB). Gemini accepts larger,
 * but the Cloudflare worker has a 100 MB request ceiling and we want to leave
 * room for conversation history. */
const MAX_DATA_URL_BYTES = 3_500_000;

export const ACCEPTED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp'];

export function isImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_IMAGE_EXTS.some((ext) => name.endsWith(ext));
}

export class ImageProcessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessError';
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new ImageProcessError('קריאת התמונה נכשלה'));
    reader.readAsDataURL(file);
  });
}

/** Load a data URL into an HTMLImageElement (for canvas resizing). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageProcessError('טעינת התמונה נכשלה'));
    img.src = src;
  });
}

/** Resize an image so its longest side is at most MAX_DIMENSION, then encode
 * as JPEG. GIFs are passed through as-is (canvas would drop animation). */
async function resizeAndEncode(dataUrl: string, file: File): Promise<string> {
  // GIFs: keep as-is to preserve animation (Gemini accepts them).
  if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
    return dataUrl;
  }
  const img = await loadImage(dataUrl);
  const { width, height } = img;
  if (width <= 0 || height <= 0) throw new ImageProcessError('תמונה לא תקינה');
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  // If already small enough, keep original (but re-encode JPEG to save bytes).
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageProcessError('לא ניתן לעבד תמונה בדפדפן זה');
  ctx.drawImage(img, 0, 0, targetW, targetH);
  // PNG with transparency: keep PNG if small, else flatten to JPEG.
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  let out: string;
  if (isPng) {
    out = canvas.toDataURL('image/png');
    // If PNG is huge, fall back to JPEG.
    if (out.length > MAX_DATA_URL_BYTES) out = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } else {
    out = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }
  return out;
}

/** Main entry: read + resize + encode an image File into a data URL ready for
 * the Gemini vision API. Throws ImageProcessError on failure. */
export async function processImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  if (file.size > 25 * 1024 * 1024) {
    throw new ImageProcessError('התמונה גדולה מדי (מקסימום 25 MB)');
  }
  const raw = await readAsDataURL(file);
  const dataUrl = await resizeAndEncode(raw, file);
  if (dataUrl.length > MAX_DATA_URL_BYTES) {
    throw new ImageProcessError('התמונה גדולה מדי לשליחה אחרי עיבוד');
  }
  // Get final dimensions for the UI summary.
  const img = await loadImage(dataUrl);
  return { dataUrl, width: img.width, height: img.height };
}
