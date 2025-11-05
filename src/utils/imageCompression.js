import imageCompression from 'browser-image-compression';
import { TIER_LIMITS, TIERS } from '../config/supabase';

/**
 * Get compression settings based on user tier
 */
export function getCompressionSettings(userTier) {
  const settings = {
    [TIERS.FREE]: {
      maxSizeMB: 0.5, // 500KB max
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    },
    [TIERS.ESSENTIALS]: {
      maxSizeMB: 1, // 1MB max
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    },
    [TIERS.PRO]: {
      maxSizeMB: 2, // 2MB max
      maxWidthOrHeight: 2560,
      useWebWorker: true,
    },
  };

  return settings[userTier] || settings[TIERS.FREE];
}

/**
 * Compress an image file before upload
 */
export async function compressImage(file, userTier) {
  try {
    // Skip compression for non-image files
    if (!file.type.startsWith('image/')) {
      return {
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        savingsMB: 0,
        savingsPercent: 0,
        wasCompressed: false,
      };
    }

    const originalSize = file.size;
    const settings = getCompressionSettings(userTier);

    // Compress the image
    const compressedFile = await imageCompression(file, settings);
    const compressedSize = compressedFile.size;

    // Calculate savings
    const savingsMB = (originalSize - compressedSize) / (1024 * 1024);
    const savingsPercent = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

    return {
      compressedFile,
      originalSize,
      compressedSize,
      savingsMB: Math.max(0, savingsMB),
      savingsPercent: Math.max(0, Math.round(savingsPercent)),
      wasCompressed: true,
      settings,
    };
  } catch (error) {
    console.warn('Image compression failed, using original file:', error);

    // Return original file if compression fails
    return {
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      savingsMB: 0,
      savingsPercent: 0,
      wasCompressed: false,
      error: error.message,
    };
  }
}

/**
 * Get tier-based max file size for display
 */
export function getMaxFileSizeDisplay(userTier) {
  const limits = {
    [TIERS.FREE]: '500KB',
    [TIERS.ESSENTIALS]: '1MB',
    [TIERS.PRO]: '2MB',
  };

  return limits[userTier] || limits[TIERS.FREE];
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is already within tier limits (no compression needed)
 */
export function shouldCompress(file, userTier) {
  const settings = getCompressionSettings(userTier);
  const maxSizeBytes = settings.maxSizeMB * 1024 * 1024;

  // Only compress if file is larger than tier limit
  return file.size > maxSizeBytes;
}
