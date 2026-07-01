import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), 'utf8');
}

function assertContains(filePath, needle, description) {
  const source = read(filePath);
  if (!source.includes(needle)) {
    throw new Error(`${description} missing in ${filePath}`);
  }
}

function assertNotContains(filePath, needle, description) {
  const source = read(filePath);
  if (source.includes(needle)) {
    throw new Error(`${description} still present in ${filePath}`);
  }
}

const planBuilderPath = 'src/pages/AIPlanBuilder.jsx';
const usageHookPath = 'src/hooks/useAIUsage.js';

assertContains(
  planBuilderPath,
  'const usageResult = await planUsage.trackFeatureUsage',
  'Plan Builder metering result check'
);
assertContains(
  planBuilderPath,
  'if (!usageResult.allowed)',
  'Plan Builder metering rejection branch'
);
assertNotContains(
  planBuilderPath,
  'incrementFeatureCounter: false',
  'Plan Builder run-counter bypass'
);
assertContains(
  usageHookPath,
  'reason: \'subscription_required\'',
  'Zero-credit subscription gate'
);
assertContains(
  usageHookPath,
  'return { allowed: false, reason: \'tracking_failed\' }',
  'Usage insert failure gate'
);

console.log('Plan Builder metering guards passed');
