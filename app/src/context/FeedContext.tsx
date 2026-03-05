import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getSubscriptions, addSubscription as addSub, removeSubscription as removeSub,
  updateSubFetchedAt, getArticles, upsertArticle, toggleArticleField, deleteArticle,
  type FeedSubscription, type FeedArticle,
} from '../store/feedStore';
import { fetchRSSFeed, extractTextFromHTML, fetchArticleContent, estimateReadingTime } from '../lib/rssParser';

async function getArticleText(rssContent: string, sourceUrl: string): Promise<string> {
  let text = extractTextFromHTML(rssContent);
  if (text.length < 200 && sourceUrl) {
    try {
      text = await fetchArticleContent(sourceUrl);
    } catch { /* fall back to RSS content */ }
  }
  return text;
}
import { summarizeArticle, isGeminiConfigured, delay } from '../lib/gemini';

export type FeedFilter = 'all' | 'unread' | 'bookmarked' | 'high_value';
export type FeedSort = 'newest' | 'relevance' | 'reading_time';

interface SyncProgress {
  current: number;
  total: number;
  currentTitle?: string;
}

interface FeedContextType {
  subscriptions: FeedSubscription[];
  articles: FeedArticle[];
  filter: FeedFilter;
  sort: FeedSort;
  tagFilter: string | null;
  loading: boolean;
  refreshing: boolean;
  syncProgress: SyncProgress | null;
  geminiReady: boolean;
  addFeed: (feedUrl: string) => Promise<void>;
  removeFeed: (id: string) => Promise<void>;
  refreshFeeds: () => Promise<void>;
  saveURL: (url: string) => Promise<void>;
  toggleRead: (id: string, value: boolean) => Promise<void>;
  toggleBookmark: (id: string, value: boolean) => Promise<void>;
  removeArticle: (id: string) => Promise<void>;
  setFilter: (f: FeedFilter) => void;
  setSort: (s: FeedSort) => void;
  setTagFilter: (tag: string | null) => void;
  filteredArticles: FeedArticle[];
}

const FeedContext = createContext<FeedContextType | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [subscriptions, setSubscriptions] = useState<FeedSubscription[]>([]);
  const [articles, setArticles] = useState<FeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [sort, setSort] = useState<FeedSort>('newest');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [subs, arts] = await Promise.all([
      getSubscriptions(userId),
      getArticles(userId),
    ]);
    setSubscriptions(subs);
    setArticles(arts);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const addFeed = useCallback(async (feedUrl: string) => {
    const meta = await fetchRSSFeed(feedUrl);
    const sub = await addSub(userId, feedUrl, meta.title, meta.siteUrl);
    setSubscriptions(prev => [sub, ...prev]);

    const newArticles: FeedArticle[] = [];
    for (const item of meta.items.slice(0, 10)) {
      if (articles.some(a => a.source_url === item.link)) continue;
      const text = extractTextFromHTML(item.content);
      const art = await upsertArticle(userId, {
        source_url: item.link,
        source_type: 'rss',
        subscription_id: sub.id,
        title: item.title,
        author: item.author || null,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        reading_time_minutes: estimateReadingTime(text),
      });
      newArticles.push(art);
    }

    if (isGeminiConfigured() && newArticles.length > 0) {
      setSyncProgress({ current: 0, total: newArticles.length });
      for (let i = 0; i < newArticles.length; i++) {
        const art = newArticles[i];
        setSyncProgress({ current: i + 1, total: newArticles.length, currentTitle: art.title ?? undefined });
        try {
          const item = meta.items.find(it => it.link === art.source_url);
          const text = await getArticleText(item?.content ?? '', art.source_url);
          if (text.length < 50) continue;
          const result = await summarizeArticle(text, art.title ?? '', meta.title);
          await upsertArticle(userId, {
            source_url: art.source_url,
            summary: JSON.stringify(result),
            key_takeaways: result.key_takeaways,
            tags: result.tags,
            reading_time_minutes: result.reading_time_minutes,
            relevance_score: result.relevance_score,
            content_type: result.content_type,
          });
          if (i < newArticles.length - 1) await delay(3000);
        } catch (e) { console.error('Summary failed for', art.title, e); }
      }
      setSyncProgress(null);
    }

    await updateSubFetchedAt(userId, sub.id);
    await reload();
  }, [userId, articles, reload]);

  const removeFeed = useCallback(async (id: string) => {
    await removeSub(userId, id);
    setSubscriptions(prev => prev.filter(s => s.id !== id));
    setArticles(prev => prev.filter(a => a.subscription_id !== id));
  }, [userId]);

  const refreshFeeds = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);

    const unsummarized: FeedArticle[] = [];
    for (const sub of subscriptions) {
      try {
        const meta = await fetchRSSFeed(sub.feed_url);
        for (const item of meta.items.slice(0, 10)) {
          if (articles.some(a => a.source_url === item.link)) continue;
          const text = extractTextFromHTML(item.content);
          const art = await upsertArticle(userId, {
            source_url: item.link,
            source_type: 'rss',
            subscription_id: sub.id,
            title: item.title,
            author: item.author || null,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            reading_time_minutes: estimateReadingTime(text),
          });
          unsummarized.push({ ...art, _text: text } as FeedArticle & { _text: string });
        }
        await updateSubFetchedAt(userId, sub.id);
      } catch { /* skip failed feeds */ }
    }

    if (isGeminiConfigured() && unsummarized.length > 0) {
      setSyncProgress({ current: 0, total: unsummarized.length });
      for (let i = 0; i < unsummarized.length; i++) {
        const art = unsummarized[i] as FeedArticle & { _text?: string };
        setSyncProgress({ current: i + 1, total: unsummarized.length, currentTitle: art.title ?? undefined });
        try {
          const text = await getArticleText(art._text ?? '', art.source_url);
          if (text.length < 50) continue;
          const sub = subscriptions.find(s => s.id === art.subscription_id);
          const result = await summarizeArticle(text, art.title ?? '', sub?.title ?? '');
          await upsertArticle(userId, {
            source_url: art.source_url,
            summary: JSON.stringify(result),
            key_takeaways: result.key_takeaways,
            tags: result.tags,
            reading_time_minutes: result.reading_time_minutes,
            relevance_score: result.relevance_score,
            content_type: result.content_type,
          });
          if (i < unsummarized.length - 1) await delay(3000);
        } catch (e) { console.error('Summary failed for', art.title, e); }
      }
      setSyncProgress(null);
    }

    await reload();
    setRefreshing(false);
  }, [refreshing, subscriptions, articles, userId, reload]);

  const saveURL = useCallback(async (url: string) => {
    setRefreshing(true);
    setSyncProgress({ current: 0, total: 1, currentTitle: url });
    try {
      const text = await fetchArticleContent(url);
      const titleMatch = text.slice(0, 200);
      const art = await upsertArticle(userId, {
        source_url: url,
        source_type: 'url',
        title: titleMatch.slice(0, 100) || url,
        reading_time_minutes: estimateReadingTime(text),
      });

      if (isGeminiConfigured() && text.length >= 50) {
        setSyncProgress({ current: 1, total: 1, currentTitle: art.title ?? url });
        const result = await summarizeArticle(text, art.title ?? '', url);
        await upsertArticle(userId, {
          source_url: url,
          title: art.title,
          summary: JSON.stringify(result),
          key_takeaways: result.key_takeaways,
          tags: result.tags,
          reading_time_minutes: result.reading_time_minutes,
          relevance_score: result.relevance_score,
          content_type: result.content_type,
        });
      }
    } finally {
      setSyncProgress(null);
      setRefreshing(false);
      await reload();
    }
  }, [userId, reload]);

  const toggleRead = useCallback(async (id: string, value: boolean) => {
    await toggleArticleField(userId, id, 'read', value);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, read: value } : a));
  }, [userId]);

  const toggleBookmark = useCallback(async (id: string, value: boolean) => {
    await toggleArticleField(userId, id, 'bookmarked', value);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, bookmarked: value } : a));
  }, [userId]);

  const removeArticle = useCallback(async (id: string) => {
    await deleteArticle(userId, id);
    setArticles(prev => prev.filter(a => a.id !== id));
  }, [userId]);

  const filteredArticles = articles
    .filter(a => {
      if (filter === 'unread') return !a.read;
      if (filter === 'bookmarked') return a.bookmarked;
      if (filter === 'high_value') return (a.relevance_score ?? 0) >= 7;
      return true;
    })
    .filter(a => !tagFilter || (a.tags ?? []).includes(tagFilter))
    .sort((a, b) => {
      if (sort === 'relevance') return (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
      if (sort === 'reading_time') return (a.reading_time_minutes ?? 99) - (b.reading_time_minutes ?? 99);
      return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
    });

  return (
    <FeedContext.Provider value={{
      subscriptions, articles, filter, sort, tagFilter,
      loading, refreshing, syncProgress,
      geminiReady: isGeminiConfigured(),
      addFeed, removeFeed, refreshFeeds, saveURL,
      toggleRead, toggleBookmark, removeArticle,
      setFilter, setSort, setTagFilter,
      filteredArticles,
    }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeed must be used within FeedProvider');
  return ctx;
}
