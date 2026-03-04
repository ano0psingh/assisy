-- RSS subscriptions
create table feed_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feed_url text not null,
  title text,
  site_url text,
  last_fetched_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, feed_url)
);

-- Articles (from RSS or saved URLs)
create table feed_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subscription_id uuid references feed_subscriptions(id) on delete set null,
  source_url text not null,
  source_type text default 'rss',
  title text,
  author text,
  published_at timestamptz,
  summary text,
  key_takeaways text[],
  tags text[],
  reading_time_minutes int,
  relevance_score int,
  content_type text,
  read boolean default false,
  bookmarked boolean default false,
  created_at timestamptz default now(),
  unique(user_id, source_url)
);

alter table feed_subscriptions enable row level security;
alter table feed_articles enable row level security;

create policy "Users own subscriptions" on feed_subscriptions
  for all using (auth.uid() = user_id);
create policy "Users own articles" on feed_articles
  for all using (auth.uid() = user_id);
