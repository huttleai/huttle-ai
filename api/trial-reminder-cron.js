import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { maybeSendTrialReminder } from './_utils/trialReminderUtils.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CRON_SECRET) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  }

  const providedSecret = req.headers['x-cron-secret'] || req.headers.authorization?.replace('Bearer ', '');
  if (providedSecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!stripe || !supabase) {
    return res.status(500).json({ error: 'Billing reminder services are not configured' });
  }

  try {
    const now = new Date();
    const reminderWindowEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('status', 'trialing')
      .not('trial_end', 'is', null)
      .gte('trial_end', now.toISOString())
      .lte('trial_end', reminderWindowEnd.toISOString());

    if (error) {
      throw error;
    }

    const summary = {
      checked: subscriptions?.length || 0,
      sent: 0,
      skipped: 0,
      errors: [],
    };

    for (const row of subscriptions || []) {
      if (!row?.stripe_subscription_id) {
        summary.skipped += 1;
        continue;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        const result = await maybeSendTrialReminder({ stripe, supabase, subscription });

        if (result?.success) {
          summary.sent += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (subscriptionError) {
        summary.errors.push({
          subscriptionId: row.stripe_subscription_id,
          error: subscriptionError.message,
        });
      }
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Trial reminder cron failed:', error);
    return res.status(500).json({ error: error.message || 'Trial reminder cron failed' });
  }
}
