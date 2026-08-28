import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const templateIds = read('api/emails/templateIds.js');
const sendEmail = read('api/emails/sendEmail.js');
const sendWelcome = read('api/emails/send-welcome.js');
const welcomeTrigger = read('api/emails/send-welcome-trigger.js');
const welcomeSignup = read('api/emails/welcomeSignup.js');
const usageAlerts = read('api/emails/usageThresholdAlerts.js');
const usageGate = read('api/_utils/usageGate.js');
const planBuilder = read('api/plan-builder-proxy.js');
const authContext = read('src/context/AuthContext.jsx');
const localApi = read('server/local-api-server.js');
const usageTrigger = read('api/emails/send-usage-alert-trigger.js');
const sendUsageAlert = read('api/emails/send-usage-alert.js');

assert.match(templateIds, /welcome: 'welcome'/);
assert.match(templateIds, /usageAlert80: 'usage-alert-80'/);
assert.match(templateIds, /EMAIL_TEMPLATES_PENDING_RESEND_DASHBOARD/);
assert.match(sendEmail, /export async function sendEmail/);
assert.match(sendWelcome, /EMAIL_TEMPLATE_IDS\.welcome/);
assert.match(sendWelcome, /brand_voice_url/);
assert.match(sendWelcome, /plan_builder_url/);
assert.match(sendWelcome, /ignite_engine_url/);
assert.match(sendWelcome, /first_name/);
assert.match(welcomeTrigger, /authenticateBillingRequest\(req, supabase\)/);
assert.match(welcomeTrigger, /maybeSendWelcomeEmail/);
assert.doesNotMatch(welcomeTrigger, /req\.body/);
assert.match(welcomeSignup, /already_sent/);
assert.match(welcomeSignup, /not_a_new_signup/);
assert.match(authContext, /triggerWelcomeEmail/);
assert.match(authContext, /signup/);

assert.match(sendUsageAlert, /EMAIL_TEMPLATE_IDS\.usageAlert80/);
assert.match(sendUsageAlert, /EMAIL_TEMPLATE_IDS\.usageAlert100/);
assert.match(usageAlerts, /resolveUsageAlertThreshold/);
assert.match(usageGate, /maybeSendUsageThresholdEmails/);
assert.match(usageGate, /recordGenerationUsage/);
assert.match(usageGate, /reserveFeatureUsage/);
assert.match(planBuilder, /maybeSendUsageThresholdEmails/);
assert.match(usageTrigger, /sendUsageAlertForThreshold/);
assert.match(usageTrigger, /threshold: 100/);
assert.match(localApi, /send-welcome-trigger/);
assert.match(localApi, /send-usage-alert-trigger/);

const recordIdx = usageGate.indexOf('export async function recordGenerationUsage');
const recordNotifyIdx = usageGate.indexOf('maybeSendUsageThresholdEmails', recordIdx);
assert(recordIdx >= 0 && recordNotifyIdx > recordIdx, 'recordGenerationUsage must notify usage thresholds after the write');

const reserveIdx = usageGate.indexOf('export async function reserveFeatureUsage');
const reserveNotifyIdx = usageGate.indexOf('maybeSendUsageThresholdEmails', reserveIdx);
assert(reserveIdx >= 0 && reserveNotifyIdx > reserveIdx, 'reserveFeatureUsage must notify usage thresholds after the write');

console.info('Transactional email wiring guards passed.');
