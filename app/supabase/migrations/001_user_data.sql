-- Assisy: user_data table for cloud storage
-- Run this in Supabase SQL Editor after creating your project

create table if not exists user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb default '[]',
  goals jsonb default '[]',
  habits jsonb default '[]',
  habit_logs jsonb default '{}',
  daily_logs jsonb default '[]',
  projects jsonb default '[]',
  sub_projects jsonb default '[]',
  project_tasks jsonb default '[]',
  gamification jsonb default '{}',
  settings jsonb default '{}',
  updated_at timestamptz default now()
);

alter table user_data enable row level security;

create policy "Users can only access own data"
  on user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
