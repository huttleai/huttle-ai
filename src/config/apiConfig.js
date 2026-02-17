export const API_TIMEOUTS = {
  FAST: 30000,
  STANDARD: 60000,
  LONG: 120000,
};

export const API_RETRY = {
  MAX_RETRIES: 2,
  BASE_DELAY_MS: 750,
};

export const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
