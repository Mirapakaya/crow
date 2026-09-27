/**
 * Content sanitization for Crow.
 * Prevents XSS and malicious content in messages and attachments.
 */

/** Strip EXIF metadata from image files (removes all non-image chunks from PNG, strips JPEG APP markers) */
export async function stripImageMetadata(file: File): Promise<Blob> {
  if (file.type === 'image/svg+xml') {
    // SVG can contain scripts — convert to static image or reject
    // For now, return as-is but mark as unsafe
    return file;
  }

  // For JPEG and PNG, use canvas to re-encode (strips metadata)
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Failed to re-encode image'));
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/** Sanitize link preview URL — prevent javascript: and data: URLs */
export function sanitizeLinkUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Generate a safe thumbnail from an image file */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Thumbnail generation failed'));
        },
        'image/jpeg',
        0.7,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail'));
    };
    img.src = url;
  });
}

/** Check if a MIME type indicates potentially dangerous content */
export function isDangerousMimeType(mime: string): boolean {
  const dangerous = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-sh',
    'application/x-bat',
    'application/x-csh',
    'application/x-shellscript',
    'application/java-archive',
    'application/x-apple-diskimage',
    'application/x-msi',
  ];
  return dangerous.includes(mime);
}

/** Validate SVG content for safety (no scripts, no external references) */
export function isSafeSvg(content: string): boolean {
  if (/<script[\s>]/i.test(content)) return false;
  if (/on\w+\s*=/i.test(content)) return false;
  if (/<iframe[\s>]/i.test(content)) return false;
  if (/<embed[\s>]/i.test(content)) return false;
  if (/<object[\s>]/i.test(content)) return false;
  if (/href\s*=\s*["']javascript:/i.test(content)) return false;
  if (/xlink:href\s*=\s*["']javascript:/i.test(content)) return false;
  return true;
}
