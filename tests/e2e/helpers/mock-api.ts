import type { Page, Route } from '@playwright/test';

const demoBrandData = {
  firstName: 'Sean',
  profileType: 'brand',
  brandName: 'Huttle AI',
  niche: 'AI tools, creator growth, SaaS marketing',
  industry: 'Technology',
  targetAudience: 'Founders, marketers, and creators',
  brandVoice: 'Confident, practical, punchy',
  platforms: ['Instagram', 'TikTok', 'X', 'YouTube'],
  goals: ['Grow followers', 'Drive engagement'],
  contentStrengths: ['Education', 'Storytelling'],
  biggestChallenge: 'consistency',
  hookStylePreference: 'bold-claim',
  emotionalTriggers: ['confidence', 'curiosity'],
};

const demoSavedContent = [
  {
    id: 101,
    name: 'Founder launch hook',
    type: 'text',
    content: 'The fastest way to kill momentum is waiting for perfect.',
    savedAt: '2026-03-01T12:00:00.000Z',
  },
  {
    id: 102,
    name: 'Creator workflow caption',
    type: 'text',
    content: 'Three content systems that keep creators consistent without burnout.',
    savedAt: '2026-03-02T12:00:00.000Z',
  },
];

const demoSocialUpdates = [
  {
    id: 'update-1',
    platform: 'Instagram',
    title: 'Reels recommendation weighting updated',
    description: 'Instagram is giving stronger distribution to Reels with higher early retention and saves.',
    impact: 'high',
    update_type: 'algorithm change',
    action_required: true,
    what_it_means: 'Front-load your best hook and optimize for saves if you want more reach.',
    source_url: 'https://example.com/instagram-update',
    fetched_at: '2026-03-08T12:00:00.000Z',
    published_date: '2026-03-07',
    expires_at: '2026-04-07T12:00:00.000Z',
  },
  {
    id: 'update-2',
    platform: 'TikTok',
    title: 'Search labels expanded for creators',
    description: 'TikTok is surfacing more search-intent labels above videos in educational niches.',
    impact: 'medium',
    update_type: 'creator tools',
    action_required: false,
    what_it_means: 'Use explicit keywords in your opening lines so TikTok can classify your post correctly.',
    source_url: 'https://example.com/tiktok-update',
    fetched_at: '2026-03-08T12:00:00.000Z',
    published_date: '2026-03-05',
    expires_at: '2026-04-05T12:00:00.000Z',
  },
];

function parseJson(postData: string | null) {
  if (!postData) return {};

  try {
    return JSON.parse(postData);
  } catch {
    return {};
  }
}

function buildHooksResponse() {
  return '1. Most creators are doing this backwards.\n2. This one shift changed our content results fast.\n3. If your posts are stalling, start here.';
}

function buildCaptionResponse() {
  return 'Most creators do not need more ideas. They need a system that turns one insight into multiple high-conviction posts.\n\nStart with a strong hook, make the takeaway painfully clear, and give people one next step.\n\nSave this and use it in your next draft.';
}

function buildHashtagResponse() {
  return '#contentstrategy #creatorgrowth #aitools #socialmediamarketing #founderbrand #growthmarketing #contenttips';
}

function buildCtaResponse() {
  return '1. Save this for your next content sprint.\n2. DM me the word SYSTEM and I will send the framework.\n3. Which part of your workflow needs the biggest upgrade?';
}

function buildScoreResponse() {
  return JSON.stringify({
    overallScore: 88,
    clarity: 90,
    hookStrength: 86,
    originality: 84,
    improvements: ['Add one sharper concrete example.'],
  });
}

function buildContentRemixResponse() {
  return {
    success: true,
    content: [
      '### Instagram',
      'Variation 1: Turn one founder lesson into a save-worthy carousel with a bold first slide and a punchy takeaway.',
      '',
      'Variation 2: Open with the hard truth founders avoid, then break the lesson into three quick, screenshot-ready insights.',
      '',
      'Variation 3: Reframe the lesson as a founder confession with a short story and a comments CTA.',
      '',
      '### TikTok',
      'Variation 1: Lead with a pattern interrupt, deliver the founder lesson in fast beats, and close with "want part 2?"',
      '',
      'Variation 2: Use a creator-style mini rant that flips into one tactical founder takeaway people can steal today.',
      '',
      'Variation 3: Open with "if I were starting over" and turn the lesson into a quick-hit script built for retention.',
      '',
      '### X',
      'Variation 1: Turn the insight into a sharp thread opener followed by concise founder lessons and one CTA to bookmark.',
      '',
      'Variation 2: Write it like a contrarian founder take with one clean example and a reply-driving close.',
      '',
      'Variation 3: Frame it as a compact operating principle founders can quote, share, and reuse.',
      '',
      '### YouTube',
      'Variation 1: Expand the lesson into a curiosity-led short-form script with a stronger payoff in the final line.',
      '',
      'Variation 2: Position it like a quick founder tutorial with one mistake, one fix, and one next step.',
      '',
      'Variation 3: Use a more narrative hook that promises a concrete founder outcome before delivering the lesson.',
    ].join('\n'),
    sections: [
      {
        platform: 'Instagram',
        variations: [
          'Turn one founder lesson into a save-worthy carousel with a bold first slide and a punchy takeaway.',
          'Open with the hard truth founders avoid, then break the lesson into three quick, screenshot-ready insights.',
          'Reframe the lesson as a founder confession with a short story and a comments CTA.',
        ],
      },
      {
        platform: 'TikTok',
        variations: [
          'Lead with a pattern interrupt, deliver the founder lesson in fast beats, and close with "want part 2?"',
          'Use a creator-style mini rant that flips into one tactical founder takeaway people can steal today.',
          'Open with "if I were starting over" and turn the lesson into a quick-hit script built for retention.',
        ],
      },
      {
        platform: 'X',
        variations: [
          'Turn the insight into a sharp thread opener followed by concise founder lessons and one CTA to bookmark.',
          'Write it like a contrarian founder take with one clean example and a reply-driving close.',
          'Frame it as a compact operating principle founders can quote, share, and reuse.',
        ],
      },
      {
        platform: 'YouTube',
        variations: [
          'Expand the lesson into a curiosity-led short-form script with a stronger payoff in the final line.',
          'Position it like a quick founder tutorial with one mistake, one fix, and one next step.',
          'Use a more narrative hook that promises a concrete founder outcome before delivering the lesson.',
        ],
      },
    ],
    metadata: {
      model: 'claude-sonnet-4-6-20250514',
      requestedMode: 'viral',
      normalizedMode: 'viral_reach',
      platformCount: 4,
    },
    usage: { input_tokens: 180, output_tokens: 420 },
  };
}

function buildJsonContentResponse() {
  return JSON.stringify({
    content: 'Creators do not need more hours. They need a repeatable system that turns one insight into three strong posts.',
    hashtags: '#creatorgrowth #contentstrategy #aitools',
    tips: ['Lead with a sharp tension point.', 'Keep the CTA singular.'],
    hooks: ['Your content problem is probably a workflow problem.', 'Most creators are optimizing the wrong step.'],
  });
}

function buildDeepDiveResponse() {
  return {
    success: true,
    report: {
      overview: 'Creator workflow automation is gaining traction across short-form platforms, especially where proof-based education is outperforming generic advice.',
      confidence: {
        level: 'High',
      },
      active_trends: [
        {
          name: 'Workflow proof posts',
          status: 'Rising',
          velocity: 'Steady',
          primary_platform: 'Instagram',
          evidence: 'Creators are packaging systems into before-and-after breakdowns and save-focused carousel formats.',
          why_it_matters: 'Concrete proof angles make AI and productivity content feel more credible and easier to share.',
        },
      ],
      platform_activity: [
        {
          name: 'Instagram',
          activity_level: 'High',
          top_format: 'Carousels',
          "what's_happening": 'Educational system breakdowns with strong first-slide hooks are driving saves and shares.',
        },
        {
          name: 'TikTok',
          activity_level: 'Medium',
          top_format: 'Short talking-head videos',
          "what's_happening": 'Fast workflow recaps and creator process clips are pulling attention when they lead with a clear pain point.',
        },
      ],
      competitor_landscape: 'Top creator-education accounts are leaning into repeatable frameworks, proof screenshots, and lightweight behind-the-scenes process content.',
      audience_sentiment: {
        overall_mood: 'Positive',
        detail: 'Audiences respond well when the advice feels practical, current, and immediately usable.',
      },
      timing_window: {
        action_window: 'This week',
        reasoning: 'The topic still has momentum, but creators are rewarding fast execution and fresh examples.',
        lifespan: 'Likely relevant for the next 1-2 weeks',
      },
    },
    citations: ['https://example.com/deep-dive'],
    metadata: {
      processed_at: '2026-03-10T12:00:00.000Z',
      sections_parsed: {
        trend_count: 1,
        platform_count: 2,
        has_competitors: true,
      },
    },
  };
}

function buildGrokContent(body: Record<string, unknown>) {
  const text = JSON.stringify(body).toLowerCase();

  if (text.includes('format as json')) return buildJsonContentResponse();
  if (text.includes('numbered hooks') || text.includes('hook sniper')) return buildHooksResponse();
  if (text.includes('caption architect')) return buildCaptionResponse();
  if (text.includes('hashtags')) return buildHashtagResponse();
  if (text.includes('cta')) return buildCtaResponse();
  if (text.includes('score') || text.includes('quality')) return buildScoreResponse();

  return 'Generated content for Huttle AI test coverage.';
}

export async function seedDemoState(page: Page) {
  await page.addInitScript(
    ({ brandData, savedContent, socialUpdates }) => {
      window.localStorage.setItem('brandData', JSON.stringify(brandData));
      window.localStorage.setItem('savedContent', JSON.stringify(savedContent));
      window.localStorage.setItem(
        'userSettings',
        JSON.stringify({
          language: 'en',
          timezone: 'America/New_York',
        })
      );
      window.localStorage.setItem(
        'huttle-auth-token',
        JSON.stringify({
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: 1893456000,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'dev-user-123',
            email: 'dev@huttle.ai',
          },
        })
      );
      window.localStorage.setItem('has_completed_onboarding:dev-user-123', 'true');
      window.localStorage.setItem('huttleSocialUpdatesRead', JSON.stringify([]));
      window.sessionStorage.setItem(
        'draftContent',
        JSON.stringify({
          source: 'ai-tools',
          tool: 'caption',
          title: 'AI Draft',
          caption: 'A seeded draft from the Playwright suite.',
          platforms: ['Instagram'],
        })
      );
      window.localStorage.setItem('playwright_social_updates', JSON.stringify(socialUpdates));
    },
    {
      brandData: demoBrandData,
      savedContent: demoSavedContent,
      socialUpdates: demoSocialUpdates,
    }
  );
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function setupMockApis(page: Page) {
  await page.route('**/api/ai/grok**', async (route) => {
    const body = parseJson(route.request().postData());

    await fulfillJson(route, {
      success: true,
      content: buildGrokContent(body),
      usage: { total_tokens: 321 },
    });
  });

  await page.route('**/api/ai/perplexity**', async (route) => {
    await fulfillJson(route, {
      success: true,
      content:
        'Trending themes: creator-led education, behind-the-scenes proof, and simple system breakdowns.',
      citations: ['https://example.com/perplexity-source'],
      usage: { total_tokens: 210 },
    });
  });

  await page.route('**/api/ai/claude**', async (route) => {
    const body = parseJson(route.request().postData());

    await fulfillJson(route, {
      success: true,
      content: buildGrokContent(body),
      usage: { input_tokens: 120, output_tokens: 240 },
    });
  });

  await page.route('**/api/ai/content-remix**', async (route) => {
    await fulfillJson(route, buildContentRemixResponse());
  });

  await page.route('**/api/ai/n8n-generator**', async (route) => {
    await fulfillJson(route, {
      success: true,
      content: 'Instagram remix variation focused on practical creator workflows.',
      hashtags: '#contentremix #creatorworkflow #growthcontent',
      metadata: { model: 'mock-n8n', processingTime: 1200 },
    });
  });

  await page.route('**/api/ai/deep-dive**', async (route) => {
    await fulfillJson(route, buildDeepDiveResponse());
  });

  await page.route('**/api/ai/trend-deep-dive**', async (route) => {
    await fulfillJson(route, buildDeepDiveResponse());
  });

  await page.route('**/api/create-checkout-session**', async (route) => {
    await fulfillJson(route, {
      sessionId: 'cs_test_mock',
      url: 'https://checkout.stripe.com/pay/cs_test_mock',
    });
  });

  await page.route('**/api/create-portal-session**', async (route) => {
    await fulfillJson(route, {
      url: 'https://billing.stripe.com/session/mock',
    });
  });

  await page.route('**/api/subscription-status**', async (route) => {
    await fulfillJson(route, {
      subscription: 'sub_mock_founder',
      plan: 'founder',
      status: 'active',
      currentPeriodEnd: '2026-12-31T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    });
  });

  await page.route('**/api/create-plan-builder-job**', async (route) => {
    await fulfillJson(route, {
      success: true,
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'queued',
      requestId: 'mock-request',
    });
  });

  await page.route('**/api/plan-builder-proxy**', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'Webhook triggered successfully',
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      requestId: 'mock-request',
    });
  });

  await page.route('**/api/get-job-status**', async (route) => {
    await fulfillJson(route, {
      success: true,
      job: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'plan_builder',
        status: 'completed',
        result: {
          goal: 'Grow followers',
          period: '7',
          totalPosts: 4,
          platforms: ['Instagram', 'TikTok'],
          contentMix: {
            educational: 2,
            authority: 1,
            conversion: 1,
          },
          schedule: [
            {
              day: 1,
              posts: [
                {
                  topic: 'Three systems creators can steal this week',
                  content_type: 'Reel',
                  reasoning: 'High save potential with a strong educational angle.',
                  platform: 'Instagram',
                },
              ],
            },
            {
              day: 3,
              posts: [
                {
                  topic: 'The fastest way to improve retention in 15 seconds',
                  content_type: 'Short',
                  reasoning: 'Short-form proof content aligns with growth goals.',
                  platform: 'TikTok',
                },
              ],
            },
          ],
        },
      },
    });
  });

  await page.route('**/api/viral-blueprint-proxy**', async (route) => {
    await fulfillJson(route, {
      blueprint: 'Hook -> proof -> payoff -> CTA',
      directors_cut: [
        'Open with tension.',
        'Show one sharp proof point.',
        'End with a simple action.',
      ],
      seo_keywords: ['creator workflow', 'content system'],
      suggested_hashtags: ['#creatorgrowth', '#contentsystem', '#shortformtips'],
      viral_score: 92,
    });
  });

  await page.route('**/api/subscribe-waitlist**', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'Successfully joined the waitlist!',
    });
  });

  await page.route('**/rest/v1/social_updates*', async (route) => {
    await fulfillJson(route, demoSocialUpdates);
  });

  await page.route('**/rest/v1/user_feedback*', async (route) => {
    await fulfillJson(route, [{ id: 'feedback-1' }], 201);
  });

  await page.route('**/rest/v1/cancellation_feedback*', async (route) => {
    await fulfillJson(route, [{ id: 'cancel-1' }], 201);
  });

  await page.route('**/rest/v1/user_profile*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await fulfillJson(route, []);
      return;
    }

    await fulfillJson(route, [{}], 201);
  });

  await page.route('**/rest/v1/jobs*', async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      await fulfillJson(route, [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'queued',
        },
      ], 201);
      return;
    }

    await fulfillJson(route, [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        result: {
          goal: 'Grow followers',
          period: '7',
          totalPosts: 4,
          platforms: ['Instagram', 'TikTok'],
          contentMix: {
            educational: 2,
            authority: 1,
            conversion: 1,
          },
          schedule: [
            {
              day: 1,
              posts: [
                {
                  topic: 'Three systems creators can steal this week',
                  content_type: 'Reel',
                  reasoning: 'High save potential with a strong educational angle.',
                  platform: 'Instagram',
                },
              ],
            },
          ],
        },
      },
    ]);
  });

  await page.route('**/rest/v1/content_library*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await fulfillJson(route, [
        {
          id: 'vault-1',
          name: 'Founder launch hook',
          type: 'text',
          content: 'The fastest way to kill momentum is waiting for perfect.',
          description: 'Seeded vault item',
          size_bytes: 0,
          created_at: '2026-03-01T12:00:00.000Z',
        },
      ]);
      return;
    }

    await fulfillJson(route, [{ id: 'vault-1' }], 201);
  });
}
