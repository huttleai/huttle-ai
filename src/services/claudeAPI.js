import { supabase } from '../config/supabase';

const CLAUDE_PROXY_URL = '/api/ai/claude';

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn('Could not get auth session:', e);
  }
  return headers;
}

export async function callClaudeAPI(messages, temperature = 0.7) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(CLAUDE_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      temperature,
      model: 'claude-sonnet-4-6-20250514'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 503) {
      throw new Error('This feature is coming soon. Check back shortly.');
    }
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}
