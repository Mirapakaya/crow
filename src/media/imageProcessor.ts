/**
 * Image processing for attachments.
 * Strips EXIF, generates thumbnails, validates content.
 */

import { stripImageMetadata, generateThumbnail, isDangerousMimeType } from '@security/sanitization';
import {
  isAllowedMimeType,
  isAllowedAttachmentSize,
  MAX_ATTACHMENT_SIZE,
} from '@security/validation';

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  size: number;
  thumbnail?: Blob;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (!isAllowedMimeType(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (!isAllowedAttachmentSize(file.size)) {
    throw new Error(`File exceeds maximum size of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`);
  }
  if (isDangerousMimeType(file.type)) {
    throw new Error('Dangerous file type rejected');
  }

  // Strip EXIF metadata
  const cleanBlob = await stripImageMetadata(file);

  // Get dimensions
  const dims = await getImageDimensions(cleanBlob);

  // Generate thumbnail
  let thumbnail: Blob | undefined;
  try {
    thumbnail = await generateThumbnail(file, 200, 200);
  } catch {
    // Thumbnail generation is optional
  }

  return {
    blob: cleanBlob,
    width: dims.width,
    height: dims.height,
    mimeType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    size: cleanBlob.size,
    thumbnail,
  };
}

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
