/**
 * Builds the n8n system prompt for the Anthropic Chat Model node.
 * This prompt forces the AI to generate content-type-specific blueprints.
 */
export function buildN8nSystemPrompt(context) {
  const {
    platform = 'Instagram',
    content_type = 'Image Post',
    required_sections = [],
    optional_sections = [],
    excluded_sections = [],
    viral_score_weights = {},
    blueprint_label = '',
    topic = '{{topic}}',
    goal = '{{goal}}',
    niche = '{{niche}}',
    target_audience = '{{target_audience}}',
    brand_voice_tone = '{{brand_voice_tone}}',
  } = context;

  const weightKeys = Object.keys(viral_score_weights);
  const weightExample = weightKeys.map(k => `      "${k}": <number 0-${viral_score_weights[k]}>`).join(',\n');

  const sectionSchemaHints = required_sections.map(s => {
    return `      "${s}": { /* relevant sub-fields for ${s.replace(/_/g, ' ')} */ }`;
  }).join(',\n');

  return `You are generating a ${content_type} blueprint for ${platform}. Everything you produce must be structured, written, and optimized specifically for this format. Do not include any content that is not relevant to a ${content_type}.

CONTEXT:
- Blueprint Label: ${blueprint_label}
- Topic: ${topic}
- Goal: ${goal}
- Niche: ${niche}
- Target Audience: ${target_audience}
- Brand Voice/Tone: ${brand_voice_tone}

STRICT EXCLUSION RULES:
NEVER include these sections in your response: ${excluded_sections.join(', ')}.
If you include any of these, the response will be rejected.

REQUIRED SECTIONS:
Your response must include ONLY these sections: ${required_sections.join(', ')}.
You may optionally include: ${optional_sections.join(', ')}.

OUTPUT FORMAT — Return ONLY this exact JSON structure:
{
  "viral_score": <number 0-100>,
  "viral_score_breakdown": {
${weightExample}
  },
  "sections": {
${sectionSchemaHints}
  },
  "what_makes_this_viral": "<string: 2-3 sentences explaining why this blueprint is built to perform>",
  "pro_tips": ["<string>", "<string>", "<string>"]
}

SECTION DATA STRUCTURE GUIDELINES:

For "hook_text" or "hook": { "variations": [{ "text": "<hook text>", "character_count": <number> }], "power_words": ["<word>", ...] }
For "visual_composition": { "shot_framing": "<string>", "color_palette": [{ "hex": "#XXXXXX", "name": "<name>" }], "lighting_style": "<string>", "composition_rule": "<string>", "props_environment": ["<suggestion>", ...], "what_not_to_do": "<string>" }
For "directors_cut": { "scenes": [{ "scene_number": <number>, "shot_type": "<string>", "on_screen_text": "<string>", "action_description": "<string>", "b_roll_suggestion": "<string>" }], "estimated_runtime": "<string>" }
For "script": { "full_script": "<string with spoken word formatting>", "word_count": <number>, "estimated_read_time": "<string>", "timestamps": [{ "time": "<timestamp>", "label": "<description>" }] }
For "audio_vibe": { "options": [{ "mood": "<string>", "genre_style": "<string>", "bpm_label": "<string>" }], "trending_sound_tip": "<string>" }
For "caption_framework": { "variations": [{ "style": "Short/Punchy|Storytelling|Question-Based", "text": "<caption>", "character_count": <number>, "emoji_placement": "<suggestion>" }], "line_break_guide": "<string>" }
For "hashtag_strategy": { "tiers": { "niche": { "hashtags": ["#tag", ...], "reach_range": "<string>" }, "mid": { "hashtags": [...], "reach_range": "<string>" }, "broad": { "hashtags": [...], "reach_range": "<string>" } } }
For "carousel_structure": { "slides": [{ "headline": "<string>", "key_point": "<string>", "visual_direction": "<string>" }], "total_slides": <number>, "save_bait_explanation": "<string>" }
For "story_arc": { "frames": [{ "visual_description": "<string>", "text_overlay": "<string>", "interactive_element": "<string>" }], "interactive_suggestions": ["Poll", "Quiz", ...], "link_cta_placement": "<string>" }
For "thread_structure": { "tweets": [{ "text": "<tweet text>", "character_count": <number> }] }
For "article_structure": { "headline": "<string>", "intro": "<string>", "body_sections": [{ "header": "<string>", "content": "<string>" }], "conclusion_cta": "<string>" }
For "thumbnail_concept": { "layout": "<string>", "text_overlay": "<string>", "expression": "<string>", "color_contrast": "<string>", "tip": "<string>" }
For "duet_stitch_potential": { "duet_score": <number 1-10>, "stitch_score": <number 1-10>, "hook_phrase": "<string>", "response_prompt": "<string>" }
For "boost_readiness_score": { "score": <number 0-100>, "reasons": ["<string>", ...], "audience_targeting": "<string>", "budget_recommendation": "<string>" }
For "cta": { "variations": [{ "text": "<cta text>", "placement": "<where to place it>" }] }
For "posting_time": { "windows": [{ "time": "<time range>", "reason": "<string>" }], "day_recommendation": "<string>", "timezone_note": "<string>", "frequency": "<string>" }

Output ONLY the raw JSON object. No markdown. No code fences. No explanation before or after. No \`\`\`json wrapper. The first character of your response must be { and the last must be }. Any deviation will cause a system error.`;
}
