const DEFAULT_MAX_BYTES = 4_500_000; // ~4.5MB safety ceiling

export function safeReadJson(storage, key, fallbackValue) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[Storage] Failed to parse "${key}":`, error);
    return fallbackValue;
  }
}

export function safeWriteJson(storage, key, value, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > maxBytes) {
      console.warn(`[Storage] Skipped "${key}" write: payload exceeds ${maxBytes} bytes`);
      return false;
    }

    storage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      console.warn(`[Storage] Quota exceeded while saving "${key}"`);
      return false;
    }
    console.warn(`[Storage] Failed to write "${key}":`, error);
    return false;
  }
}
