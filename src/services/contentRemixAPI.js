import { API_TIMEOUTS } from '../config/apiConfig';
import { retryFetch } from '../utils/retryFetch';

const CONTENT_REMIX_PROXY_URL = '/api/ai/content-remix';
const CONTENT_REMIX_TIMEOUT_MS = Math.min(API_TIMEOUTS.STANDARD, 46000);

function formatSectionsAsContent(sections) {
  if (!Array.isArray(sections)) return '';

  return sections
    .map((section) => {
      if (!section?.platform || !Array.isArray(section?.variations)) {
        return '';
      }

      const formattedVariations = section.variations
        .filter((variation) => typeof variation === 'string' && variation.trim())
        .map((variation, index) => `Variation ${index + 1}: ${variation.trim()}`)
        .join('\n\n');

      if (!formattedVariations) {
        return '';
      }

      return `### ${section.platform}\n${formattedVariations}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const { supabase } = await import('../config/supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.warn('[contentRemixAPI] Could not get auth session:', error.message);
  }

  return headers;
}

function createRequestError(message, errorType) {
  const error = new Error(message);
  error.errorType = errorType;
  return error;
}

function mapHttpErrorType(status, errorType) {
  if (errorType) return errorType;
  if (status === 400) return 'VALIDATION';
  if (status === 504) return 'TIMEOUT';
  if (status === 502) return 'INVALID_RESPONSE';
  return 'UNKNOWN';
}

function resolveContentRemixGoal(payload) {
  const g = payload?.goal;
  if (g === 'salesConversion' || g === 'viralReach') return g;
  const m = typeof payload?.mode === 'string' ? payload.mode.trim().toLowerCase() : '';
  if (m === 'sales' || m === 'sales_conversion') return 'salesConversion';
  return 'viralReach';
}

export async function generateContentRemix(payload) {
  if (!payload?.userId) {
    throw new Error('User ID is required');
  }
  if (!payload?.originalContent?.trim()) {
    throw new Error('Original content is required');
  }
  if (!Array.isArray(payload?.platforms) || payload.platforms.length === 0) {
    throw new Error('At least one platform is required');
  }

  const goal = resolveContentRemixGoal(payload);

  try {
    const headers = await getAuthHeaders();
    const response = await retryFetch(
      CONTENT_REMIX_PROXY_URL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: payload.userId,
          originalContent: payload.originalContent,
          mode: payload.mode,
          goal,
          platforms: payload.platforms,
          brandVoice: payload.brandVoice || 'engaging',
          additionalContext: payload.additionalContext || {},
        }),
      },
      {
        timeoutMs: CONTENT_REMIX_TIMEOUT_MS,
        // Claude remix requests are long-running, so fail over to Grok quickly instead of retrying for another full cycle.
        maxRetries: 0,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw createRequestError(
        result.error || `API error: ${response.status}`,
        mapHttpErrorType(response.status, result.errorType)
      );
    }

    const sections = Array.isArray(result.sections) ? result.sections : [];
    const content = typeof result.content === 'string' && result.content.trim()
      ? result.content
      : formatSectionsAsContent(sections);

    if (!content && sections.length === 0) {
      return {
        success: false,
        error: 'Content remix response did not include generated content.',
        errorType: 'INVALID_RESPONSE',
      };
    }

    return {
      success: true,
      content,
      sections,
      metadata: result.metadata || {},
      usage: result.usage,
    };
  } catch (error) {
    let errorType = error.errorType || 'UNKNOWN';

    if (error.name === 'AbortError' || error.message?.toLowerCase().includes('timeout')) {
      errorType = 'TIMEOUT';
    } else if (
      error.message?.includes('Failed to fetch')
      || error.message?.toLowerCase().includes('network')
    ) {
      errorType = 'NETWORK';
    } else if (error.message?.toLowerCase().includes('required')) {
      errorType = 'VALIDATION';
    }

    return {
      success: false,
      error: error.message,
      errorType,
    };
  }
}
