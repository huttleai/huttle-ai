/**
 * Regression guard for `/api/emails/send-usage-alert-trigger`.
 *
 * Security contract:
 * 1) Handler must reject unauthenticated requests (401).
 * 2) Handler must reject cross-user requests where body.userId != auth user (403).
 *
 * This is a static contract check (fast, no network/database calls).
 * Run: node scripts/verify-usage-alert-trigger-auth.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function fail(message) {
  throw new Error(`verify-usage-alert-trigger-auth: ${message}`);
}

const handlerPath = path.resolve(process.cwd(), 'api/emails/send-usage-alert-trigger.js');
const source = fs.readFileSync(handlerPath, 'utf8');

if (!source.includes('parseBearerToken')) {
  fail('missing bearer token parsing');
}

if (!source.includes('Authentication required')) {
  fail('missing explicit unauthenticated 401 guard');
}

if (!source.includes('Invalid authentication token')) {
  fail('missing invalid token 401 guard');
}

if (!source.includes('requestedUserId') || !source.includes('requestedUserId !== user.id')) {
  fail('missing cross-user mismatch check');
}

if (!source.includes('Forbidden: cannot trigger usage alert for another user')) {
  fail('missing 403 rejection for cross-user trigger');
}

if (!source.includes('const userId = user.id')) {
  fail('missing authenticated user binding');
}

if (source.includes('json({ sent: true, email')) {
  fail('response still contains email field (PII leak risk)');
}

console.log('verify-usage-alert-trigger-auth: OK');
