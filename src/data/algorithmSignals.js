/**
 * Platform Algorithm Alignment Signals — Layer 1 rules engine
 * Each signal: id, label, weight, platforms, contentTypes, check(), fixTemplate
 * check(content) -> { score: 0 | 0.5 | 1, reason: string }
 */

export const lastUpdated = 'March 2026';

/** @type {Record<string, string>} Default content type when callers omit it (legacy embeds, grok pack). */
export const DEFAULT_CONTENT_TYPE_BY_PLATFORM = {
  instagram: 'static_post',
  tiktok: 'short',
  twitter: 'post',
  youtube: 'long_form',
  facebook: 'post',
};

const PLATFORM_NAMES = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const firstSentence = (text) => (String(text || '').match(/^[^.!?\n]+[.!?]?/) || [''])[0].trim();
const firstLine = (text) => String(text || '').split('\n').find((l) => l.trim())?.trim() || '';
const countHashtags = (text) => (String(text || '').match(/#\w+/g) || []).length;
const sentences = (text) =>
  String(text || '')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
const lastSentence = (text) => {
  const s = sentences(text);
  return s.length ? s[s.length - 1] : '';
};

const STOPWORDS = new Set(
  `the and for that this with from your have will what when were them they their about into just more than then some very also most many much such only over after before being both those these here there would could should other into each which while those don doesn did wasn aren wasn’t aren't`.split(
    /\s+/,
  ),
);

/** Rough niche-term density: substantive words not in stopword list. */
function nicheTermScore(content) {
  const words = String(content || '')
    .toLowerCase()
    .match(/\b[a-z]{4,}\b/g);
  if (!words?.length) return 0;
  const uniq = [...new Set(words)].filter((w) => !STOPWORDS.has(w));
  return uniq.length;
}

function hashtagScore35(text) {
  const n = countHashtags(text);
  if (n >= 3 && n <= 5) return { score: 1, bucket: n };
  if ((n >= 1 && n <= 2) || (n >= 6 && n <= 9)) return { score: 0.5, bucket: n };
  return { score: 0, bucket: n };
}

function reasonHashtags(n, platformLabel) {
  if (n === 0) return `0 hashtags found — ${platformLabel} currently favors 3-5 niche-specific tags for feed reach`;
  if (n >= 10) return `${n} hashtags — reads as spam; trim to 3-5 sharply niche tags`;
  if (n <= 2) return `Only ${n} hashtag${n === 1 ? '' : 's'} — add 3-5 niche-specific tags to match current discovery patterns`;
  return `${n} hashtags — slightly heavy; 3-5 tight tags usually outperform wider stacks here`;
}

const POWER_WORDS =
  /\b(discover|secret|truth|warning|warnings?|proven|finally|nobody|everyone|stop scrolling|watch this|this is why|here's why|here is why|bet you|did you know)\b/i;
const CURiosity_OPEN =
  /^(what|why|how|when|who|which|if i|if you|ever wondered|tell me|guess)\b/i;
const GENERIC_BRAND_OPEN =
  /^(we('re|\s+are)|our |i('m|\s+am)|introducing|meet |welcome to|new launch|today we)/i;

function checkIgStaticHook(text) {
  const first = firstSentence(text);
  const wc = wordCount(first);
  const snippet = first.slice(0, 72) + (first.length > 72 ? '…' : '');
  const isQuestion = /\?/.test(first) || CURiosity_OPEN.test(first);
  const power = POWER_WORDS.test(first);
  if (wc === 0) {
    return { score: 0, reason: 'Opening line is empty — no scroll-stopping hook in the first sentence' };
  }
  if (isQuestion || power) {
    return {
      score: 1,
      reason: `Opens with curiosity energy — "${snippet.slice(0, 48)}${snippet.length > 48 ? '…' : ''}" pulls a reader into the line`,
    };
  }
  if (GENERIC_BRAND_OPEN.test(first.trim())) {
    return {
      score: 0,
      reason: `Opens with a branded or generic line — "${snippet}" gives the algorithm little curiosity to rank on`,
    };
  }
  if (wc >= 6) {
    return {
      score: 0.5,
      reason: `First sentence "${snippet}" reads clear and on-topic but stays declarative — no curiosity gap or question to force a pause`,
    };
  }
  return {
    score: 0,
    reason: `Opening is very short and plain ("${snippet}") — add a question, stat, or power hook in line one`,
  };
}

function checkIgStaticCta(text) {
  const strong = /\b(save|saved|share|repost|send this|bookmark|tag (a |someone|your)|comment below|drop a comment)\b/i;
  const soft = /\b(let us know|let me know|tell us|thoughts\??|lmk|hit us up|sound off)\b/i;
  const last = lastSentence(text);
  const endsStatement =
    /[.!…]$/.test(String(text || '').trim()) && !/\?/.test(last.slice(-40));
  if (strong.test(text)) {
    return { score: 1, reason: 'Asks explicitly for save, share, comment, or tag — high-value engagement signals' };
  }
  if (soft.test(text)) {
    return {
      score: 0.5,
      reason: 'Soft engagement line present, but no direct save/share ask the feed algorithm weights heavily',
    };
  }
  if (endsStatement && !strong.test(text)) {
    return {
      score: 0,
      reason: 'Caption ends with a period — no clear next step for the reader (save, share, or comment)',
    };
  }
  return { score: 0, reason: 'No CTA detected — the caption never asks for save, share, comment, or tag action' };
}

function checkNicheKeywords(text, platformLabel) {
  const n = nicheTermScore(text);
  if (n >= 3) {
    return { score: 1, reason: `${n} substantive niche-flavored terms — copy reads category-specific, not generic` };
  }
  if (n >= 1) {
    return {
      score: 0.5,
      reason: `Only ${n} niche-specific stem word${n === 1 ? '' : 's'} — layer in more vocabulary your audience actually searches`,
    };
  }
  return {
    score: 0,
    reason: `Language stays generic — add ${platformLabel}-specific terms your ideal follower would grep for`,
  };
}

function checkIgStaticHashtags(text) {
  const { score, bucket } = hashtagScore35(text);
  const reason = reasonHashtags(bucket, 'Instagram');
  return { score, reason };
}

function checkIgStaticEngagementQ(text) {
  if (/\?/.test(text)) {
    return { score: 1, reason: 'Direct question to the audience — comment velocity signal is present' };
  }
  if (/\b(tell us|share your|drop yours|what would you|which do you)\b/i.test(text)) {
    return {
      score: 0.5,
      reason: '"Tell us / share your" style prompt implies a question without a literal question mark',
    };
  }
  return { score: 0, reason: 'No engagement question — the caption never invites a specific audience reply' };
}

function checkReelHookUrgency(text, labelPrefix) {
  const first = firstLine(text) || firstSentence(text);
  const snippet = first.slice(0, 64) + (first.length > 64 ? '…' : '');
  const interrupt =
    /\b(pov:|pov\b|stop scrolling|wait for|plot twist|bold claim|nobody talks|here's what|here is what)\b/i.test(
      first,
    ) || CURiosity_OPEN.test(first) || /\?/.test(first);
  const power = POWER_WORDS.test(first);
  if (interrupt || power) {
    return {
      score: 1,
      reason: `${labelPrefix} opens with pattern-interrupt energy — "${snippet.slice(0, 52)}…" is built for the first frame`,
    };
  }
  if (GENERIC_BRAND_OPEN.test(first)) {
    return {
      score: 0,
      reason: `Starts with brand-generic energy — "${snippet}" lacks a thumb-stopping interrupt in line one`,
    };
  }
  if (wordCount(first) >= 5) {
    return {
      score: 0.5,
      reason: `Hook exists but reads soft — "${snippet}" could use a sharper POV, question, or "nobody talks about" frame`,
    };
  }
  return { score: 0, reason: 'Opening line is too thin — add a confrontational question, POV, or stat in the first beat' };
}

function checkAudioReference(text) {
  const full = /\b(audio|sound|song|music|track|original audio|trending sound|🎵|🎶|♫)\b/i.test(text);
  const implied = /\b(voiceover|voice over|narrat|spoken line|dialogue|dialog)\b/i.test(text);
  if (full) return { score: 1, reason: 'Sound, song, or audio plan is spelled out — discovery metadata is clear' };
  if (implied) {
    return {
      score: 0.5,
      reason: 'Voiceover/narration is implied, but you never name the audio trend or track family',
    };
  }
  return { score: 0, reason: 'No audio reference — Reels discovery still leans on named sounds and sonic context' };
}

function checkReelCta(text) {
  const strong = /\b(save|share|follow|repost|send this|tag )\b/i;
  const soft = /\b(let me know|comment|thoughts|double tap)\b/i;
  if (strong.test(text)) return { score: 1, reason: 'Explicit save/share/follow language — matches high-intent Reel CTAs' };
  if (soft.test(text)) {
    return { score: 0.5, reason: 'Soft engagement CTA only — no direct save/share ask the algorithm leans on' };
  }
  return { score: 0, reason: 'No CTA — viewers get value but never receive a save/share instruction' };
}

function checkReelLengthNote(text) {
  if (
    /\b(15|20|30|45|60)\s*(s(ec)?|sec|second)|under a minute|minute flat|quick\b|seconds\b|part \d|series\b/i.test(
      text,
    )
  ) {
    return {
      score: 1,
      reason: 'Length or pacing is referenced — viewers and algo see this is a bounded Reel, not an endless ramble',
    };
  }
  if (/\b(reel|clip|video|hook line|beat \d|scene)\b/i.test(text)) {
    return { score: 0.5, reason: 'Structure hints exist, but total runtime or pacing (15–60s) is never stated' };
  }
  return { score: 0, reason: 'No pacing or duration cues — note quick 30s / 60s framing so edits stay tight' };
}

function checkReelHashtags(text) {
  const { score, bucket } = hashtagScore35(text);
  return { score, reason: reasonHashtags(bucket, 'Instagram') };
}

function checkPatternInterruptPhrase(text) {
  const body = String(text || '');
  if (
    /\b(pov:?|nobody talks about|real talk|hot take|here's what i know|here is what i know|wait for it)\b/i.test(
      body,
    )
  ) {
    return { score: 1, reason: 'Pattern-interrupt phrasing (POV / real talk / hot take) matches current Reel cadence' };
  }
  if (/\b(you |your |we all|if you('| a)re)\b/i.test(body)) {
    return {
      score: 0.5,
      reason: 'Conversational "you/your" shows, but no distinct POV / "nobody talks about" style line',
    };
  }
  return { score: 0, reason: 'Tone reads formal or purely promotional — add a spoken-style interrupt phrase' };
}

function checkCarouselHook(text) {
  const first = firstLine(text) || firstSentence(text);
  if (wordCount(first) >= 6 && (POWER_WORDS.test(first) || /\?/.test(first))) {
    return {
      score: 1,
      reason: `Opening card copy "${first.slice(0, 56)}…" carries hook + specificity for swipe two`,
    };
  }
  if (wordCount(first) >= 4) {
    return {
      score: 0.5,
      reason: `First line "${first.slice(0, 48)}…" is clear but not yet "save for later" punchy`,
    };
  }
  return { score: 0, reason: 'Opening card is weak — lead with a list number, bold claim, or question' };
}

function checkCarouselSaveWorthy(text) {
  if (/\b(list|lists|steps|tips|secrets?|guide|breakdown|reasons|ways to|things you|mistakes)\b/i.test(text)) {
    return { score: 1, reason: 'Educational framing (list/steps/guide) signals save-worthy carousel value' };
  }
  if (/\b(how to|learn|teach|tutorial)\b/i.test(text)) {
    return { score: 0.5, reason: 'Tutorial angle shows, but not an explicit numbered list / guide hook' };
  }
  return {
    score: 0,
    reason: 'No list/guide/save-me language — carousels win when viewers know it is reference material',
  };
}

function checkCarouselSlideCount(text) {
  if (/\bswipe|slide\s*\d|slide \d|^\d+[).]/im.test(text) || /\b(part|pt\.)\s*\d\b/i.test(text)) {
    return { score: 1, reason: 'Swipe or slide numbering is referenced — expectation for multi-card value is set' };
  }
  if (/\bcard|frame|page\b/i.test(text)) {
    return { score: 0.5, reason: 'Carousel structure implied, but viewers are not told how many beats to expect' };
  }
  return { score: 0, reason: 'No slide/swipe cue — add "Slide 3 drops the CTA" so the journey is obvious' };
}

function checkCarouselCtaFinal(text) {
  const tail = String(text || '').slice(-Math.floor(text.length * 0.35) || -120);
  const cta =
    /\b(save|share|follow|comment|dm|link|tap|swipe to the end|last slide)\b/i.test(tail) ||
    /\b(save|share|follow)\b/i.test(lastSentence(text));
  if (cta) {
    return { score: 1, reason: 'Final stretch references follow/save/DM or explicitly calls the last slide' };
  }
  if (/\b(let me know|thoughts)\b/i.test(tail)) {
    return { score: 0.5, reason: 'Soft closer only — no pinned instruction on the last card or caption tail' };
  }
  return { score: 0, reason: 'Caption never closes with a final-card CTA; viewers may swipe away early' };
}

function checkCarouselHashtags(text) {
  const { score, bucket } = hashtagScore35(text);
  return { score, reason: reasonHashtags(bucket, 'Instagram') };
}

function checkStoryPunchy(text) {
  const main = firstLine(text) || String(text || '').trim();
  const wc = wordCount(main);
  if (wc > 0 && wc <= 20) {
    return { score: 1, reason: `Story copy is ${wc} words — tight for one overlay beat` };
  }
  if (wc <= 28) {
    return { score: 0.5, reason: `${wc} words on the hero line — trim to under ~20 for thumb-friendly overlays` };
  }
  return { score: 0, reason: `${wc} words is dense for Stories — break into multiple frames or shorten overlays` };
}

function checkStoryInteractive(text) {
  if (/\b(poll|question sticker|slider|quiz|countdown|emoji slider|this or that)\b/i.test(text)) {
    return { score: 1, reason: 'Interactive sticker language appears — Stories distribution loves taps back' };
  }
  if (/\b(tap|vote|choose|pick)\b/i.test(text)) {
    return { score: 0.5, reason: 'Tap/vote verbs hint at interactivity but sticker type is unspecified' };
  }
  return { score: 0, reason: 'No sticker blueprint — name poll, quiz, slider, or countdown so production matches algorithm bias' };
}

function checkStoryCta(text) {
  const ctas = (text.match(/\b(link|swipe up|dm|tap|reply|shop|bio)\b/gi) || []).length;
  if (ctas === 1) return { score: 1, reason: 'Single focused CTA — Stories punish cluttered multi-asks' };
  if (ctas === 0) {
    return { score: 0, reason: 'No swipe/DM/link/bio direction — viewers finish without one obvious action' };
  }
  return { score: 0.5, reason: 'Multiple CTAs compete — pick one primary motion per sequence' };
}

function checkStoryBrandNiche(text) {
  return checkNicheKeywords(text, 'Story');
}

function checkTtShortHook(text) {
  const head = String(text || '').split(/\n/)[0]?.trim() || '';
  const early = head.slice(0, 120);
  const hook =
    /\b(wait for it|watch till|pov:?|nobody tells you|day in my life|you need to)\b/i.test(early) ||
    /\?/.test(early);
  if (hook) {
    return {
      score: 1,
      reason: `First-line energy matches TikTok's 2-second test — "${early.slice(0, 52)}…"`,
    };
  }
  if (wordCount(head) <= 12 && head.length > 0) {
    return {
      score: 0.5,
      reason: `Hook is short but neutral — "${early.slice(0, 48)}…" could push POV or "wait for it" tension`,
    };
  }
  return { score: 0, reason: 'Opening lacks a TikTok-native interrupt — try POV, "wait for it", or bold question in line one' };
}

function checkTtShortAudio(text) {
  return checkAudioReference(text);
}

function checkTtShortPattern(text) {
  if (/\b(pov|real talk|nobody tells you|day in my life|grwm|storytime)\b/i.test(text)) {
    return { score: 1, reason: 'Relatable or pattern-interrupt framing matches FYP-native tone' };
  }
  if (/\b(i think|honestly|lowkey)\b/i.test(text)) {
    return { score: 0.5, reason: 'Conversational filler shows, but no distinct narrative frame (POV, DITL, etc.)' };
  }
  return { score: 0, reason: 'No relatable frame — add POV / "day in my life" / "nobody tells you" style casing' };
}

function checkTtShortCta(text) {
  if (/\b(comment|duet|stitch|follow|tap \+|part 2|link)\b/i.test(text)) {
    return { score: 1, reason: 'Comment / duet / stitch / follow language gives the algorithm a next action' };
  }
  if (/\b(share|send this)\b/i.test(text)) {
    return { score: 0.5, reason: 'Soft viral CTA only — TikTok still loves explicit duet/stitch/follow asks' };
  }
  return { score: 0, reason: 'No CTA for comment, duet, stitch, or follow — viewers scroll away with no instruction' };
}

function checkTtShortHashtags(text) {
  const { score, bucket } = hashtagScore35(text);
  return { score, reason: reasonHashtags(bucket, 'TikTok') };
}

function checkTtLongPremise(text) {
  const first = firstSentence(text);
  if (wordCount(first) >= 8 && (POWER_WORDS.test(first) || /\?/.test(first))) {
    return { score: 1, reason: `Long-form premise lands in sentence one — "${first.slice(0, 64)}…"` };
  }
  if (wordCount(first) >= 6) {
    return { score: 0.5, reason: 'Premise is stated but reads flat — sharpen with stakes or curiosity' };
  }
  return { score: 0, reason: 'Weak opening premise — long TikToks need a thesis in the first sentence' };
}

function checkTtLongValue(text) {
  if (/\b(step|steps|tutorial|walkthrough|story arc|part \d|chapter)\b/i.test(text)) {
    return { score: 1, reason: 'Step-by-step / tutorial / story-arc language signals sustained value delivery' };
  }
  if (/\b(tip|lesson|here's how)\b/i.test(text)) {
    return { score: 0.5, reason: 'Educational hint exists without a full step or arc promise' };
  }
  return { score: 0, reason: 'No clear value architecture — mention steps, tutorial flow, or story beats' };
}

function checkTtLongRehook(text) {
  const chunks = String(text || '').split(/\n\n+/);
  if (chunks.length < 2) {
    if (/\b(but wait|plot twist|here's the part|real talk halfway)\b/i.test(text)) {
      return { score: 1, reason: 'Mid-content re-hook phrasing keeps retention on longer shoots' };
    }
    return { score: 0, reason: 'No mid-video pivot language — add a "but wait" / "here\'s what nobody says" beat' };
  }
  const mid = chunks[Math.floor(chunks.length / 2)] || '';
  if (/\b(but wait|plot twist|nobody talks|here's the part|stopped scrolling)\b/i.test(mid)) {
    return { score: 1, reason: 'Middle block carries a re-hook — watch-time curves love a second tension spike' };
  }
  return {
    score: 0.5,
    reason: 'Multiple paragraphs exist, but no explicit mid-video twist phrase yet',
  };
}

function checkTtLongCta(text) {
  if (/\b(follow|part \d|comment|playlist)\b/i.test(text)) {
    return { score: 1, reason: 'Follow / part-two / comment CTA shows for extended TikToks' };
  }
  return checkTtShortCta(text);
}

function checkTtLongAuthority(text) {
  if (/\b(\d+[%k]|\d{4}|years?|clients?|patients?|cases?|study|data|certified|licensed)\b/i.test(text)) {
    return { score: 1, reason: 'Credibility marker (time, data, clientele) backs the teaching' };
  }
  if (/\b(i('ve| have) seen|in my experience)\b/i.test(text)) {
    return { score: 0.5, reason: 'Personal experience hinted, but no concrete proof point or stat language' };
  }
  return { score: 0, reason: 'No authority proof — drop tenure, results, or data so long-form feels expert-grade' };
}

function checkXCharLimit(text) {
  const t = String(text || '').trim();
  if (t.length <= 280) {
    return { score: 1, reason: `Copy is ${t.length} characters — fits the classic single-post window` };
  }
  return {
    score: 0,
    reason: `Post is ${t.length} characters — exceeds 280; break into a thread or trim to restore reach`,
  };
}

function checkXHook8(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const frag = words.join(' ');
  if (words.length === 0) {
    return { score: 0, reason: 'Post is empty — lead with eight sharp words max in the opener' };
  }
  if (words.length <= 8 && (POWER_WORDS.test(frag) || /\?/.test(frag) || /[!]{1}/.test(frag))) {
    return { score: 1, reason: `First eight words "${frag}" carry punchy energy for the X timeline` };
  }
  if (words.length <= 8) {
    return { score: 0.5, reason: `Opener "${frag}" is short but polite — add spice, stat fragment, or question` };
  }
  return { score: 0, reason: `First eight words are busy — tighten opener (currently: "${frag}…")` };
}

function checkXOpinion(text) {
  if (
    /\b(unpopular opinion|hot take|bold claim|truth:|myth\b|overrated|underrated|wrong about|stop doing|everyone is)\b/i.test(
      text,
    )
  ) {
    return { score: 1, reason: 'Opinion / controversy framing — X rewards reply velocity on stance posts' };
  }
  if (/\b(i think|imo|personally)\b/i.test(text)) {
    return { score: 0.5, reason: 'Subjective language shows but not a full hot-take container' };
  }
  return { score: 0, reason: 'No stance language — add "unpopular opinion" / "myth:" / bold contrarian energy' };
}

function checkXEngageCta(text) {
  if (/\?/.test(text)) {
    return { score: 1, reason: 'Question mark present — invites quote tweets and replies' };
  }
  if (/\b(agree|disagree|thoughts|reply|sound off)\b/i.test(text)) {
    return { score: 1, reason: 'Explicit reply/ debate CTA detected' };
  }
  if (/\b(lmk|let me know)\b/i.test(text)) {
    return { score: 0.5, reason: 'Soft "LMK" prompt — sharper to ask a polar yes/no question' };
  }
  return { score: 0, reason: 'No question or reply bait — timelines need a conversational exhale at the end' };
}

function checkXHashtagRestraintFixed(text) {
  const n = countHashtags(text);
  if (n <= 1) return { score: 1, reason: `${n === 0 ? 'Zero' : 'One'} hashtag(s) — optimal restraint for X discovery` };
  if (n === 2) return { score: 0.5, reason: 'Two hashtags — acceptable but one focused tag usually wins' };
  return { score: 0, reason: `${n} hashtags — X reads this as spammy; drop to 0–1 sharp tags` };
}

function checkYtShortHook(text) {
  return checkReelHookUrgency(text, 'Short');
}

function checkYtShortAv(text) {
  if (/\b(b-roll|b roll|cutaway|caption on screen|visual|jump cut|green screen)\b/i.test(text)) {
    return {
      score: 1,
      reason: 'Audio or visual production cue is written — editors know how it lands in-feed',
    };
  }
  if (/\b(watch|look at|see this)\b/i.test(text)) {
    return { score: 0.5, reason: 'Visual prompt is vague — specify the on-screen beat or caption treatment' };
  }
  return { score: 0, reason: 'No AV cue — Shorts need a nod to visuals or audio treatment in the brief' };
}

function checkYtShortKeyword(text) {
  const first25 = String(text || '').split(/\s+/).slice(0, 25).join(' ');
  if (wordCount(first25) >= 6 && nicheTermScore(first25) >= 2) {
    return { score: 1, reason: 'Opening block carries searchable keywords in the first ~25 words' };
  }
  if (wordCount(first25) >= 4) {
    return { score: 0.5, reason: 'Keywords appear but density is thin in the opening chunk' };
  }
  return { score: 0, reason: 'Title/hook keywords missing upfront — front-load the exact phrase viewers type' };
}

function checkYtShortCta(text) {
  if (/\b(subscribe|sub\b|like|comment|watch next|playlist)\b/i.test(text)) {
    return { score: 1, reason: 'Subscribe / comment / next-watch language matches Shorts completion loops' };
  }
  if (/\b(follow for)\b/i.test(text)) {
    return { score: 0.5, reason: 'Soft follow prompt — Shorts still convert on explicit "subscribe + like" combos' };
  }
  return { score: 0, reason: 'No channel CTA — remind viewers to subscribe, like, or watch the next Short' };
}

function checkYtShortPattern(text) {
  if (/\b(wait until|plot twist|you won't believe|here's why)\b/i.test(text)) {
    return { score: 1, reason: 'Curiosity-gap language matches Shorts retention editing' };
  }
  if (/\?/.test(text)) {
    return { score: 0.5, reason: 'Question provides some gap, but add a bolder "wait for it" payoff promise' };
  }
  return { score: 0, reason: 'No curiosity gap phrase — layer a "here is why" or payoff tease in the script' };
}

function checkYtLongTitleHook(text) {
  const first = firstLine(text) || firstSentence(text);
  const kw = nicheTermScore(first) >= 1;
  const curiosity = /\?|:|!/.test(first) || POWER_WORDS.test(first);
  if (kw && curiosity && wordCount(first) >= 4) {
    return {
      score: 1,
      reason: `Title/opening "${first.slice(0, 72)}…" pairs keyword scent with curiosity punctuation`,
    };
  }
  if (wordCount(first) >= 5) {
    return { score: 0.5, reason: 'Title line is descriptive but could blend keyword + tension hook harder' };
  }
  return { score: 0, reason: 'Title hook is weak — combine a searchable noun with a curiosity clause' };
}

function checkYtLongDescKw(text) {
  const scoreCount = nicheTermScore(text);
  if (scoreCount >= 6) {
    return { score: 1, reason: 'Description stacks repeated niche stems — good metadata density for search' };
  }
  if (scoreCount >= 3) {
    return { score: 0.5, reason: 'Some keyword stems repeat, but you can tighten clustering in the first 125 words' };
  }
  return { score: 0, reason: 'Keyword density is low — echo the primary phrase naturally 3–4 times in the description' };
}

function checkYtLongValuePremise(text) {
  const head = String(text || '').slice(0, 400);
  if (/\b(in this video|today i|by the end|you will learn|watch to)\b/i.test(head)) {
    return { score: 1, reason: 'Value premise is stated upfront — viewers know the payoff from line one' };
  }
  if (/\b(how to|tutorial|walkthrough)\b/i.test(head)) {
    return { score: 0.5, reason: 'Tutorial language present but no explicit payoff sentence yet' };
  }
  return { score: 0, reason: 'No upfront value promise — tell viewers what they get by minute one' };
}

function checkYtLongTimestamps(text) {
  if (/\b(\d{1,2}:\d{2}|timestamp|chapter|chapters?|0:00)\b/i.test(text)) {
    return { score: 1, reason: 'Timestamp / chapter language helps YT segment long retention' };
  }
  if (/\b(part \d|segment|section)\b/i.test(text)) {
    return { score: 0.5, reason: 'Structure hinted but numeric timestamps missing' };
  }
  return { score: 0, reason: 'No chapters/timestamps — add 0:00 / topic markers for long-form CTR' };
}

function checkYtLongCta(text) {
  if (/\b(subscribe|like this video|comment below|bell|notification)\b/i.test(text)) {
    return { score: 1, reason: 'Classic subscribe/like/comment stack is present for long-form' };
  }
  if (/\b(watch next)\b/i.test(text)) {
    return { score: 0.5, reason: 'Next-watch CTA only — add subscribe + like for full funnel coverage' };
  }
  return { score: 0, reason: 'No subscribe/like/comment block — long videos need an explicit end-stack CTA' };
}

function checkFbPostHook(text) {
  return checkIgStaticHook(text);
}

function checkFbEmotion(text) {
  if (/\b(story|remember when|felt|feeling|laugh|cried|proud|grateful|heart|empathy|humor|funny)\b/i.test(text)) {
    return { score: 1, reason: 'Emotional storytelling, humor, or empathy markers — Facebook rewards shares' };
  }
  if (/\b(i |we )/i.test(text) && wordCount(text) > 25) {
    return { score: 0.5, reason: 'Personal voice shows length, but no clear emotional beat yet' };
  }
  return { score: 0, reason: 'Copy reads flat — add a micro-story, empathy line, or humor beat' };
}

function checkFbCta(text) {
  if (/\b(share|comment|tag|send this|spread the)\b/i.test(text)) {
    return { score: 1, reason: 'Share/comment/tag language fits Facebook comment loops' };
  }
  return checkIgStaticCta(text);
}

function checkFbNiche(text) {
  return checkNicheKeywords(text, 'Facebook');
}

function checkFbLink(text) {
  if (/https?:\/\/|www\.|\b(link in bio|resources?|article)\b/i.test(text)) {
    return { score: 1, reason: 'Link or resource callout gives the algo a dwell-time anchor' };
  }
  if (/\b(read more|details)\b/i.test(text)) {
    return { score: 0.5, reason: '"Read more" hint without a concrete URL or resource name' };
  }
  return {
    score: 0,
    reason: 'No link or resource mention — add article, signup, or community link when relevant',
  };
}

const SIGNAL_DEFINITIONS = [
  {
    id: 'ig_static_hook',
    label: 'Hook strength in first sentence',
    weight: 25,
    platforms: ['instagram'],
    contentTypes: ['static_post'],
    fixTemplate: 'Rewrite line one with a question, stat, or "nobody talks about" curiosity hook.',
    check: checkIgStaticHook,
  },
  {
    id: 'ig_static_cta',
    label: 'CTA driving saves, shares, or comments',
    weight: 25,
    platforms: ['instagram'],
    contentTypes: ['static_post'],
    fixTemplate: 'Add one line: "Save this + share with someone who needs the reminder."',
    check: checkIgStaticCta,
  },
  {
    id: 'ig_static_niche_kw',
    label: 'Niche-specific keywords',
    weight: 20,
    platforms: ['instagram'],
    contentTypes: ['static_post'],
    fixTemplate: 'Inject 3 vocabulary words your niche actually searches before posting.',
    check: (t) => checkNicheKeywords(t, 'Instagram'),
  },
  {
    id: 'ig_static_hashtags',
    label: 'Hashtags (3-5)',
    weight: 15,
    platforms: ['instagram'],
    contentTypes: ['static_post'],
    fixTemplate: 'Add three sharp niche hashtags — avoid broad one-word tags.',
    check: checkIgStaticHashtags,
  },
  {
    id: 'ig_static_engagement_q',
    label: 'Engagement question or prompt',
    weight: 15,
    platforms: ['instagram'],
    contentTypes: ['static_post'],
    fixTemplate: 'End with a specific question your audience can answer in one sentence.',
    check: checkIgStaticEngagementQ,
  },
  {
    id: 'ig_reel_hook',
    label: 'Hook urgency in first line',
    weight: 25,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['reel'],
    fixTemplate: 'Start with POV, "wait for it," or a bold question before branding.',
    check: (t) => checkReelHookUrgency(t, 'Reel'),
  },
  {
    id: 'ig_reel_audio',
    label: 'Trending or original audio reference',
    weight: 20,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['reel'],
    fixTemplate: 'Name the audio trend or write "original audio / voiceover plan: …"',
    check: checkAudioReference,
  },
  {
    id: 'ig_reel_cta',
    label: 'CTA driving saves or shares',
    weight: 20,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['reel'],
    fixTemplate: 'Tell viewers explicitly to save and share before the loop restarts.',
    check: checkReelCta,
  },
  {
    id: 'ig_reel_length',
    label: 'Reel length noted (15-60s)',
    weight: 15,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['reel'],
    fixTemplate: 'Mention runtime ("30s breakdown") so pacing stays tight.',
    check: checkReelLengthNote,
  },
  {
    id: 'ig_reel_hashtags',
    label: 'Hashtags (3-5)',
    weight: 10,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['reel'],
    fixTemplate: 'Stack 3-5 hyper-relevant hashtags under the caption.',
    check: checkReelHashtags,
  },
  {
    id: 'ig_reel_pattern',
    label: 'Pattern interrupt phrase',
    weight: 10,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['reel'],
    fixTemplate: 'Drop a spoken-style line like "Real talk:" or "POV you finally…"',
    check: checkPatternInterruptPhrase,
  },
  {
    id: 'ig_car_hook',
    label: 'Hook on opening card/line',
    weight: 20,
    platforms: ['instagram'],
    contentTypes: ['carousel'],
    fixTemplate: 'Lead slide one with a numbered promise or bold question.',
    check: checkCarouselHook,
  },
  {
    id: 'ig_car_save',
    label: 'Save-worthy or educational framing',
    weight: 20,
    platforms: ['instagram'],
    contentTypes: ['carousel'],
    fixTemplate: 'Promise a checklist, mistakes list, or mini-guide in the opening line.',
    check: checkCarouselSaveWorthy,
  },
  {
    id: 'ig_car_slides',
    label: 'Slide count referenced or implied',
    weight: 15,
    platforms: ['instagram'],
    contentTypes: ['carousel'],
    fixTemplate: 'Add "Slide 4 = CTA" or "Swipe through 5 mistakes" language.',
    check: checkCarouselSlideCount,
  },
  {
    id: 'ig_car_cta',
    label: 'CTA on final card or end of caption',
    weight: 20,
    platforms: ['instagram'],
    contentTypes: ['carousel'],
    fixTemplate: 'Close with save/share/follow on the last slide or final line.',
    check: checkCarouselCtaFinal,
  },
  {
    id: 'ig_car_niche',
    label: 'Niche-specific keywords',
    weight: 15,
    platforms: ['instagram'],
    contentTypes: ['carousel'],
    fixTemplate: 'Sprinkle category keywords throughout each slide note.',
    check: (t) => checkNicheKeywords(t, 'Instagram'),
  },
  {
    id: 'ig_car_tags',
    label: 'Hashtags (3-5)',
    weight: 10,
    platforms: ['instagram'],
    contentTypes: ['carousel'],
    fixTemplate: 'Finish with three niche hashtags, not ten broad ones.',
    check: checkCarouselHashtags,
  },
  {
    id: 'story_punchy',
    label: 'Short punchy copy (under ~20 words)',
    weight: 30,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['story'],
    fixTemplate: 'Cut hero copy to one overlay-friendly sentence under 20 words.',
    check: checkStoryPunchy,
  },
  {
    id: 'story_interactive',
    label: 'Interactive element referenced',
    weight: 30,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['story'],
    fixTemplate: 'Note poll / quiz / slider sticker copy in your plan.',
    check: checkStoryInteractive,
  },
  {
    id: 'story_cta',
    label: 'Single clear CTA',
    weight: 25,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['story'],
    fixTemplate: 'Pick one motion: DM keyword, link sticker, or swipe prompt.',
    check: checkStoryCta,
  },
  {
    id: 'story_niche',
    label: 'Brand/niche alignment',
    weight: 15,
    platforms: ['instagram', 'facebook'],
    contentTypes: ['story'],
    fixTemplate: 'Name your offer or niche in the first three words.',
    check: checkStoryBrandNiche,
  },
  {
    id: 'tt_short_hook',
    label: 'Hook in first 2 seconds (script line)',
    weight: 25,
    platforms: ['tiktok'],
    contentTypes: ['short'],
    fixTemplate: 'Open with POV or "wait for it" tension in the first spoken line.',
    check: checkTtShortHook,
  },
  {
    id: 'tt_short_audio',
    label: 'Trending audio or sound reference',
    weight: 20,
    platforms: ['tiktok'],
    contentTypes: ['short'],
    fixTemplate: 'Write which trending sound or original audio anchors the clip.',
    check: checkTtShortAudio,
  },
  {
    id: 'tt_short_pattern',
    label: 'Pattern interrupt or relatable framing',
    weight: 20,
    platforms: ['tiktok'],
    contentTypes: ['short'],
    fixTemplate: 'Add a DITL / "nobody tells you" frame to the script.',
    check: checkTtShortPattern,
  },
  {
    id: 'tt_short_cta',
    label: 'CTA (comment / follow / duet / stitch)',
    weight: 20,
    platforms: ['tiktok'],
    contentTypes: ['short'],
    fixTemplate: 'Ask for duet/stitch or a hyper-particular comment.',
    check: checkTtShortCta,
  },
  {
    id: 'tt_short_tags',
    label: 'Hashtags (3-5)',
    weight: 15,
    platforms: ['tiktok'],
    contentTypes: ['short'],
    fixTemplate: 'Keep three hyper-niche hashtags — drop broad tags.',
    check: checkTtShortHashtags,
  },
  {
    id: 'tt_long_premise',
    label: 'Strong opening premise',
    weight: 25,
    platforms: ['tiktok'],
    contentTypes: ['long_form'],
    fixTemplate: 'State the thesis + payoff in sentence one.',
    check: checkTtLongPremise,
  },
  {
    id: 'tt_long_value',
    label: 'Value delivery signal',
    weight: 25,
    platforms: ['tiktok'],
    contentTypes: ['long_form'],
    fixTemplate: 'Promise steps or story beats explicitly.',
    check: checkTtLongValue,
  },
  {
    id: 'tt_long_rehook',
    label: 'Mid-content re-hook reference',
    weight: 20,
    platforms: ['tiktok'],
    contentTypes: ['long_form'],
    fixTemplate: 'Add a "but wait / plot twist" paragraph halfway.',
    check: checkTtLongRehook,
  },
  {
    id: 'tt_long_cta',
    label: 'CTA',
    weight: 20,
    platforms: ['tiktok'],
    contentTypes: ['long_form'],
    fixTemplate: 'Close with follow + part-two teaser.',
    check: checkTtLongCta,
  },
  {
    id: 'tt_long_authority',
    label: 'Niche authority signal',
    weight: 10,
    platforms: ['tiktok'],
    contentTypes: ['long_form'],
    fixTemplate: 'Drop one proof point: years, clients, or data.',
    check: checkTtLongAuthority,
  },
  {
    id: 'x_char',
    label: 'Under 280 characters check',
    weight: 20,
    platforms: ['twitter'],
    contentTypes: ['post'],
    fixTemplate: 'Trim to 280 chars or thread the overflow.',
    check: checkXCharLimit,
  },
  {
    id: 'x_hook8',
    label: 'Hook in first 8 words',
    weight: 25,
    platforms: ['twitter'],
    contentTypes: ['post'],
    fixTemplate: 'Compress opener to eight spicy words max.',
    check: checkXHook8,
  },
  {
    id: 'x_opinion',
    label: 'Opinion, controversy, or bold claim',
    weight: 25,
    platforms: ['twitter'],
    contentTypes: ['post'],
    fixTemplate: 'Lead with "Unpopular opinion:" or myth-buster language.',
    check: checkXOpinion,
  },
  {
    id: 'x_cta',
    label: 'Question or engagement CTA',
    weight: 20,
    platforms: ['twitter'],
    contentTypes: ['post'],
    fixTemplate: 'End with a polar question or "Agree / disagree?"',
    check: checkXEngageCta,
  },
  {
    id: 'x_tags',
    label: 'Hashtag restraint',
    weight: 10,
    platforms: ['twitter'],
    contentTypes: ['post'],
    fixTemplate: 'Delete down to one descriptive hashtag max.',
    check: checkXHashtagRestraintFixed,
  },
  {
    id: 'yt_short_hook',
    label: 'Hook in first line',
    weight: 25,
    platforms: ['youtube'],
    contentTypes: ['short'],
    fixTemplate: 'Rewrite first line for curiosity + keyword.',
    check: checkYtShortHook,
  },
  {
    id: 'yt_short_av',
    label: 'Audio or visual cue reference',
    weight: 20,
    platforms: ['youtube'],
    contentTypes: ['short'],
    fixTemplate: 'Note b-roll, captions, or jump-cut rhythm.',
    check: checkYtShortAv,
  },
  {
    id: 'yt_short_kw',
    label: 'Keyword in title or opening',
    weight: 20,
    platforms: ['youtube'],
    contentTypes: ['short'],
    fixTemplate: 'Repeat the exact search phrase in the first sentence.',
    check: checkYtShortKeyword,
  },
  {
    id: 'yt_short_cta',
    label: 'CTA (subscribe / comment / watch next)',
    weight: 20,
    platforms: ['youtube'],
    contentTypes: ['short'],
    fixTemplate: 'Say "Subscribe + comment [#]" before outro.',
    check: checkYtShortCta,
  },
  {
    id: 'yt_short_pattern',
    label: 'Pattern interrupt or curiosity gap',
    weight: 15,
    platforms: ['youtube'],
    contentTypes: ['short'],
    fixTemplate: 'Add "Wait until you see…" style payoff language.',
    check: checkYtShortPattern,
  },
  {
    id: 'yt_long_title',
    label: 'Strong title hook (keyword + curiosity)',
    weight: 25,
    platforms: ['youtube'],
    contentTypes: ['long_form'],
    fixTemplate: 'Rewrite title so noun + tension clause show in line one.',
    check: checkYtLongTitleHook,
  },
  {
    id: 'yt_long_kw',
    label: 'Description keyword density',
    weight: 20,
    platforms: ['youtube'],
    contentTypes: ['long_form'],
    fixTemplate: 'Echo primary keyword three times naturally in description.',
    check: checkYtLongDescKw,
  },
  {
    id: 'yt_long_value',
    label: 'Value premise stated upfront',
    weight: 20,
    platforms: ['youtube'],
    contentTypes: ['long_form'],
    fixTemplate: 'Add "In this video you will…" promise in first lines.',
    check: checkYtLongValuePremise,
  },
  {
    id: 'yt_long_time',
    label: 'Timestamp or chapter structure implied',
    weight: 15,
    platforms: ['youtube'],
    contentTypes: ['long_form'],
    fixTemplate: 'Drop 0:00 Intro / chapter markers.',
    check: checkYtLongTimestamps,
  },
  {
    id: 'yt_long_cta',
    label: 'CTA (subscribe / like / comment)',
    weight: 20,
    platforms: ['youtube'],
    contentTypes: ['long_form'],
    fixTemplate: 'Stack subscribe + like + comment ask near end.',
    check: checkYtLongCta,
  },
  {
    id: 'fb_post_hook',
    label: 'Hook in first sentence',
    weight: 25,
    platforms: ['facebook'],
    contentTypes: ['post'],
    fixTemplate: 'Open with empathy-driven curiosity, not logistics.',
    check: checkFbPostHook,
  },
  {
    id: 'fb_post_emotion',
    label: 'Emotional resonance (story, empathy, humor)',
    weight: 25,
    platforms: ['facebook'],
    contentTypes: ['post'],
    fixTemplate: 'Add one human story beat or light humor line.',
    check: checkFbEmotion,
  },
  {
    id: 'fb_post_cta',
    label: 'CTA (share / comment / tag)',
    weight: 25,
    platforms: ['facebook'],
    contentTypes: ['post'],
    fixTemplate: 'Ask friends to tag someone who needs the post.',
    check: checkFbCta,
  },
  {
    id: 'fb_post_niche',
    label: 'Niche keywords',
    weight: 15,
    platforms: ['facebook'],
    contentTypes: ['post'],
    fixTemplate: 'Name your niche jargon explicitly.',
    check: checkFbNiche,
  },
  {
    id: 'fb_post_link',
    label: 'Link or resource reference',
    weight: 10,
    platforms: ['facebook'],
    contentTypes: ['post'],
    fixTemplate: 'Point to article, group, or landing link when relevant.',
    check: checkFbLink,
  },
];

function normalizePlatformKey(platformKey) {
  let k = String(platformKey || 'instagram').toLowerCase();
  if (k === 'x') k = 'twitter';
  return k;
}

export function filterSignalsFor(platformKey, contentTypeKey) {
  const p = normalizePlatformKey(platformKey);
  const ct = contentTypeKey || DEFAULT_CONTENT_TYPE_BY_PLATFORM[p] || 'post';
  return SIGNAL_DEFINITIONS.filter(
    (s) => s.platforms.includes(p) && s.contentTypes.includes(ct),
  );
}

/**
 * Legacy-shaped object for prompts (grok scorer) + backward compat consumers.
 * Each platform maps to { name, signals } where signals mirror default content type.
 */
export const algorithmSignals = (() => {
  const out = {};
  for (const p of ['instagram', 'tiktok', 'twitter', 'youtube', 'facebook']) {
    const ct = DEFAULT_CONTENT_TYPE_BY_PLATFORM[p];
    const signals = filterSignalsFor(p, ct).map((s) => ({
      id: s.id,
      label: s.label,
      weight: s.weight,
      check: s.check,
      fixTemplate: s.fixTemplate,
    }));
    out[p] = {
      name: PLATFORM_NAMES[p],
      signals,
    };
  }
  return out;
})();

/**
 * Score content against platform × content type signals.
 * @param {string} content
 * @param {string} platformKey - instagram | tiktok | twitter | youtube | facebook
 * @param {string} [contentTypeKey] - defaults per DEFAULT_CONTENT_TYPE_BY_PLATFORM
 * @returns {{ overallScore: number, results: Array, algorithmReady: boolean, platformName: string, contentTypeKey: string }}
 */
export function checkAlgorithmAlignment(content, platformKey, contentTypeKey = null) {
  const p = normalizePlatformKey(platformKey);
  const ct =
    contentTypeKey ||
    DEFAULT_CONTENT_TYPE_BY_PLATFORM[p] ||
    (p === 'twitter' ? 'post' : 'static_post');
  const platformName = PLATFORM_NAMES[p] || platformKey;

  if (!content?.trim()) {
    return {
      overallScore: 0,
      results: [],
      algorithmReady: false,
      platformName,
      contentTypeKey: ct,
    };
  }

  const text = content.trim();
  const defs = filterSignalsFor(p, ct);
  if (!defs.length) {
    return {
      overallScore: 0,
      results: [],
      algorithmReady: false,
      platformName,
      contentTypeKey: ct,
    };
  }

  let weighted = 0;
  const results = defs.map((signal) => {
    const { score, reason } = signal.check(text);
    const safeScore = score === 0.5 || score === 1 ? score : 0;
    weighted += signal.weight * safeScore;
    const pass = safeScore === 1;
    return {
      id: signal.id,
      label: signal.label,
      weight: signal.weight,
      score: safeScore,
      reason,
      detail: reason,
      pass,
      fix: safeScore < 1 ? signal.fixTemplate : null,
      fixTemplate: signal.fixTemplate,
    };
  });

  const overallScore = Math.round(weighted);

  return {
    overallScore,
    results,
    algorithmReady: overallScore >= 85,
    platformName,
    contentTypeKey: ct,
  };
}
