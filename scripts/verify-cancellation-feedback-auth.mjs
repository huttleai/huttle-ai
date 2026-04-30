import { readFileSync } from 'node:fs';

const apiSource = readFileSync(new URL('../api/submit-cancellation-feedback.js', import.meta.url), 'utf8');
const modalSource = readFileSync(new URL('../src/components/CancelSubscriptionModal.jsx', import.meta.url), 'utf8');

const requiredApiPatterns = [
  /import\s+\{\s*authenticateBillingRequest\s*\}\s+from\s+['"]\.\/_utils\/billing\.js['"]/,
  /authenticateBillingRequest\(req,\s*supabase\)/,
  /user_id\s*&&\s*user_id\s*!==\s*authResult\.user\.id/,
  /const\s+authenticatedUserId\s*=\s*authResult\.user\.id/,
  /\.eq\(['"]user_id['"],\s*authenticatedUserId\)/,
  /user_id:\s*authenticatedUserId/,
];

const forbiddenApiPatterns = [
  /Missing required fields:\s*user_id,\s*reason/,
  /\.eq\(['"]user_id['"],\s*user_id\)/,
  /user_id:\s*user_id\b/,
];

const requiredModalPatterns = [
  /import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/config\/supabase['"]/,
  /supabase\.auth\.getSession\(\)/,
  /if\s*\(!session\?\.access_token\)\s*return;/,
  /Authorization:\s*`Bearer \$\{session\.access_token\}`/,
];

const forbiddenModalPatterns = [
  /user_id:\s*userId/,
];

function assertPatterns(source, patterns, label) {
  for (const pattern of patterns) {
    if (!pattern.test(source)) {
      throw new Error(`${label} is missing required pattern: ${pattern}`);
    }
  }
}

function assertNoPatterns(source, patterns, label) {
  for (const pattern of patterns) {
    if (pattern.test(source)) {
      throw new Error(`${label} still contains forbidden pattern: ${pattern}`);
    }
  }
}

assertPatterns(apiSource, requiredApiPatterns, 'submit-cancellation-feedback');
assertNoPatterns(apiSource, forbiddenApiPatterns, 'submit-cancellation-feedback');
assertPatterns(modalSource, requiredModalPatterns, 'CancelSubscriptionModal');
assertNoPatterns(modalSource, forbiddenModalPatterns, 'CancelSubscriptionModal');

console.log('cancellation feedback auth regression checks passed');
