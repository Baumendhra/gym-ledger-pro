-- Table 1: Stores member push tokens (device subscriptions)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, endpoint)
);

-- Table 2: Tracks every notification sent and member's response
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('at_risk', 'reminder')),
  message     text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'sent'
              CHECK (status IN ('sent', 'coming', 'later', 'restart', 'called')),
  action_time timestamptz
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gym owner manages subscriptions" ON public.push_subscriptions
  FOR ALL USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "Anon can insert subscription" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can read subscriptions" ON public.push_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "Gym owner views logs" ON public.notification_logs
  FOR ALL USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "Anon can update log status" ON public.notification_logs
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_push_sub_member ON public.push_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_member ON public.notification_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_sent_at ON public.notification_logs(sent_at);