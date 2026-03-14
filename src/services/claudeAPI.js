import { supabase } from '../config/supabase';
import { buildPromptBrandSection, getPromptBrandProfile } from '../utils/brandContextBuilder';

const CLAUDE_PROXY_URL = '/api/ai/claude';
const CLAUDE_MODEL = 'claude-sonnet-4-6-20250514';

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
      model: CLAUDE_MODEL
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

export async function enhanceCaptionWithClaude({ caption, platform, topic, selectedHook }, brandData = null) {
  const messages = [
    {
      role: 'system',
      content: 'You are an expert social media copywriter. Take this caption and enhance it to be more compelling, emotionally resonant, and platform-native while preserving the creator\'s brand voice exactly. Do not change the core message.',
    },
    {
      role: 'user',
      content: `${buildPromptBrandSection(brandData, { platforms: [platform || 'instagram'] })}

Topic: ${topic || 'General post'}
Platform: ${platform || 'instagram'}
Hook: ${selectedHook || 'None provided'}

Enhance this caption for stronger platform-native performance while keeping the same meaning and brand voice:

${caption}

Return only the improved caption.`,
    },
  ];

  const data = await callClaudeAPI(messages, 0.4);

  return {
    success: true,
    caption: data.content || caption,
    usage: data.usage,
  };
}

export async function humanizeContentWithClaude(content, brandData = null, platform = null) {
  const promptProfile = getPromptBrandProfile(brandData, {
    platforms: platform ? [platform] : undefined,
  });
  const selectedPlatform = platform || promptProfile.platforms?.[0] || 'instagram';
  const niche = promptProfile.niche || 'Small Business';
  const messages = [
    {
      role: 'system',
      content: 'You are an expert at making AI-generated content sound authentically human.',
    },
    {
      role: 'user',
      content: `${buildPromptBrandSection(brandData, {
        niche,
        platforms: [selectedPlatform],
      })}

You are an expert at making AI-generated content sound authentically human. Rewrite the following content so it sounds like a real person wrote it — not an AI.

Rules:
- Vary sentence length naturally (mix short punchy sentences with longer ones)
- Use conversational language appropriate for ${selectedPlatform}
- Remove any phrases that sound overly formal, corporate, or AI-generated
- Keep the core message, hook, and CTA intact
- Match the tone to ${niche} — a fitness coach sounds different from a med spa owner
- Do not add hashtags or emojis unless they were in the original
- Do not explain what you changed — return only the rewritten content

Original content:
${content}`,
    },
  ];

  const data = await callClaudeAPI(messages, 0.4);

  return {
    success: true,
    content: data.content || content,
    usage: data.usage,
  };
}
