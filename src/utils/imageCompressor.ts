/**
 * Compresses an image file using the browser's native Canvas API.
 * No external libraries required — completely free.
 *
 * The strategy: load the image into a canvas at reduced dimensions,
 * then export it as JPEG at reduced quality. Typical result:
 *   Original: 3-8 MB  →  Compressed: 100-350 KB
 */

export interface CompressionOptions {
  /** Maximum width in pixels. Default: 1280 */
  maxWidth?: number;
  /** Maximum height in pixels. Default: 1280 */
  maxHeight?: number;
  /** JPEG quality 0.0–1.0. Default: 0.75 */
  quality?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.75 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // ── Scale down preserving aspect ratio ─────────────────────────────
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      // ── Draw onto an off-screen canvas ─────────────────────────────────
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available in this browser'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // ── Export as compressed JPEG ───────────────────────────────────────
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas.toBlob() failed to produce output'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image for compression'));
    };

    img.src = objectUrl;
  });
}
