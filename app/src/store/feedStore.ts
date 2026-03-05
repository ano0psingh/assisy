import { supabase } from '../lib/supabase';

export interface FeedSubscription {
  id: string;
  user_id: string;
  feed_url: string;
  title: string | null;
  site_url: string | null;
  last_fetched_at: string | null;
  created_at: string;
}

export interface FeedArticle {
  id: string;
  user_id: string;
  subscription_id: string | null;
  source_url: string;
  source_type: 'rss' | 'url';
  title: string | null;
  author: string | null;
  published_at: string | null;
  summary: string | null;
  key_takeaways: string[] | null;
  tags: string[] | null;
  reading_time_minutes: number | null;
  relevance_score: number | null;
  content_type: string | null;
  read: boolean;
  bookmarked: boolean;
  created_at: string;
}

const SUB_KEY = 'assisy_feed_subscriptions';
const ART_KEY = 'assisy_feed_articles';

function localGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

// ---------- Subscriptions ----------

export async function getSubscriptions(userId: string | null): Promise<FeedSubscription[]> {
  if (userId && supabase) {
    const { data } = await supabase
      .from('feed_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data ?? []) as FeedSubscription[];
  }
  return localGet<FeedSubscription[]>(SUB_KEY, []);
}

export async function addSubscription(
  userId: string | null,
  feedUrl: string,
  title: string,
  siteUrl: string,
): Promise<FeedSubscription> {
  const now = new Date().toISOString();
  if (userId && supabase) {
    const { data, error } = await supabase
      .from('feed_subscriptions')
      .upsert({ user_id: userId, feed_url: feedUrl, title, site_url: siteUrl }, { onConflict: 'user_id,feed_url' })
      .select()
      .single();
    if (error) throw error;
    return data as FeedSubscription;
  }
  const sub: FeedSubscription = {
    id: crypto.randomUUID(),
    user_id: 'local',
    feed_url: feedUrl,
    title, site_url: siteUrl,
    last_fetched_at: null,
    created_at: now,
  };
  const subs = localGet<FeedSubscription[]>(SUB_KEY, []);
  if (subs.some(s => s.feed_url === feedUrl)) throw new Error('Feed already added');
  subs.unshift(sub);
  localStorage.setItem(SUB_KEY, JSON.stringify(subs));
  return sub;
}

export async function removeSubscription(userId: string | null, id: string): Promise<void> {
  if (userId && supabase) {
    await supabase.from('feed_subscriptions').delete().eq('id', id);
    await supabase.from('feed_articles').delete().eq('subscription_id', id);
    return;
  }
  const subs = localGet<FeedSubscription[]>(SUB_KEY, []).filter(s => s.id !== id);
  localStorage.setItem(SUB_KEY, JSON.stringify(subs));
  const arts = localGet<FeedArticle[]>(ART_KEY, []).filter(a => a.subscription_id !== id);
  localStorage.setItem(ART_KEY, JSON.stringify(arts));
}

export async function updateSubFetchedAt(userId: string | null, id: string): Promise<void> {
  const now = new Date().toISOString();
  if (userId && supabase) {
    await supabase.from('feed_subscriptions').update({ last_fetched_at: now }).eq('id', id);
    return;
  }
  const subs = localGet<FeedSubscription[]>(SUB_KEY, []);
  const sub = subs.find(s => s.id === id);
  if (sub) sub.last_fetched_at = now;
  localStorage.setItem(SUB_KEY, JSON.stringify(subs));
}

// ---------- Articles ----------

export async function getArticles(userId: string | null): Promise<FeedArticle[]> {
  if (userId && supabase) {
    const { data } = await supabase
      .from('feed_articles')
      .select('*')
      .eq('user_id', userId)
      .order('published_at', { ascending: false });
    return (data ?? []) as FeedArticle[];
  }
  return localGet<FeedArticle[]>(ART_KEY, []);
}

export async function upsertArticle(userId: string | null, article: Partial<FeedArticle> & { source_url: string }): Promise<FeedArticle> {
  const now = new Date().toISOString();
  if (userId && supabase) {
    const row = { ...article, user_id: userId };
    const { data, error } = await supabase
      .from('feed_articles')
      .upsert(row, { onConflict: 'user_id,source_url' })
      .select()
      .single();
    if (error) throw error;
    return data as FeedArticle;
  }
  const arts = localGet<FeedArticle[]>(ART_KEY, []);
  const existing = arts.findIndex(a => a.source_url === article.source_url);
  const defaults: FeedArticle = {
    id: existing >= 0 ? arts[existing].id : crypto.randomUUID(),
    user_id: 'local',
    subscription_id: null,
    source_url: article.source_url,
    source_type: 'rss',
    title: null, author: null, published_at: null,
    summary: null, key_takeaways: null, tags: null,
    reading_time_minutes: null, relevance_score: null, content_type: null,
    read: false, bookmarked: false,
    created_at: now,
  };
  const entry: FeedArticle = {
    ...defaults,
    ...(existing >= 0 ? arts[existing] : {}),
    ...article,
  };
  if (existing >= 0) arts[existing] = entry;
  else arts.unshift(entry);
  localStorage.setItem(ART_KEY, JSON.stringify(arts));
  return entry;
}

export async function toggleArticleField(
  userId: string | null,
  id: string,
  field: 'read' | 'bookmarked',
  value: boolean,
): Promise<void> {
  if (userId && supabase) {
    await supabase.from('feed_articles').update({ [field]: value }).eq('id', id);
    return;
  }
  const arts = localGet<FeedArticle[]>(ART_KEY, []);
  const art = arts.find(a => a.id === id);
  if (art) art[field] = value;
  localStorage.setItem(ART_KEY, JSON.stringify(arts));
}

export async function deleteArticle(userId: string | null, id: string): Promise<void> {
  if (userId && supabase) {
    await supabase.from('feed_articles').delete().eq('id', id);
    return;
  }
  const arts = localGet<FeedArticle[]>(ART_KEY, []).filter(a => a.id !== id);
  localStorage.setItem(ART_KEY, JSON.stringify(arts));
}

export async function bulkUpdateField(
  userId: string | null,
  ids: string[],
  field: 'read' | 'bookmarked',
  value: boolean,
): Promise<void> {
  if (userId && supabase) {
    await supabase.from('feed_articles').update({ [field]: value }).in('id', ids);
    return;
  }
  const arts = localGet<FeedArticle[]>(ART_KEY, []);
  const idSet = new Set(ids);
  arts.forEach(a => { if (idSet.has(a.id)) a[field] = value; });
  localStorage.setItem(ART_KEY, JSON.stringify(arts));
}

export async function bulkDelete(userId: string | null, ids: string[]): Promise<void> {
  if (userId && supabase) {
    await supabase.from('feed_articles').delete().in('id', ids);
    return;
  }
  const idSet = new Set(ids);
  const arts = localGet<FeedArticle[]>(ART_KEY, []).filter(a => !idSet.has(a.id));
  localStorage.setItem(ART_KEY, JSON.stringify(arts));
}

export async function deleteOldRead(userId: string | null, olderThanDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  if (userId && supabase) {
    const { data } = await supabase
      .from('feed_articles')
      .delete()
      .eq('user_id', userId)
      .eq('read', true)
      .lt('created_at', cutoff)
      .select('id');
    return data?.length ?? 0;
  }
  const arts = localGet<FeedArticle[]>(ART_KEY, []);
  const kept = arts.filter(a => !(a.read && a.created_at < cutoff));
  const removed = arts.length - kept.length;
  localStorage.setItem(ART_KEY, JSON.stringify(kept));
  return removed;
}
