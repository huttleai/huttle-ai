import { PLATFORM_CONTENT_RULES, getAlgorithmHashtagBounds } from './platformContentRules';

/**
 * Platform Algorithm Alignment Signals
 * Last updated: March 2026 — update monthly
 *
 * Weighted ranking signals per platform. Weights sum to 100 per platform.
 * Each signal includes a `check` function that receives the full content string
 * and returns { pass: boolean, detail: string, fix?: string }.
 */

export const lastUpdated = 'March 2026';

const IG_HT = getAlgorithmHashtagBounds('instagram');
const TT_HT = getAlgorithmHashtagBounds('tiktok');
const YT_HT = getAlgorithmHashtagBounds('youtube');
const YT_TITLE_CAP = PLATFORM_CONTENT_RULES.youtube.caption.titleMaxChars;
const X_CHAR_LIMIT = PLATFORM_CONTENT_RULES.x.caption.maxChars;

const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;
const sentenceCount = (text) => text.split(/[.!?]+/).filter((s) => s.trim()).length;
const hasPattern = (text, pattern) => pattern.test(text);
const countHashtags = (text) => (text.match(/#\w+/g) || []).length;
const firstSentence = (text) => (text.match(/^[^.!?\n]+[.!?]?/) || [''])[0].trim();
const containsYou = (text) => /\byou\b|\byour\b/i.test(text);
const containsQuestion = (text) => /\?/.test(text);
const containsLink = (text) => /https?:\/\/\S+|www\.\S+/i.test(text);
const paragraphs = (text) => text.split(/\n\s*\n/).filter((p) => p.trim());
const lines = (text) => text.split(/\n/).filter((l) => l.trim());

export const algorithmSignals = {
  instagram: {
    name: 'Instagram',
    signals: [
      {
        id: 'hook',
        label: 'Hook in first 1-3 seconds',
        weight: 25,
        check: (text) => {
          const first = firstSentence(text);
          const wc = wordCount(first);
          const pass = wc > 0 && wc <= 12;
          return {
            pass,
            detail: pass
              ? `Opening hook is ${wc} words — punchy and scroll-stopping`
              : `Opening is ${wc} words — trim to under 12 for a stronger hook`,
            fix: pass ? null : 'Rewrite your first sentence to be under 12 words with a bold claim, question, or surprising stat.',
          };
        },
      },
      {
        id: 'cta_saves_shares',
        label: 'CTA driving saves or shares',
        weight: 20,
        check: (text) => {
          const pass = hasPattern(text, /\b(save|share|send this|bookmark|tag a friend)\b/i);
          return {
            pass,
            detail: pass
              ? 'CTA encourages saves or shares — high-value engagement signals'
              : 'No save/share CTA detected',
            fix: pass ? null : 'Add a CTA like "Save this for later" or "Share with someone who needs this."',
          };
        },
      },
      {
        id: 'niche_keywords',
        label: 'Niche-specific keywords in caption',
        weight: 15,
        check: (text) => {
          const wc = wordCount(text);
          const pass = wc >= 20;
          return {
            pass,
            detail: pass
              ? `Caption has ${wc} words with niche context`
              : `Caption is only ${wc} words — add more niche-specific language`,
            fix: pass ? null : 'Expand your caption with keywords your target audience searches for.',
          };
        },
      },
      {
        id: 'audio_reference',
        label: 'Trending or original audio referenced',
        weight: 15,
        check: (text) => {
          const pass = hasPattern(text, /\b(audio|sound|song|music|track|🎵|🎶|♫)\b/i);
          return {
            pass,
            detail: pass
              ? 'Audio reference detected — boosts Reels discovery'
              : 'No audio reference found in copy',
            fix: pass ? null : 'Mention the audio/sound you plan to use, or note "original audio" for the algorithm.',
          };
        },
      },
      {
        id: 'hashtag_count',
        label: `${IG_HT.optimal} relevant hashtags`,
        weight: 10,
        check: (text) => {
          const count = countHashtags(text);
          const pass = count >= IG_HT.min && count <= IG_HT.max;
          return {
            pass,
            detail: pass
              ? `${count} hashtags — within the optimal ${IG_HT.optimal} range`
              : `${count} hashtags — Instagram favors ${IG_HT.label.toLowerCase()}`,
            fix: pass
              ? null
              : count < IG_HT.min
                ? `Add ${IG_HT.min}–${IG_HT.max} niche-specific hashtags.`
                : `Reduce to ${IG_HT.min}–${IG_HT.max} highly relevant hashtags.`,
          };
        },
      },
      {
        id: 'reel_length',
        label: 'Optimal Reel length noted (15-60s)',
        weight: 15,
        check: (text) => {
          const pass = hasPattern(text, /\b(\d+\s*s(ec(ond)?s?)?|reel|video|clip|short)\b/i);
          return {
            pass,
            detail: pass
              ? 'Video/Reel format referenced in copy'
              : 'No video length or format reference detected',
            fix: pass ? null : 'Reference the content format (e.g., "15s Reel" or "60-second video") for clarity.',
          };
        },
      },
    ],
  },

  tiktok: {
    name: 'TikTok',
    signals: [
      {
        id: 'hook_interrupt',
        label: 'Hook question or pattern interrupt in first 2 seconds',
        weight: 30,
        check: (text) => {
          const first = firstSentence(text);
          const wc = wordCount(first);
          const isQuestion = containsQuestion(first);
          const pass = wc <= 10 || isQuestion;
          return {
            pass,
            detail: pass
              ? isQuestion ? 'Opening question creates instant engagement' : `Hook is ${wc} words — fast pattern interrupt`
              : `Opening is ${wc} words with no question — needs a stronger interrupt`,
            fix: pass ? null : 'Start with a bold question or surprising statement under 10 words.',
          };
        },
      },
      {
        id: 'direct_address',
        label: 'Direct address using "you" or "your"',
        weight: 20,
        check: (text) => {
          const pass = containsYou(text);
          return {
            pass,
            detail: pass
              ? 'Directly addresses the viewer — builds personal connection'
              : 'No direct "you/your" address found',
            fix: pass ? null : 'Rewrite to speak directly to the viewer: "You need to try this" instead of "People should try this."',
          };
        },
      },
      {
        id: 'trending_sound',
        label: 'Trending sound referenced',
        weight: 15,
        check: (text) => {
          const pass = hasPattern(text, /\b(sound|audio|song|trending|viral|music|🎵|🎶)\b/i);
          return {
            pass,
            detail: pass
              ? 'Sound/audio reference detected — boosts For You page reach'
              : 'No trending sound reference',
            fix: pass ? null : 'Mention the sound you plan to use or note "trending audio" in your copy.',
          };
        },
      },
      {
        id: 'niche_hashtags',
        label: `${TT_HT.optimal} niche hashtags only`,
        weight: 10,
        check: (text) => {
          const count = countHashtags(text);
          const pass = count >= TT_HT.min && count <= TT_HT.max;
          return {
            pass,
            detail: pass
              ? `${count} niche hashtags — TikTok sweet spot`
              : `${count} hashtags — TikTok favors ${TT_HT.label.toLowerCase()}`,
            fix: pass
              ? null
              : count < TT_HT.min
                ? `Add ${TT_HT.min}–${TT_HT.max} niche hashtags.`
                : `Trim to ${TT_HT.min}–${TT_HT.max} of your most relevant hashtags.`,
          };
        },
      },
      {
        id: 'single_topic',
        label: 'Clear singular topic focus',
        weight: 15,
        check: (text) => {
          const sc = sentenceCount(text);
          const wc = wordCount(text);
          const pass = wc <= 150 || sc <= 8;
          return {
            pass,
            detail: pass
              ? 'Content is focused — single topic clarity'
              : 'Content may be too sprawling — TikTok rewards tight focus',
            fix: pass ? null : 'Cut to one clear topic. Remove tangents and secondary points.',
          };
        },
      },
      {
        id: 'text_overlay',
        label: 'Text overlay language match noted',
        weight: 10,
        check: (text) => {
          const pass = hasPattern(text, /\b(text|overlay|caption|subtitle|on-screen)\b/i);
          return {
            pass,
            detail: pass
              ? 'Text overlay reference detected'
              : 'No text overlay mention — on-screen text boosts watch time',
            fix: pass ? null : 'Note planned on-screen text or captions to boost accessibility and watch time.',
          };
        },
      },
    ],
  },

  twitter: {
    name: 'X / Twitter',
    signals: [
      {
        id: 'first_sentence_short',
        label: 'First sentence under 8 words',
        weight: 20,
        check: (text) => {
          const first = firstSentence(text);
          const wc = wordCount(first);
          const pass = wc > 0 && wc <= 8;
          return {
            pass,
            detail: pass
              ? `Opening is ${wc} words — sharp and scannable`
              : `Opening is ${wc} words — X rewards ultra-short openers`,
            fix: pass ? null : 'Cut your first sentence to 8 words or fewer.',
          };
        },
      },
      {
        id: 'opinion_controversy',
        label: 'Strong opinion or controversy angle',
        weight: 20,
        check: (text) => {
          const pass = hasPattern(text, /\b(unpopular opinion|hot take|controversial|truth is|most people|nobody talks about|stop|wrong|myth|overrated|underrated)\b/i);
          return {
            pass,
            detail: pass
              ? 'Opinion/controversy angle detected — drives replies'
              : 'No strong opinion signal found',
            fix: pass ? null : 'Add a bold stance like "Unpopular opinion:" or "Most people get this wrong."',
          };
        },
      },
      {
        id: 'no_external_link',
        label: 'No external link in main body',
        weight: 20,
        check: (text) => {
          const pass = !containsLink(text);
          return {
            pass,
            detail: pass
              ? 'No external links — X suppresses posts with outbound links'
              : 'External link detected — X reduces reach for posts with links',
            fix: pass ? null : 'Remove the link from the main post. Put it in a reply instead.',
          };
        },
      },
      {
        id: 'reply_bait',
        label: 'Reply-bait CTA present',
        weight: 15,
        check: (text) => {
          const pass = hasPattern(text, /\b(reply|comment|agree|disagree|thoughts|debate|what do you think|drop a|let me know)\b/i);
          return {
            pass,
            detail: pass
              ? 'Reply-bait CTA found — boosts engagement signals'
              : 'No reply-driving CTA detected',
            fix: pass ? null : 'End with "Agree or disagree?" or "Reply with your take."',
          };
        },
      },
      {
        id: 'engaging_question',
        label: 'Engaging question or debate hook',
        weight: 15,
        check: (text) => {
          const pass = containsQuestion(text);
          return {
            pass,
            detail: pass
              ? 'Question detected — invites replies and engagement'
              : 'No question found — questions drive 2x more replies on X',
            fix: pass ? null : 'Add a direct question to spark debate.',
          };
        },
      },
      {
        id: 'thread_format',
        label: 'Thread format indicated for long content',
        weight: 10,
        check: (text) => {
          const wc = wordCount(text);
          const isLong = text.length > X_CHAR_LIMIT || wc > 50;
          const hasThreadSignal = hasPattern(text, /\b(thread|🧵|1\/|part 1)\b/i);
          const pass = !isLong || hasThreadSignal;
          return {
            pass,
            detail: pass
              ? isLong ? 'Thread format indicated for long content' : 'Content fits single-post format'
              : 'Long content without thread indicator — consider a thread',
            fix: pass
              ? null
              : `For content over ${X_CHAR_LIMIT} chars, break into a thread. Start with "🧵 Thread:"`,
          };
        },
      },
    ],
  },

  youtube: {
    name: 'YouTube',
    signals: [
      {
        id: 'primary_keyword_early',
        label: 'Primary keyword in first 25 words',
        weight: 25,
        check: (text) => {
          const first25 = text.split(/\s+/).slice(0, 25).join(' ');
          const pass = wordCount(first25) >= 5;
          return {
            pass,
            detail: pass
              ? 'Description opens with keyword-rich content — YouTube indexes the first 25 words heavily'
              : 'Description opening may be too thin for keyword discovery',
            fix: pass ? null : 'Front-load your primary keyword in the first sentence of the description.',
          };
        },
      },
      {
        id: 'timestamps',
        label: 'Timestamps or chapter structure mentioned',
        weight: 20,
        check: (text) => {
          const pass = hasPattern(text, /\b(\d{1,2}:\d{2}|timestamp|chapter|00:00)\b/i);
          return {
            pass,
            detail: pass
              ? 'Timestamps/chapters detected — YouTube rewards structured content'
              : 'No timestamps or chapters found',
            fix: pass ? null : 'Add timestamps (e.g., "00:00 Intro") to enable YouTube chapters and boost watch time.',
          };
        },
      },
      {
        id: 'subscribe_cta',
        label: 'Subscribe CTA present',
        weight: 15,
        check: (text) => {
          const pass = hasPattern(text, /\b(subscribe|sub|hit the bell|notification|join the channel)\b/i);
          return {
            pass,
            detail: pass
              ? 'Subscribe CTA found — reinforces channel growth'
              : 'No subscribe CTA detected',
            fix: pass ? null : 'Add "Subscribe for more [topic]" in the description.',
          };
        },
      },
      {
        id: 'links_section',
        label: 'Links section referenced',
        weight: 15,
        check: (text) => {
          const pass = hasPattern(text, /\b(link|links|resources|mentioned|below|description)\b/i);
          return {
            pass,
            detail: pass
              ? 'Links/resources section referenced'
              : 'No links or resources section found',
            fix: pass ? null : 'Add a "Links & Resources" section to drive clicks and keep viewers in your ecosystem.',
          };
        },
      },
      {
        id: 'keyword_tags',
        label: `${YT_HT.optimal} keyword-rich tags noted`,
        weight: 15,
        check: (text) => {
          const count = countHashtags(text);
          const pass = count >= YT_HT.min && count <= YT_HT.max;
          return {
            pass,
            detail: pass
              ? `${count} tags — strong keyword signal`
              : `${count} tags — aim for ${YT_HT.min}–${YT_HT.max} keyword-rich tags`,
            fix: pass
              ? null
              : count < YT_HT.min
                ? `Add ${YT_HT.min}–${YT_HT.max} keyword-rich hashtags in the description.`
                : `Reduce to ${YT_HT.min}–${YT_HT.max} highly relevant tags.`,
          };
        },
      },
      {
        id: 'hook_sentence',
        label: `Hook sentence under ${YT_TITLE_CAP} characters`,
        weight: 10,
        check: (text) => {
          const first = firstSentence(text);
          const pass = first.length > 0 && first.length <= YT_TITLE_CAP;
          return {
            pass,
            detail: pass
              ? `Hook is ${first.length} chars — concise and compelling`
              : `Hook is ${first.length} chars — trim to under ${YT_TITLE_CAP} for mobile readability`,
            fix: pass ? null : `Shorten your opening sentence to under ${YT_TITLE_CAP} characters.`,
          };
        },
      },
    ],
  },

  facebook: {
    name: 'Facebook',
    signals: [
      {
        id: 'question_debate',
        label: 'Question or debate opener',
        weight: 25,
        check: (text) => {
          const first = firstSentence(text);
          const pass = containsQuestion(first) || hasPattern(first, /\b(debate|opinion|agree|disagree|what if|would you)\b/i);
          return {
            pass,
            detail: pass
              ? 'Question/debate opener — Facebook prioritizes comment-driving content'
              : 'No question or debate hook in opening',
            fix: pass ? null : 'Open with a question or debatable statement to drive comments.',
          };
        },
      },
      {
        id: 'emotional_storytelling',
        label: 'Emotional storytelling angle',
        weight: 20,
        check: (text) => {
          const pass = hasPattern(text, /\b(story|journey|remember when|felt|feeling|heart|emotion|cried|laughed|grateful|blessed|proud|struggled|overcame)\b/i);
          return {
            pass,
            detail: pass
              ? 'Emotional storytelling signals detected — high share potential'
              : 'No emotional story angle found',
            fix: pass ? null : 'Add a personal story element or emotional hook to increase shares.',
          };
        },
      },
      {
        id: 'tag_suggestion',
        label: 'Direct tag suggestion ("Tag a friend who...")',
        weight: 20,
        check: (text) => {
          const pass = hasPattern(text, /\b(tag|mention|share with|send this to|know someone)\b/i);
          return {
            pass,
            detail: pass
              ? 'Tag/share suggestion found — viral loop trigger'
              : 'No tag or share prompt detected',
            fix: pass ? null : 'Add "Tag a friend who needs this" or "Share with someone who..." to create viral loops.',
          };
        },
      },
      {
        id: 'short_paragraphs',
        label: 'Short paragraphs under 3 lines each',
        weight: 15,
        check: (text) => {
          const paras = paragraphs(text);
          const allShort = paras.every((p) => lines(p).length <= 3);
          const pass = paras.length <= 1 || allShort;
          return {
            pass,
            detail: pass
              ? 'Paragraphs are short and scannable'
              : 'Some paragraphs are too long — Facebook users scroll fast',
            fix: pass ? null : 'Break long paragraphs into 1-2 sentence chunks with line breaks.',
          };
        },
      },
      {
        id: 'community_relevance',
        label: 'Local or community relevance',
        weight: 10,
        check: (text) => {
          const pass = hasPattern(text, /\b(community|local|neighborhood|group|together|tribe|family|team|our)\b/i);
          return {
            pass,
            detail: pass
              ? 'Community/local relevance detected — Facebook prioritizes group-relevant content'
              : 'No community-relevant language found',
            fix: pass ? null : 'Reference your community, group, or local audience to boost relevance.',
          };
        },
      },
      {
        id: 'media_pairing',
        label: 'Video or image pairing noted',
        weight: 10,
        check: (text) => {
          const pass = hasPattern(text, /\b(photo|image|video|reel|clip|watch|see|visual|pic|picture|📸|📹|🎥)\b/i);
          return {
            pass,
            detail: pass
              ? 'Media pairing referenced — Facebook heavily favors visual content'
              : 'No media reference — posts with images/video get 2-3x more engagement',
            fix: pass ? null : 'Mention the visual you plan to pair (photo, video, carousel).',
          };
        },
      },
    ],
  },
};

/**
 * Score content against a platform's algorithm signals.
 * @param {string} content - The post content to evaluate
 * @param {string} platformKey - Key from algorithmSignals (instagram, tiktok, twitter, youtube, facebook)
 * @returns {{ overallScore: number, results: Array<{id,label,weight,pass,detail,fix}>, algorithmReady: boolean }}
 */
export function checkAlgorithmAlignment(content, platformKey) {
  const platform = algorithmSignals[platformKey];
  if (!platform || !content?.trim()) {
    return { overallScore: 0, results: [], algorithmReady: false, platformName: platform?.name || platformKey };
  }

  const text = content.trim();
  let earnedWeight = 0;

  const results = platform.signals.map((signal) => {
    const result = signal.check(text);
    if (result.pass) earnedWeight += signal.weight;
    return {
      id: signal.id,
      label: signal.label,
      weight: signal.weight,
      pass: result.pass,
      detail: result.detail,
      fix: result.fix || null,
    };
  });

  const overallScore = Math.round(earnedWeight);

  return {
    overallScore,
    results,
    algorithmReady: overallScore >= 85,
    platformName: platform.name,
  };
}
