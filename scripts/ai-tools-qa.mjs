#!/usr/bin/env node
/**
 * Offline contract QA for AI Power Tools (no live Grok/Perplexity calls).
 *
 * Validates golden fixtures against src/qa/aiToolsOutputValidators.js.
 * Run from repo root: npm run qa:ai-tools
 *
 * For live API smoke tests, use the app in the browser or extend this script
 * with authenticated fetch to your dev API (not enabled by default).
 */

import {
  validateCaptionVariants,
  validateHashtagRows,
  validateHookLines,
  validateStyledCtas,
  validateCtaIdeas,
  validateContentScoreRaw,
  validateVisualConcepts,
} from '../src/qa/aiToolsOutputValidators.js';

const FIXTURES = {
  captionVariants: [
    {
      variantId: 1,
      length: 'medium',
      toneSummary: 'Educational',
      caption: 'Microneedling for acne scars: what actually changes your skin (and what does not).\n\nSave this before your next consult.',
      primaryAngle: 'myth busting',
      recommendedCTAType: 'engagement',
      notes: 'Balances authority with a save CTA.',
    },
    {
      variantId: 2,
      length: 'short',
      toneSummary: 'Bold',
      caption: 'Your acne scars are not "just texture." Here is the one tweak that moves results.\n\n#microneedling #skincare',
      primaryAngle: 'authority flex',
      recommendedCTAType: 'engagement',
      notes: 'Short punchy hook for Reels caption.',
    },
  ],

  hashtags: [
    { tag: '#microneedling', tier: 'Medium', volumeLabel: '250K–1M+', score: 82, reason: 'High intent niche tag with ranking room.' },
    { tag: '#acnescars', tier: 'Popular', volumeLabel: '1M+', score: 71, reason: 'Broad discovery for the topic.' },
    { tag: '#skinjourney', tier: 'Niche', volumeLabel: '10K–50K', score: 88, reason: 'Community tag for smaller accounts.' },
    { tag: '#dermatologytips', tier: 'Medium', volumeLabel: '50K–250K', score: 79, reason: 'Educational angle fit.' },
    { tag: '#beforeandafterskin', tier: 'Niche', volumeLabel: '10K–50K', score: 85, reason: 'Proof-led long-tail.' },
    { tag: '#glowingskin', tier: 'Popular', volumeLabel: '1M+', score: 62, reason: 'Vanity broad tag — use sparingly.' },
    { tag: '#medspa', tier: 'Medium', volumeLabel: '250K–1M+', score: 77, reason: 'Commercial intent for local/medspa.' },
    { tag: '#skintreatment', tier: 'Medium', volumeLabel: '250K–1M+', score: 75, reason: 'Solid mid-funnel discovery.' },
  ],

  hooksText: `1. What if your acne scars are not permanent — just untreated?
2. Most people skip this one step before microneedling.
3. Stop blaming your skin; start blaming this routine mistake.
4. I almost quit on my scars until I tried this approach.
5. The microneedling myth that keeps your texture stuck.
6. Why your "glow" fades a week after every facial.`,

  styledCtas: {
    platformTip: 'On Instagram, pair a soft save CTA with one DM or link-driven ask.',
    ctas: [
      { style: 'Soft', cta: 'Save this for your next skin consult.', tip: 'Low friction; boosts saves.' },
      { style: 'Engagement', cta: 'Comment SCARS if you want the full routine breakdown.', tip: 'Keyword comment for reach.' },
      { style: 'Traffic', cta: 'Full before/after guide is linked in bio.', tip: 'Clear destination.' },
      { style: 'Lead', cta: 'DM me CONSULT for a free 15-min skin plan call.', tip: 'DM keyword for leads.' },
      { style: 'Direct', cta: 'Book your microneedling series this month — spots fill fast.', tip: 'Urgency for warm traffic.' },
      { style: 'Engagement', cta: 'Tag someone who still thinks scars are forever.', tip: 'Share/tag mechanic.' },
    ],
  },

  ctaIdeas: [
    {
      cta: 'Comment SCARS for the checklist.',
      goal: 'engagement',
      friction: 'low',
      placement: 'caption_end',
      mechanic: 'keyword comment',
      notes: 'Boosts comments without hard sell.',
    },
    {
      cta: 'DM CONSULT to grab a free call.',
      goal: 'dms_leads',
      friction: 'medium',
      placement: 'caption_end',
      mechanic: 'DM keyword',
      notes: 'Lead capture for warm audience.',
    },
    {
      cta: 'Tap link in bio to book.',
      goal: 'sales',
      friction: 'medium',
      placement: 'caption_end',
      mechanic: 'link click',
      notes: 'Direct conversion path.',
    },
    {
      cta: 'Save this before your next appointment.',
      goal: 'engagement',
      friction: 'low',
      placement: 'on_screen_text',
      mechanic: 'save prompt',
      notes: 'On-screen for Reels.',
    },
    {
      cta: 'First comment: link to free PDF.',
      goal: 'dms_leads',
      friction: 'low',
      placement: 'first_comment',
      mechanic: 'first comment link',
      notes: 'Keeps caption clean.',
    },
  ],

  contentScore: {
    overallScore: 68,
    hookScore: 72,
    clarityScore: 70,
    valueScore: 65,
    algorithmAlignmentScore: 62,
    humanizerScore: 74,
    strengths: ['Clear niche language', 'Addresses a specific pain point'],
    risks: ['CTA is slightly vague', 'Opening could be more scroll-stopping'],
    fixes: [
      {
        area: 'hook',
        issue: 'First line reads like a blog title.',
        suggestedRewrite: 'Stop treating acne scars like they are only "texture."',
        impact: 'Stronger pattern interrupt in feed.',
      },
      {
        area: 'cta',
        issue: 'No single obvious next step.',
        suggestedRewrite: 'Comment SCARS and I will send the 3-step prep list.',
        impact: 'Higher comment intent and saves.',
      },
    ],
  },

  visualConcepts: [
    {
      conceptTitle: 'Clinical trust macro',
      format: 'reel',
      outputType: 'ai_image_prompt',
      promptOrGuide:
        'Extreme close-up of calm skin texture under soft clinical LED panels, 85mm lens, shallow depth of field, muted spa palette, 9:16, photorealistic editorial.',
      sceneBeats: ['Macro skin detail', 'Hand with device entering frame', 'Eyes relaxed in reflection'],
      visualMotifs: ['macro texture', 'soft LED', 'clinical minimal'],
      hookAlignment: 'authority / proof',
      difficulty: 'medium',
    },
    {
      conceptTitle: 'Before/after split',
      format: 'reel',
      outputType: 'ai_image_prompt',
      promptOrGuide:
        'Split-screen portrait same lighting: left uneven texture, right smoother glow, neutral background, 9:16, documentary realism, no text overlay.',
      sceneBeats: ['Split reveal', 'Subject neutral expression', 'Subtle smile payoff'],
      visualMotifs: ['split screen', 'matched lighting', 'no harsh filter'],
      hookAlignment: 'transformation',
      difficulty: 'easy',
    },
    {
      conceptTitle: 'BTS treatment room',
      format: 'reel',
      outputType: 'ai_image_prompt',
      promptOrGuide:
        'Behind-the-scenes medspa room, sanitized tray, gloved hands, warm tungsten + daylight mix, wide establishing shot transitioning to detail, 9:16 cinematic.',
      sceneBeats: ['Wide room', 'Tray detail', 'Patient POV glance'],
      visualMotifs: ['BTS authenticity', 'warm/cool contrast'],
      hookAlignment: 'storytime',
      difficulty: 'advanced',
    },
  ],
};

function sampleLog(name, item) {
  const preview =
    typeof item === 'string'
      ? item.slice(0, 120) + (item.length > 120 ? '…' : '')
      : JSON.stringify(item, null, 0).slice(0, 160);
  console.log(`  sample (${name}):`, preview);
}

function run() {
  console.log('AI Power Tools — offline shape QA\n');

  validateCaptionVariants(FIXTURES.captionVariants, { min: 2, max: 5 });
  console.log('✓ Captions:', FIXTURES.captionVariants.length, 'variants');
  sampleLog('caption', FIXTURES.captionVariants[0].caption);

  validateHashtagRows(FIXTURES.hashtags, { min: 5, max: 12 });
  console.log('✓ Hashtags:', FIXTURES.hashtags.length, 'tags');
  sampleLog('hashtag', FIXTURES.hashtags[0]);

  validateHookLines(FIXTURES.hooksText, { minLines: 6, maxLines: 12 });
  console.log('✓ Hooks: 6 lines parsed');
  sampleLog('hook', FIXTURES.hooksText.split('\n')[0]);

  validateStyledCtas(FIXTURES.styledCtas, { min: 5, max: 8 });
  console.log('✓ Styled CTAs:', FIXTURES.styledCtas.ctas.length);
  sampleLog('cta', FIXTURES.styledCtas.ctas[0].cta);

  validateCtaIdeas(FIXTURES.ctaIdeas, { min: 5, max: 8 });
  console.log('✓ CTA ideas (raw JSON shape):', FIXTURES.ctaIdeas.length);

  validateContentScoreRaw(FIXTURES.contentScore);
  console.log('✓ Content score (raw): overall', FIXTURES.contentScore.overallScore);
  sampleLog('fix', FIXTURES.contentScore.fixes[0]);

  validateVisualConcepts(FIXTURES.visualConcepts, { min: 3, max: 6 });
  console.log('✓ Visual concepts:', FIXTURES.visualConcepts.length);
  sampleLog('concept', FIXTURES.visualConcepts[0].conceptTitle);

  console.log('\nAll contract checks passed.');
}

try {
  run();
} catch (e) {
  console.error('\nQA FAILED:', e.message);
  process.exit(1);
}
