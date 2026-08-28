import { getAppUrl } from '../_utils/billing.js';
import { sendWelcomeEmail } from './send-welcome.js';
import { EMAIL_ACTIVITY_FEATURES } from './templateIds.js';

const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_CONFIRMATION_WINDOW_MS = 24 * 60 * 60 * 1000;

function resolveFirstName(profile, user) {
  return (
    profile?.first_name
    || user?.user_metadata?.first_name
    || user?.user_metadata?.full_name
    || ''
  );
}

function isEligibleSignupMoment(user) {
  if (!user) return false;

  const now = Date.now();
  const createdMs = Date.parse(user.created_at);
  const confirmedMs = Date.parse(user.email_confirmed_at || user.confirmed_at || '');

  const isNewAccount = Number.isFinite(createdMs) && (now - createdMs) <= NEW_ACCOUNT_WINDOW_MS;
  const justConfirmed = Number.isFinite(confirmedMs)
    && (now - confirmedMs) <= RECENT_CONFIRMATION_WINDOW_MS;

  return isNewAccount || justConfirmed;
}

/**
 * Send Welcome exactly once per account, and only around signup / email
 * verification — not on later logins.
 *
 * @returns {Promise<{ sent?: boolean, skipped?: boolean, reason?: string }>}
 */
export async function maybeSendWelcomeEmail(supabase, { user } = {}) {
  if (!supabase || !user?.id) {
    return { skipped: true, reason: 'missing_params' };
  }

  if (!isEligibleSignupMoment(user)) {
    return { skipped: true, reason: 'not_a_new_signup' };
  }

  const { count: alreadySent, error: idempotencyError } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', EMAIL_ACTIVITY_FEATURES.welcome);

  if (idempotencyError) {
    throw idempotencyError;
  }

  if ((alreadySent ?? 0) > 0) {
    return { skipped: true, reason: 'already_sent' };
  }

  const { data: profile } = await supabase
    .from('user_profile')
    .select('first_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const email = user.email;
  if (!email) {
    return { skipped: true, reason: 'missing_email' };
  }

  const appUrl = getAppUrl();
  const firstName = resolveFirstName(profile, user);

  await sendWelcomeEmail({
    email,
    firstName,
    userId: user.id,
    brandVoiceUrl: `${appUrl}/dashboard/brand-voice`,
    planBuilderUrl: `${appUrl}/dashboard/plan-builder`,
    igniteEngineUrl: `${appUrl}/dashboard/ignite-engine`,
  });

  const { error: insertError } = await supabase.from('user_activity').insert({
    user_id: user.id,
    feature: EMAIL_ACTIVITY_FEATURES.welcome,
    metadata: { source: 'signup' },
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Welcome email sent but idempotency row failed:', insertError.message);
  }

  return { sent: true };
}

export { isEligibleSignupMoment };
