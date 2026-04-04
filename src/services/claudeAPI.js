import { supabase } from '../config/supabase';
import { buildPromptBrandSection, getPromptBrandProfile } from '../utils/brandContextBuilder';
import { buildBrandContext as buildCreatorBrandBlock } from '../utils/buildBrandContext'; // HUTTLE AI: brand context injected
import { buildUserContextBlock } from '../utils/buildUserContext';
import { getPlatform } from '../utils/platformGuidelines';
import { parseFullPostHookList } from '../utils/fullPostHooksParser';
import { HUMAN_WRITING_RULES } from '../utils/humanWritingRules';

const CLAUDE_PROXY_URL = '/api/ai/claude';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

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

export async function callClaudeAPI(messages, temperature = 0.7, options = {}) {
  const headers = await getAuthHeaders();
  const payload = {
    messages,
    temperature,
    model: CLAUDE_MODEL,
  };
  if (options && Number.isFinite(Number(options.max_tokens))) {
    payload.max_tokens = Number(options.max_tokens);
  }

  const response = await fetch(CLAUDE_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
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

export async function enhanceCaptionWithClaude(
  { caption, platform, topic, selectedHook, goal, audience, brandVoice },
  brandData = null,
) {
  const brandBlock = buildCreatorBrandBlock(brandData, brandData);
  const plat = platform || 'instagram';
  const platformData = getPlatform(plat);
  const goalLine = goal || 'engagement';
  const audienceLine =
    audience
    || getPromptBrandProfile(brandData, { platforms: [plat] }).targetAudience
    || 'the target audience';
  const voiceLine =
    brandVoice
    || getPromptBrandProfile(brandData, { platforms: [plat] }).tone
    || 'authentic';
  const captionUserCtx = buildUserContextBlock(brandData);

  const messages = [
    {
      role: 'system',
      content: `${captionUserCtx ? `${captionUserCtx}\n\n` : ''}${brandBlock}You are a senior social copy editor. Polish the caption for clarity, specificity, storytelling flow, and emotional resonance on ${platformData?.name || plat}.

Rules:
- Preserve all factual claims and offers exactly — do not invent discounts, guarantees, medical outcomes, or services not stated in the original.
- Keep length appropriate for ${platformData?.name || plat} feed copy (not a blog post).
- No markdown. No hashtag block unless the original already had one.
- Return ONLY the improved caption text.

Style rule:
- Follow standard English capitalization.
- Only capitalize the first word of a sentence and proper nouns (brands, clinic names, product names).
- Treatment and procedure names such as "microneedling", "botox", "fillers", "chemical peel", and "CO2 laser" should be lowercase when used in the middle of a sentence, unless they are part of an official brand name.

${HUMAN_WRITING_RULES}`,
    },
    {
      role: 'user',
      content: `${buildPromptBrandSection(brandData, { platforms: [plat] })}

Context:
- Topic: ${topic || 'General post'}
- Platform: ${platformData?.name || plat}
- Goal: ${goalLine}
- Audience: ${audienceLine}
- Brand voice / tone: ${voiceLine}
- Opening hook in use: ${selectedHook || 'None provided'}

Current caption:
${caption}

Improve clarity, specificity, and CTA strength while keeping the same core meaning and voice.`,
    },
  ];

  try {
    const data = await callClaudeAPI(messages, 0.35);
    const next = String(data.content || '').trim();
    if (!next) {
      return { success: false, error: 'Empty enhancement response', caption: String(caption || '').trim() };
    }
    return {
      success: true,
      caption: next,
      usage: data.usage,
    };
  } catch (e) {
    return {
      success: false,
      error: e?.message || 'Enhancement failed',
      caption: String(caption || '').trim(),
    };
  }
}

/**
 * Full Post Builder — primary hook generator (Claude Sonnet).
 * @returns {{ success: boolean, hooks?: string[], error?: string, code?: string }}
 */
export async function generateFullPostHooksWithClaude(
  {
    topic,
    hookType = 'Question',
    platform = 'instagram',
    goal,
    audience: audienceOverride,
    formatType,
    nicheAngle,
    trendDescription,
  },
  brandData,
  options = {},
) {
  const topicTrimmed = String(topic ?? '').trim();
  if (!topicTrimmed) {
    return { success: false, code: 'TOPIC_EMPTY', error: 'Topic required' };
  }

  const promptProfile = getPromptBrandProfile(brandData, { platforms: [platform] });
  const platformData = getPlatform(platform);
  const platformName = platformData?.name || platform;
  const goalLabel = goal || 'engagement';
  const trendBlock = [formatType && `Format: ${formatType}`, nicheAngle && `Niche angle: ${nicheAngle}`, trendDescription && `Trend brief: ${trendDescription}`]
    .filter(Boolean)
    .join('\n');

  const passedAudience = audienceOverride != null ? String(audienceOverride).trim() : '';
  const audience = passedAudience || promptProfile.targetAudience || 'followers';
  const tone = promptProfile.tone || 'authentic';

  const fullPostHooksUserCtx = buildUserContextBlock(brandData);
  const system = `${fullPostHooksUserCtx ? `${fullPostHooksUserCtx}\n\n` : ''}${buildCreatorBrandBlock(brandData, brandData) || ''}
You write scroll-stopping social hooks. Output exactly as the user specifies.

${HUMAN_WRITING_RULES}`.trim();

  const hookRequirementInject = String(options.fullPostBuilderHookRequirement ?? '').trim();

  const user = `${buildPromptBrandSection(brandData, { platforms: [platform] })}

You are an expert social media content strategist for ${platformName}.

Your job is to write 5 scroll-stopping hooks for this EXACT topic: "${topicTrimmed}"

Target audience: ${audience}
Platform: ${platformName}
Hook style: ${hookType}
Goal: ${goalLabel}
Tone: ${tone}

STRICT RULES — you MUST follow all of these:

1. Every hook must be specifically about "${topicTrimmed}" — not a generic topic it could be swapped into.
   BAD: "Ready to transform your skin?" (could be for anything)
   GOOD: "Most acne scars from microneedling don't need 5 sessions — here's why yours might only need 2."

2. Each of the 5 hooks must use a DIFFERENT angle. Use one hook for each of these 5 types:
   - Type A (Specific Stat or Fact): Lead with a real or realistic number specific to this topic.
   - Type B (Buried Objection): Open with the #1 reason someone is afraid of or skeptical about this topic, then flip it.
   - Type C (Outcome-First Story): Start in the middle of a transformation specific to this treatment/result.
   - Type D (Counter-Intuitive Truth): Say something true that most people in this niche get completely wrong.
   - Type E (Direct Qualifier): Speak directly to the exact right person and their exact situation.

3. Each hook must be 8–18 words MAX. Short, punchy, scroll-stopping.

4. Do NOT use any of these phrases or patterns:
   - "Ready to [verb]?"
   - "Discover the [noun] of [X]"
   - "Transform your [body part]"
   - "Are you struggling with [X]?"
   - "Let us show you how"
   - Any sentence that could apply to a DIFFERENT treatment by swapping one noun.

5. Output ONLY a JSON array of 5 strings. No labels, no markdown, no explanation.
   Example format: ["Hook 1 text", "Hook 2 text", "Hook 3 text", "Hook 4 text", "Hook 5 text"]

Style rule:
- Follow standard English capitalization.
- Only capitalize the first word of a sentence and proper nouns (brands, clinic names, product names).
- Treatment and procedure names such as "microneedling", "botox", "fillers", "chemical peel", and "CO2 laser" should be lowercase when used in the middle of a sentence, unless they are part of an official brand name.
${trendBlock ? `Extra context:\n${trendBlock}\n` : ''}${hookRequirementInject ? `${hookRequirementInject}\n` : ''}`;

  try {
    const data = await callClaudeAPI(
      [
        { role: 'system', content: system.trim() },
        { role: 'user', content: user },
      ],
      0.65,
    );
    const raw = String(data.content || '').trim();
    if (!raw) {
      return { success: false, code: 'HOOKS_EMPTY', error: 'Empty response' };
    }
    const hooks = parseFullPostHookList(raw);
    if (!hooks.length) {
      return { success: false, code: 'HOOKS_EMPTY', error: 'Could not parse hooks', content: raw };
    }
    return { success: true, hooks, usage: data.usage };
  } catch (e) {
    return {
      success: false,
      code: 'CLAUDE_HOOKS_FAILED',
      error: e?.message || 'Hook generation failed',
    };
  }
}

export async function humanizeContentWithClaude(content, brandData = null, platform = null) {
  const promptProfile = getPromptBrandProfile(brandData, {
    platforms: platform ? [platform] : undefined,
  });
  const selectedPlatform = platform || promptProfile.platforms?.[0] || 'instagram';
  const niche = promptProfile.niche || 'Small Business';
  const brandBlock = buildCreatorBrandBlock(brandData, brandData); // HUTTLE AI: brand context injected
  const messages = [
    {
      role: 'system',
      content: `${brandBlock}You are an expert at making AI-generated content sound authentically human.

${HUMAN_WRITING_RULES}`, // HUTTLE AI: brand context injected
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
