/**
 * Image helpers for banner / coupon uploads.
 *
 * `fileToDataUrl` reads an image File into a base64 data URL. On web it also
 * downscales the image client-side (max 1280px on the long edge, JPEG 0.82)
 * so multi-banner payloads never grow into multi-megabyte JSON bodies that
 * can exceed proxy or document size limits. Falls back to the raw data URL
 * whenever canvas is unavailable.
 */

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fileToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<string> {
  const raw = await readAsDataUrl(file);
  if (typeof document === 'undefined' || typeof window === 'undefined') return raw;
  if (!file.type || !file.type.startsWith('image/')) return raw;
  try {
    const img = new Image();
    img.src = raw;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
    });
    if (!img.width || !img.height) return raw;
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    if (scale >= 1) return raw;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return raw;
  }
}

export function fileNameToLabel(name?: string): string {
  const stem = (name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return stem || 'Banner';
}
