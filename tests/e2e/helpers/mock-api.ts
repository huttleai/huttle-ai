import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page, Route } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

function fixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(__dirname, '../../fixtures/mock-responses', name), 'utf-8')) as Record<
    string,
    unknown
  >;
}

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
    return JSON.parse(postData) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function buildHooksResponse() {
  return (fixture('grok-hooks.json') as { hooks: string }).hooks;
}

function buildCaptionResponse() {
  return (fixture('grok-caption.json') as { captions: string }).captions;
}

function buildHashtagResponse() {
  return '#contentstrategy #creatorgrowth #aitools #socialmediamarketing #founderbrand #growthmarketing #contenttips #nichebrand #audiencegrowth #reelsstrategy #shortform';
}

function buildCtaResponse() {
  return '1. Save this for your next content sprint.\n2. DM me the word SYSTEM and I will send the framework.\n3. Comment READY for a checklist.\n4. Follow for part two tomorrow.\n5. Share this with a founder who needs it.';
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

function buildContentRemixResponse(mode: string) {
  const base = {
    success: true,
    content: [
      mode === 'sales'
        ? '### Instagram\nSales Conversion: lead with pain, proof, then a booking CTA.'
        : '### Instagram\nViral Reach: pattern interrupt, fast beats, retention CTA.',
      '',
      '### TikTok',
      mode === 'sales'
        ? 'Sales Conversion: short demo + one next step.'
        : 'Viral Reach: rant-to-lesson structure for shares.',
    ].join('\n'),
    sections: [
      {
        platform: 'Instagram',
        variations:
          mode === 'sales'
            ? ['Lead with pain, add proof, close with one CTA.']
            : ['Pattern interrupt, then deliver the insight fast.'],
      },
      {
        platform: 'TikTok',
        variations:
          mode === 'sales'
            ? ['Demo the fix in 20 seconds.']
            : ['Open with tension, end with curiosity.'],
      },
    ],
    metadata: {
      model: 'claude-sonnet-4-6-20250514',
      requestedMode: mode,
      normalizedMode: mode === 'sales' ? 'sales_conversion' : 'viral_reach',
      platformCount: 2,
    },
    usage: { input_tokens: 180, output_tokens: 420 },
  };
  return base;
}

function buildJsonContentResponse() {
  return JSON.stringify({
    content:
      'Creators do not need more hours. They need a repeatable system that turns one insight into three strong posts.',
    hashtags: '#creatorgrowth #contentstrategy #aitools',
    tips: ['Lead with a sharp tension point.', 'Keep the CTA singular.'],
    hooks: ['Your content problem is probably a workflow problem.', 'Most creators are optimizing the wrong step.'],
  });
}

function buildDeepDiveResponse() {
  return fixture('perplexity-deep-dive.json') as Record<string, unknown>;
}

function buildGrokContent(body: Record<string, unknown>) {
  const text = JSON.stringify(body).toLowerCase();

  if (text.includes('format as json')) return buildJsonContentResponse();
  if (text.includes('numbered hooks') || text.includes('hook sniper')) return buildHooksResponse();
  if (text.includes('caption architect')) return buildCaptionResponse();
  if (text.includes('hashtags')) return buildHashtagResponse();
  if (text.includes('cta')) return buildCtaResponse();
  if (text.includes('score') || text.includes('quality')) return buildScoreResponse();

  return buildCaptionResponse();
}

function perplexityTrendsJsonString() {
  return JSON.stringify(fixture('perplexity-trends.json'));
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Default subscription mock — override per test with page.route if needed */
export function getDefaultSubscriptionMock() {
  return fixture('stripe-subscription.json');
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

/**
 * Intercepts all external-ish API routes so E2E never hits real AI, Stripe, or n8n.
 */
export async function mockAllAPIs(page: Page, options?: { subscription?: Record<string, unknown> }) {
  const subBody = options?.subscription ?? getDefaultSubscriptionMock();

  // Broad Supabase REST stub — register first; table-specific routes below override by URL.
  await page.route('**/rest/v1/**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await fulfillJson(route, []);
      return;
    }
    if (method === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await fulfillJson(route, [{}], 201);
  });

  await page.route('**/api/ai/grok**', async (route) => {
    const body = parseJson(route.request().postData());
    await fulfillJson(route, {
      success: true,
      content: buildGrokContent(body),
      usage: { total_tokens: 321 },
    });
  });

  await page.route('**/api/ai/perplexity**', async (route) => {
    const body = parseJson(route.request().postData());
    const msg = JSON.stringify(body.messages ?? []).toLowerCase();
    if (msg.includes('scan for the top 5 trends')) {
      await fulfillJson(route, {
        success: true,
        content: perplexityTrendsJsonString(),
        citations: ['https://example.com/trend-source'],
        usage: { total_tokens: 210 },
      });
      return;
    }
    if (msg.includes('audience insight') || msg.includes('demographic')) {
      await fulfillJson(route, {
        success: true,
        content: JSON.stringify({
          demographics: 'Creators 25-44, US/UK heavy.',
          interests: ['workflow systems', 'short-form video'],
          pain_points: ['inconsistent posting', 'weak hooks'],
        }),
        usage: { total_tokens: 180 },
      });
      return;
    }
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

  await page.route('**/api/ignite-engine-proxy**', async (route) => {
    const ignite = fixture('claude-ignite.json') as Record<string, unknown>;
    await fulfillJson(route, ignite);
  });

  await page.route('**/api/ai/content-remix**', async (route) => {
    const body = parseJson(route.request().postData());
    const mode = String(body.mode ?? 'viral').toLowerCase();
    await fulfillJson(route, buildContentRemixResponse(mode.includes('sales') ? 'sales' : 'viral'));
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

  await page.route('**/api/create-payment-method-update-session**', async (route) => {
    await fulfillJson(route, {
      url: 'https://billing.stripe.com/payment-method/mock',
    });
  });

  await page.route('**/api/subscription-status**', async (route) => {
    await fulfillJson(route, subBody);
  });

  await page.route('**/api/billing-summary**', async (route) => {
    await fulfillJson(route, {
      summary: {
        subscription: { id: 'sub_mock', status: 'active', tier: 'pro' },
        paymentMethod: { brand: 'visa', last4: '4242' },
        invoicesEnabled: true,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  });

  await page.route('**/api/billing-invoices**', async (route) => {
    await fulfillJson(route, {
      invoices: [
        {
          id: 'in_mock_1',
          number: 'INV-0001',
          status: 'paid',
          amount_paid: 3900,
          currency: 'usd',
          created: Math.floor(Date.now() / 1000) - 86400 * 7,
          hosted_invoice_url: 'https://invoice.stripe.com/mock',
        },
      ],
    });
  });

  await page.route('**/api/cancel-subscription**', async (route) => {
    await fulfillJson(route, {
      success: true,
      cancel_at_period_end: true,
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  await page.route('**/api/change-subscription-plan**', async (route) => {
    await fulfillJson(route, {
      success: true,
      mode: 'immediate',
      message: 'Plan updated (mock).',
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
    const planJson = fixture('claude-plan-builder.json');
    await fulfillJson(route, {
      success: true,
      job: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'plan_builder',
        status: 'completed',
        result: planJson,
      },
    });
  });

  await page.route('**/api/save-onboarding**', async (route) => {
    await fulfillJson(route, { success: true });
  });

  await page.route('**/api/subscribe-waitlist**', async (route) => {
    await fulfillJson(route, {
      success: true,
      message: 'Successfully joined the waitlist!',
    });
  });

  await page.route('**/*.app.n8n.cloud/**', async (route) => {
    await fulfillJson(route, { success: true });
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

  await page.route('**/rest/v1/user_preferences*', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await fulfillJson(route, {});
      return;
    }
    await fulfillJson(route, [{}], 201);
  });

  await page.route('**/rest/v1/jobs*', async (route) => {
    const method = route.request().method();
    const planJson = fixture('claude-plan-builder.json');
    if (method === 'POST') {
      await fulfillJson(route, [{ id: '550e8400-e29b-41d4-a716-446655440000', status: 'queued' }], 201);
      return;
    }
    await fulfillJson(route, [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'completed',
        result: planJson,
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
    await fulfillJson(route, [{ id: 'vault-new' }], 201);
  });
}

/** @deprecated use mockAllAPIs */
export async function setupMockApis(page: Page) {
  await mockAllAPIs(page);
}
