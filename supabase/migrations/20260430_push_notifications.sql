-- ============================================================
-- Push Notification System — Migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Table: push_subscriptions ─────────────────────────────
-- Stores each member's browser push subscription (endpoint + keys)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, endpoint)
);

-- ── Table: notification_logs ──────────────────────────────
-- Tracks every notification sent + member's response action
CREATE TABLE IF NOT EXISTS notification_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('at_risk', 'reminder')),
  message     text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'sent'
              CHECK (status IN ('sent', 'coming', 'later', 'restart', 'called')),
  action_time timestamptz
);

-- ── RLS: push_subscriptions ───────────────────────────────
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated gym owner can manage subscriptions for their members
CREATE POLICY "Gym owner manages subscriptions" ON push_subscriptions
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Allow anon to INSERT (member scanning QR is not authenticated)
CREATE POLICY "Anon can insert subscription" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow anon to SELECT (to check if already subscribed)
CREATE POLICY "Anon can read subscriptions" ON push_subscriptions
  FOR SELECT
  USING (true);

-- ── RLS: notification_logs ────────────────────────────────
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated gym owner can view all logs for their members
CREATE POLICY "Gym owner views logs" ON notification_logs
  FOR ALL
  USING (
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Allow anon to UPDATE logs (member clicks notification button)
CREATE POLICY "Anon can update log status" ON notification_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anon to insert logs (Edge Function uses service role — no anon needed)
-- Service role bypasses RLS automatically

-- ── Indexes for performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_push_sub_member ON push_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_member ON notification_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_sent_at ON notification_logs(sent_at);
