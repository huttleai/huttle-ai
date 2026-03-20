ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_cancelled_at
ON public.subscriptions (cancelled_at);
