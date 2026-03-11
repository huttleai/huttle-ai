import fs from 'fs';
import { chromium } from '@playwright/test';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

const browser = await chromium.launch({
  headless: true,
  executablePath,
});

const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
const failingResponses = [];

page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrors.push(message.text());
  }
});

page.on('response', (response) => {
  if (response.status() >= 400) {
    failingResponses.push({
      status: response.status(),
      url: response.url(),
    });
  }
});

const uniqueId = Date.now();
const email = `Angela.solo.${uniqueId}@example.com`;
const password = `Huttle${uniqueId}A1`;

async function waitForCreateAccountEnabled() {
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll('button')).find((node) =>
      /create account/i.test(node.textContent || '')
    );
    return button && !button.disabled;
  });
}

async function textContent(selector) {
  const value = await page.locator(selector).first().textContent();
  return value?.trim() || '';
}

try {
  await page.goto('http://localhost:5174/dashboard/signup', { waitUntil: 'networkidle' });

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await waitForCreateAccountEnabled();
  await page.getByRole('button', { name: /create account/i }).click();

  await page.waitForURL('**/onboarding', { timeout: 30000 });

  const continueButton = page.getByRole('button', { name: /continue/i });
  const continueDisabledBeforeSelect = await continueButton.isDisabled();

  const creatorQuestion = await textContent('h2');
  await page.getByRole('button', { name: /solo creator/i }).click();
  await continueButton.click();

  const step2Question = await textContent('h2');
  await page.locator('input[type="text"]').fill('Fitness and healthy eating');
  await continueButton.click();

  const step3Question = await textContent('h2');
  const growthOptions = await page.locator('button').evaluateAll((buttons) =>
    buttons
      .map((button) => button.textContent || '')
      .filter((text) =>
        ['Just Starting Out', 'Building Momentum', 'Established', 'Large Audience'].some((label) =>
          text.includes(label)
        )
      )
  );
  await page.getByRole('button', { name: /building momentum/i }).click();
  await continueButton.click();

  const audienceQuestion = await textContent('h2');
  const audiencePlaceholder = await page.locator('textarea').getAttribute('placeholder');
  await page.locator('textarea').fill('Busy moms who want quick healthy meals');
  await continueButton.click();

  const selectedCountBefore = await textContent('span.rounded-full');
  await page.getByRole('button', { name: /^Instagram$/i }).click();
  await page.getByRole('button', { name: /^TikTok$/i }).click();
  await page.getByRole('button', { name: /^Facebook$/i }).click();
  await page.getByRole('button', { name: /^YouTube$/i }).click();
  await page.getByRole('button', { name: /^LinkedIn$/i }).click();
  const selectedCountAfter = await textContent('span.rounded-full');
  await continueButton.click();

  const cityLabel = await textContent('label');
  const finalButtonText = await page.getByRole('button', { name: /dashboard|let's go/i }).textContent();
  const skipVisible = await page.getByRole('button', { name: /skip for now/i }).isVisible();
  await page.locator('input[type="text"]').fill('Atlanta');
  await page.getByRole('button', { name: /dashboard|let's go/i }).click();

  await page.waitForTimeout(10000);
  await page.waitForFunction(() => !document.body.innerText.includes("Fetching today's insights"), { timeout: 30000 }).catch(() => {});
  const postSubmitUrl = page.url();
  const dashboardText = await page.locator('body').innerText();
  const greeting = await textContent('h1');
  const trendingSubtitle = /Hot topics in [^\n]+|What'?s trending on [^\n]+|What’s trending on [^\n]+/.exec(dashboardText)?.[0] || null;
  const hashtagMatches = [...dashboardText.matchAll(/#[A-Za-z0-9_]+/g)].map((match) => match[0]);
  const uniqueHashtagCount = new Set(hashtagMatches).size;
  const hashtagButtonTexts = await page.locator('button').evaluateAll((buttons) =>
    buttons
      .map((button) => (button.textContent || '').trim())
      .filter((text) => text.includes('#'))
  );
  const hashtagsSectionStart = dashboardText.indexOf('Hashtags of the Day');
  const aiInsightsSectionStart = dashboardText.indexOf('AI Insights');
  const hashtagsSectionExcerpt = hashtagsSectionStart !== -1
    ? dashboardText.slice(hashtagsSectionStart, aiInsightsSectionStart === -1 ? undefined : aiInsightsSectionStart).slice(0, 500)
    : null;
  const aiInsightsVisible = dashboardText.includes('AI Insights') && !dashboardText.includes('No daily insights available yet.');
  const momentumLabels = ['rising', 'steady', 'surging']
    .filter((label) => new RegExp(`\\b${label}\\b`, 'i').test(dashboardText));
  console.log('POST_SUBMIT', JSON.stringify({
    postSubmitUrl,
    greeting,
    trendingSubtitle,
    uniqueHashtagCount,
    hashtagButtonTexts,
    hashtagsSectionExcerpt,
    aiInsightsVisible,
    momentumLabels,
    dashboardExcerpt: dashboardText.slice(0, 500),
  }, null, 2));

  await page.reload({ waitUntil: 'networkidle' });
  const quizAfterReload = /How will you use Huttle AI\?/.test(await page.locator('body').innerText());

  await page.goto('http://localhost:5174/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(18000);
  const onboardingUrlAfterDirectNav = page.url();
  const redirectedFromOnboarding = onboardingUrlAfterDirectNav.includes('/dashboard');
  const directNavExcerpt = (await page.locator('body').innerText()).slice(0, 250);

  let quizAfterRelogin = null;
  if (await page.getByRole('button', { name: /sign out/i }).count()) {
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL('**/dashboard/login', { timeout: 30000 });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    quizAfterRelogin = /How will you use Huttle AI\?/.test(await page.locator('body').innerText());
  }

  console.log(JSON.stringify({
    email,
    creatorQuestion,
    continueDisabledBeforeSelect,
    step2Question,
    step3Question,
    growthOptions,
    audienceQuestion,
    audiencePlaceholder,
    selectedCountBefore,
    selectedCountAfter,
    cityLabel,
    finalButtonText: finalButtonText?.trim() || null,
    skipVisible,
    postSubmitUrl,
    greeting,
    trendingSubtitle,
    uniqueHashtagCount,
    hashtagButtonTexts,
    hashtagsSectionExcerpt,
    aiInsightsVisible,
    momentumLabels,
    quizAfterReload,
    redirectedFromOnboarding,
    onboardingUrlAfterDirectNav,
    directNavExcerpt,
    quizAfterRelogin,
    consoleErrors,
    failingResponses,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
