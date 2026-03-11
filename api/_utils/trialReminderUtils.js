import { sendTrialWarningEmail, shouldSendTrialWarning } from '../emails/send-trial-warning.js';
import { normalizePlanId } from './stripePlans.js';

function getAppUrl() {
  return process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
}

export function calculateDaysRemaining(trialEndUnix) {
  if (!trialEndUnix) return null;

  const trialEndDate = new Date(trialEndUnix * 1000);
  const remainingMs = trialEndDate.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

  return {
    daysRemaining,
    trialEndDate,
  };
}

export async function hasSentTrialReminder(supabase, { userId, subscriptionId, reminderType }) {
  const { data, error } = await supabase
    .from('trial_email_reminders')
    .select('id')
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscriptionId)
    .eq('reminder_type', reminderType)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return Boolean(data?.id);
}

export async function markTrialReminderSent(supabase, { userId, subscriptionId, reminderType, trialEndDate, resendId }) {
  const { error } = await supabase
    .from('trial_email_reminders')
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        reminder_type: reminderType,
        trial_end_at: trialEndDate.toISOString(),
        resend_email_id: resendId || null,
        sent_at: new Date().toISOString(),
      },
      {
        onConflict: 'stripe_subscription_id,reminder_type',
      }
    );

  if (error) {
    throw error;
  }
}

export async function getTrialReminderRecipient({ stripe, supabase, subscription }) {
  const customerId = subscription.customer;
  const appUrl = getAppUrl();

  if (!appUrl) {
    throw new Error('VITE_APP_URL is not configured');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profile')
    .select('user_id, first_name')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const customer = await stripe.customers.retrieve(customerId);
  const email = customer.deleted ? null : customer.email;

  if (!profile?.user_id || !email) {
    return null;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/dashboard/subscription`,
  });

  const { count, error: contentCountError } = await supabase
    .from('content_library')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.user_id);

  if (contentCountError) {
    throw contentCountError;
  }

  return {
    userId: profile.user_id,
    firstName: profile.first_name || 'there',
    email,
    manageUrl: portalSession.url,
    contentCount: count || 0,
  };
}

export async function maybeSendTrialReminder({ stripe, supabase, subscription }) {
  const reminderWindow = calculateDaysRemaining(subscription.trial_end);
  if (!reminderWindow || !shouldSendTrialWarning(reminderWindow.daysRemaining)) {
    return { skipped: true, reason: 'outside_reminder_window' };
  }

  const recipient = await getTrialReminderRecipient({ stripe, supabase, subscription });
  if (!recipient) {
    return { skipped: true, reason: 'recipient_not_found' };
  }

  const reminderType = reminderWindow.daysRemaining === 2 ? 'trial_2_days' : 'trial_1_day';
  const alreadySent = await hasSentTrialReminder(supabase, {
    userId: recipient.userId,
    subscriptionId: subscription.id,
    reminderType,
  });

  if (alreadySent) {
    return { skipped: true, reason: 'already_sent' };
  }

  const resendResponse = await sendTrialWarningEmail({
    email: recipient.email,
    firstName: recipient.firstName,
    daysRemaining: reminderWindow.daysRemaining,
    trialEndDate: reminderWindow.trialEndDate,
    plan: normalizePlanId(subscription.metadata?.planId || subscription.metadata?.plan),
    manageUrl: recipient.manageUrl,
    contentCount: recipient.contentCount,
  });

  await markTrialReminderSent(supabase, {
    userId: recipient.userId,
    subscriptionId: subscription.id,
    reminderType,
    trialEndDate: reminderWindow.trialEndDate,
    resendId: resendResponse?.data?.id || resendResponse?.id || null,
  });

  return {
    success: true,
    reminderType,
    daysRemaining: reminderWindow.daysRemaining,
  };
}
