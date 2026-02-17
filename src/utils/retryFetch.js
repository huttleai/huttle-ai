import { API_RETRY, RETRYABLE_STATUS_CODES } from '../config/apiConfig';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTimeoutSignal(timeoutMs, externalSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

export async function retryFetch(
  url,
  options = {},
  {
    timeoutMs,
    maxRetries = API_RETRY.MAX_RETRIES,
    baseDelayMs = API_RETRY.BASE_DELAY_MS,
  } = {}
) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const timeoutWrapper = createTimeoutSignal(timeoutMs, options.signal);

    try {
      const response = await fetch(url, {
        ...options,
        signal: timeoutWrapper.signal,
      });

      timeoutWrapper.clear();

      if (!response.ok && RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 250);
        await sleep(baseDelayMs * (2 ** attempt) + jitter);
        continue;
      }

      return response;
    } catch (error) {
      timeoutWrapper.clear();
      lastError = error;

      if (attempt >= maxRetries) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 250);
      await sleep(baseDelayMs * (2 ** attempt) + jitter);
    }
  }

  throw lastError || new Error('Request failed');
}
