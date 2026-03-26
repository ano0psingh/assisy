-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  habit_reminders jsonb DEFAULT '[]'::jsonb,
  daily_planning_hour int DEFAULT 9,
  timezone text DEFAULT 'Asia/Kolkata',
  last_sent jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subs_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow inserts/updates/deletes for authenticated and anon users (the API handles auth)
CREATE POLICY "Allow all operations" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);
