import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFeed, type FeedFilter, type FeedSort } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { FeedPageSkeleton } from '../components/common/Skeleton';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { SelectionCheckbox } from '../components/common/SelectionControls';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useFocusHighlight } from '../hooks/useFocusHighlight';
import {
  Newspaper, Plus, Link, RefreshCw, Bookmark, BookmarkCheck,
  Eye, EyeOff, Trash2, ChevronDown, ChevronUp, ExternalLink,
  Rss, Clock, Star, Sparkles, X, Settings2, Loader2,
  CheckCircle2, ArrowLeft, MoreHorizontal, Filter,
} from 'lucide-react';

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'bookmarked', label: 'Bookmarked' },
  { value: 'high_value', label: 'High Value' },
];

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'reading_time', label: 'Reading Time' },
];

const CURATED_FEEDS = [
  { label: 'Hacker News Best', url: 'https://hnrss.org/best', category: 'Tech' },
  { label: 'Pragmatic Engineer', url: 'https://newsletter.pragmaticengineer.com/feed', category: 'Engineering' },
  { label: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', category: 'AI' },
  { label: 'ByteByteGo', url: 'https://blog.bytebytego.com/feed', category: 'System Design' },
  { label: 'Medium - Productivity', url: 'https://medium.com/feed/tag/productivity', category: 'Productivity' },
  { label: 'Medium - AI', url: 'https://medium.com/feed/tag/artificial-intelligence', category: 'AI' },
  { label: 'Medium - Programming', url: 'https://medium.com/feed/tag/programming', category: 'Tech' },
  { label: 'James Clear', url: 'https://jamesclear.com/feed', category: 'Productivity' },
  { label: 'Sahil Bloom', url: 'https://sahilbloom.substack.com/feed', category: 'Growth' },
  { label: 'Collaborative Fund', url: 'https://collabfund.com/blog/feed/', category: 'Finance' },
];

interface ParsedAnalysis {
  tier: number | null;
  surface_claim: string;
  key_points: string[];
  implications: string[];
  source_credibility: string | null;
  open_questions: string[];
}

function parseAnalysis(summaryField: string): ParsedAnalysis {
  try {
    const data = JSON.parse(summaryField);
    return {
      tier: data.tier ?? null,
      surface_claim: data.surface_claim ?? data.summary ?? summaryField,
      key_points: data.key_points ?? data.key_takeaways ?? [],
      implications: data.implications ?? [],
      source_credibility: data.source_credibility ?? null,
      open_questions: data.open_questions ?? [],
    };
  } catch {
    return {
      tier: null,
      surface_claim: summaryField,
      key_points: [],
      implications: [],
      source_credibility: null,
      open_questions: [],
    };
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RelevanceBadge({ score, isDark }: { score: number; isDark: boolean }) {
  const color =
    score >= 7
      ? isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : score >= 4
        ? isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
        : isDark ? 'bg-gray-500/15 text-gray-400 border-gray-500/20' : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md border ${color}`}>
      <Star size={10} /> {score}/10
    </span>
  );
}

function ContentTypePill({ type, isDark }: { type: string; isDark: boolean }) {
  const label = type.startsWith('tier_')
    ? `Tier ${type.replace('tier_', '')}`
    : type.replace(/_/g, ' ');
  const tierColor = type === 'tier_3'
    ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
    : type === 'tier_2'
      ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'
      : type === 'tier_1'
        ? isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-50 text-slate-500'
        : isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600';
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${tierColor}`}>
      {label}
    </span>
  );
}

export function Feed() {
  const {
    subscriptions, filteredArticles, filter, sort, tagFilter, subFilter,
    loading, refreshing, syncProgress, geminiReady,
    addFeed, removeFeed, refreshFeeds, saveURL,
    toggleRead, toggleBookmark, removeArticle,
    setFilter, setSort, setTagFilter, setSubFilter, articles,
    unreadCount, lastRefreshedAt, markAllRead,
    bulkMarkRead, bulkBookmark, bulkDelete, clearOldRead,
    linkArticleToGoal,
  } = useFeed();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { pullDistance, isRefreshing: pullRefreshing, containerRef } = usePullToRefresh({
    onRefresh: refreshFeeds,
  });

  const [availableGoals, setAvailableGoals] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    try {
      const data = localStorage.getItem('life-rpg-goals');
      if (data) {
        const goals = JSON.parse(data) as { id: string; title: string; status: string }[];
        setAvailableGoals(goals.filter(g => g.status === 'Active'));
      }
    } catch { /* ignore */ }
  }, []);

  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showSaveURL, setShowSaveURL] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileTagsOpen, setMobileTagsOpen] = useState(false);
  const [expandedTakeaways, setExpandedTakeaways] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [clearingOld, setClearingOld] = useState(false);

  // Shared hook so a selection never outlives the filter it was made under —
  // hidden articles must not be swept up by a bulk action.
  const visibleArticleIds = useMemo(() => filteredArticles.map(a => a.id), [filteredArticles]);
  const selection = useBulkSelection(visibleArticleIds);

  // Arriving from global search: an article is easily hidden behind the unread
  // or tag filters, so widen them before scrolling to it.
  const handleSearchFocus = useCallback(() => {
    setFilter('all');
    setTagFilter(null);
    setSubFilter(null);
  }, [setFilter, setTagFilter, setSubFilter]);
  useFocusHighlight(handleSearchFocus);

  const bulkButtonClass = `px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
    isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  const bookmarkedCount = useMemo(() => articles.filter(a => a.bookmarked).length, [articles]);

  const subArticleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => {
      if (a.subscription_id) {
        counts[a.subscription_id] = (counts[a.subscription_id] || 0) + 1;
      }
    });
    return counts;
  }, [articles]);

  const subscribedUrls = useMemo(
    () => new Set(subscriptions.map(s => s.feed_url)),
    [subscriptions],
  );

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => a.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }, [articles]);

  const allTags = useMemo(() => {
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  }, [tagCounts]);

  /** Runs a bulk action against the current selection, then exits select mode. */
  const runBulk = (action: (ids: string[]) => void) => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    action(ids);
    selection.clear();
  };

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) return;
    setAddingFeed(true);
    try {
      await addFeed(feedUrl.trim());
      setFeedUrl('');
      setShowAddFeed(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add feed');
    } finally {
      setAddingFeed(false);
    }
  };

  const handleSaveURL = async () => {
    if (!articleUrl.trim()) return;
    setSavingUrl(true);
    try {
      await saveURL(articleUrl.trim());
      setArticleUrl('');
      setShowSaveURL(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save URL');
    } finally {
      setSavingUrl(false);
    }
  };

  const toggleTakeaways = (id: string) => {
    setExpandedTakeaways(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearOldRead = async () => {
    setClearingOld(true);
    try {
      const removed = await clearOldRead(7);
      alert(`Cleared ${removed} old read article${removed === 1 ? '' : 's'}`);
    } catch {
      alert('Failed to clear old articles');
    } finally {
      setClearingOld(false);
    }
  };

  const filterLabel = (opt: { value: FeedFilter; label: string }) => {
    if (opt.value === 'unread' && unreadCount > 0) return `Unread (${unreadCount})`;
    if (opt.value === 'bookmarked' && bookmarkedCount > 0) return `Bookmarked (${bookmarkedCount})`;
    return opt.label;
  };

  if (loading) {
    return <FeedPageSkeleton />;
  }

  return (
    <div ref={containerRef} className="space-y-5">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={pullRefreshing} />
      {/* Gemini banner */}
      {!geminiReady && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
          isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
        }`}>
          <Sparkles className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
            Add <code className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>VITE_GEMINI_API_KEY</code> to .env.local for AI summaries
          </p>
        </div>
      )}

      {/* Header */}
      <div className={`relative overflow-hidden rounded-2xl ${
        isDark
          ? 'bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 border border-violet-500/15'
          : 'bg-gradient-to-br from-violet-50 via-purple-50/50 to-indigo-50 border border-violet-100'
      }`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-200/40'}`} />
          <div className={`absolute -bottom-12 -left-12 w-36 h-36 rounded-full blur-3xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-200/30'}`} />
        </div>

        <div className="relative px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                title="Back to Assisy"
              >
                <ArrowLeft size={18} />
              </a>
              <div className="min-w-0">
                <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>My Feed</h1>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                  {articles.length} article{articles.length !== 1 ? 's' : ''} · {unreadCount} unread · {bookmarkedCount} bookmarked
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setShowAddFeed(!showAddFeed); setShowSaveURL(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  showAddFeed
                    ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                }`}
              >
                <Rss size={16} />
                <span>Add Feed</span>
              </button>
              <button
                onClick={() => { setShowSaveURL(!showSaveURL); setShowAddFeed(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  showSaveURL
                    ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                }`}
              >
                <Link size={16} />
                <span>Save URL</span>
              </button>

              {/* Desktop-only: Check for new, Mark all read, Settings */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={refreshFeeds}
                  disabled={refreshing}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                  } disabled:opacity-50`}
                >
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Check for new
                  </span>
                  {lastRefreshedAt && (
                    <span className={`text-[10px] leading-tight ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                      Last checked {relativeTime(lastRefreshedAt)}
                    </span>
                  )}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Eye size={16} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    showSidebar
                      ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                      : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  <Settings2 size={16} />
                </button>
              </div>

              {/* Mobile-only: More dropdown */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    moreMenuOpen
                      ? isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                      : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  <MoreHorizontal size={16} />
                  <span>More</span>
                </button>
                {moreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                    <div className={`absolute top-full mt-1 right-0 z-20 rounded-xl shadow-lg py-1 min-w-[180px] ${
                      isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-slate-200'
                    }`}>
                      <button
                        onClick={() => { refreshFeeds(); setMoreMenuOpen(false); }}
                        disabled={refreshing}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                        } disabled:opacity-50`}
                      >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                        Check for new
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => { markAllRead(); setMoreMenuOpen(false); }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                            isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Eye size={15} />
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => { setMobileSidebarOpen(true); setMoreMenuOpen(false); }}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                          isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Settings2 size={15} />
                        Subscriptions
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Inline Add Feed */}
          {showAddFeed && (
            <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'
            }`}>
              <Rss size={16} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
              <input
                type="url"
                value={feedUrl}
                onChange={e => setFeedUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFeed()}
                placeholder="Paste RSS feed URL..."
                autoFocus
                className={`flex-1 bg-transparent outline-none text-sm ${
                  isDark ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
              <button
                onClick={handleAddFeed}
                disabled={addingFeed || !feedUrl.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {addingFeed ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
              <button onClick={() => setShowAddFeed(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Inline Save URL */}
          {showSaveURL && (
            <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200'
            }`}>
              <Link size={16} className={isDark ? 'text-gray-500' : 'text-slate-400'} />
              <input
                type="url"
                value={articleUrl}
                onChange={e => setArticleUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveURL()}
                placeholder="Paste any article URL..."
                autoFocus
                className={`flex-1 bg-transparent outline-none text-sm ${
                  isDark ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
              <button
                onClick={handleSaveURL}
                disabled={savingUrl || !articleUrl.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {savingUrl ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Save
              </button>
              <button onClick={() => setShowSaveURL(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-violet-600 text-white'
                    : isDark
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                      : 'bg-white/70 text-slate-500 hover:bg-white hover:text-slate-700'
                }`}
              >
                {filterLabel(opt)}
              </button>
            ))}

            <div className="w-px h-5 mx-1 bg-white/10" />

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-white/70 text-slate-500 hover:bg-white'
                }`}
              >
                {SORT_OPTIONS.find(o => o.value === sort)?.label}
                <ChevronDown size={12} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className={`absolute top-full mt-1 right-0 z-20 rounded-xl shadow-lg py-1 min-w-[140px] ${
                    isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-slate-200'
                  }`}>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          sort === opt.value
                            ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                            : isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Subscription filter pills */}
          {subscriptions.length > 1 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <button
                onClick={() => setSubFilter(null)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  !subFilter
                    ? 'bg-violet-600 text-white'
                    : isDark
                      ? 'bg-white/5 text-gray-500 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                All sources
              </button>
              {subscriptions.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSubFilter(subFilter === sub.id ? null : sub.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    subFilter === sub.id
                      ? 'bg-violet-600 text-white'
                      : isDark
                        ? 'bg-white/5 text-gray-500 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {sub.title || 'Untitled'}
                </button>
              ))}
              <button
                onClick={() => setSubFilter('saved')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  subFilter === 'saved'
                    ? 'bg-violet-600 text-white'
                    : isDark
                      ? 'bg-white/5 text-gray-500 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Saved URLs
              </button>
            </div>
          )}

          {/* Tag filter pills */}
          {allTags.length > 0 && (
            <div className="mt-3">
              {/* Desktop: wrapped layout */}
              <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                {tagFilter && (
                  <button
                    onClick={() => setTagFilter(null)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      isDark ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-red-50 text-red-500 hover:bg-red-100'
                    }`}
                  >
                    <X size={10} /> Clear
                  </button>
                )}
                {(showAllTags ? allTags : allTags.slice(0, 8)).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      tagFilter === tag
                        ? 'bg-violet-600 text-white'
                        : isDark
                          ? 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-400'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 8 && (
                  <button
                    onClick={() => setShowAllTags(p => !p)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      isDark ? 'bg-white/5 text-violet-400 hover:bg-white/10' : 'bg-violet-50 text-violet-500 hover:bg-violet-100'
                    }`}
                  >
                    {showAllTags ? 'Show less' : `+${allTags.length - 8} more`}
                  </button>
                )}
              </div>

              {/* Mobile: horizontal scroll with top 5 + Filter dropdown */}
              <div className="md:hidden">
                <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap flex-nowrap pb-1 scrollbar-none">
                  {tagFilter && (
                    <button
                      onClick={() => setTagFilter(null)}
                      className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        isDark ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25' : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                    >
                      <X size={10} /> Clear
                    </button>
                  )}
                  {allTags.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                      className={`flex-shrink-0 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        tagFilter === tag
                          ? 'bg-violet-600 text-white'
                          : isDark
                            ? 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-400'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {allTags.length > 5 && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setMobileTagsOpen(!mobileTagsOpen)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                          isDark ? 'bg-white/5 text-violet-400 hover:bg-white/10' : 'bg-violet-50 text-violet-500 hover:bg-violet-100'
                        }`}
                      >
                        <Filter size={10} />
                        +{allTags.length - 5}
                      </button>
                      {mobileTagsOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMobileTagsOpen(false)} />
                          <div className={`absolute top-full mt-1 right-0 z-20 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto min-w-[160px] ${
                            isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-slate-200'
                          }`}>
                            {allTags.slice(5).map(tag => (
                              <button
                                key={tag}
                                onClick={() => { setTagFilter(tagFilter === tag ? null : tag); setMobileTagsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                  tagFilter === tag
                                    ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                                    : isDark ? 'text-gray-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {tag} ({tagCounts[tag]})
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync progress bar */}
      {syncProgress && (
        <div className={`rounded-xl px-4 py-3 ${
          isDark ? 'bg-violet-500/10 border border-violet-500/15' : 'bg-violet-50 border border-violet-100'
        }`}>
          <div className="flex items-center gap-3">
            <Loader2 size={16} className={`animate-spin ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                Summarizing {syncProgress.current}/{syncProgress.total}...
              </p>
              {syncProgress.currentTitle && (
                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-violet-400/70' : 'text-violet-500/80'}`}>
                  {syncProgress.currentTitle}
                </p>
              )}
            </div>
          </div>
          <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-violet-100'}`}>
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main layout: articles + optional sidebar */}
      <div className={`flex gap-5`}>
        {/* Article list */}
        <div className={`flex-1 min-w-0 space-y-3 ${showSidebar ? 'md:max-w-[calc(100%-320px)]' : ''}`}>
          {filteredArticles.length === 0 ? (
            filter === 'unread' ? (
              <div className={`rounded-2xl p-10 text-center ${
                isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'
              }`}>
                <CheckCircle2 className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>All caught up!</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  No unread articles. Take a break or check back later.
                </p>
              </div>
            ) : (
              <div className={`rounded-2xl p-10 text-center ${
                isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'
              }`}>
                <Newspaper className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-slate-300'}`} />
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>No articles yet</h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  Add your first RSS feed or paste an article URL to get started
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setShowAddFeed(true); setShowSaveURL(false); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    <Rss size={16} /> Add Feed
                  </button>
                  <button
                    onClick={() => { setShowSaveURL(true); setShowAddFeed(false); }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Link size={16} /> Save URL
                  </button>
                </div>
              </div>
            )
          ) : (
            filteredArticles.map(article => {
              const sub = subscriptions.find(s => s.id === article.subscription_id);
              const takeawaysExpanded = expandedTakeaways.has(article.id);
              const isSelected = selection.isSelected(article.id);

              return (
                <div
                  key={article.id}
                  data-focus-id={article.id}
                  className={`group rounded-2xl transition-all ${
                    isSelected
                      ? isDark ? 'bg-violet-500/10 border border-violet-500/30' : 'bg-violet-50/60 border border-violet-200'
                      : article.read
                        ? isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50/50 border border-slate-100'
                        : isDark ? 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.06]' : 'bg-white border border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="px-3 py-3 sm:px-5 sm:py-4">
                    {/* Title + checkbox row — full width on mobile */}
                    <div className="flex items-start gap-2">
                      <SelectionCheckbox
                        selected={isSelected}
                        onToggle={() => selection.toggle(article.id)}
                        label={`Select "${article.title}"`}
                        className="mt-0.5"
                      />

                      <div className="flex-1 min-w-0">
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { if (!article.read) toggleRead(article.id, true); }}
                          className={`text-sm sm:text-base font-semibold leading-snug hover:underline decoration-violet-500/40 underline-offset-2 ${
                            article.read
                              ? isDark ? 'text-gray-400' : 'text-slate-500'
                              : isDark ? 'text-white' : 'text-slate-800'
                          }`}
                        >
                          {article.title || article.source_url}
                          <ExternalLink size={11} className="inline ml-1 opacity-40" />
                        </a>

                        {/* Meta row */}
                        <div className={`flex items-center gap-1.5 mt-1 flex-wrap text-[11px] ${
                          isDark ? 'text-gray-500' : 'text-slate-400'
                        }`}>
                          {sub?.title && <span>{sub.title}</span>}
                          {article.published_at && (
                            <>
                              {sub?.title && <span>·</span>}
                              <span>{relativeTime(article.published_at)}</span>
                            </>
                          )}
                          {article.reading_time_minutes != null && (
                            <>
                              <span>·</span>
                              <span className={`inline-flex items-center gap-0.5 ${
                                isDark ? 'text-blue-400/70' : 'text-blue-500/80'
                              }`}>
                                <Clock size={9} /> {article.reading_time_minutes}m
                              </span>
                            </>
                          )}
                          {article.relevance_score != null && (
                            <RelevanceBadge score={article.relevance_score} isDark={isDark} />
                          )}
                          {article.content_type && (
                            <ContentTypePill type={article.content_type} isDark={isDark} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons — separate row below title on mobile, inline on desktop */}
                    <div className="flex items-center gap-1 mt-2 ml-6 sm:ml-0">
                      <button
                        onClick={() => toggleRead(article.id, !article.read)}
                        title={article.read ? 'Mark unread' : 'Mark read'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-white/10 text-gray-600 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'
                        }`}
                      >
                        {article.read ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => toggleBookmark(article.id, !article.bookmarked)}
                        title={article.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          article.bookmarked
                            ? isDark ? 'text-amber-400 hover:bg-amber-500/15' : 'text-amber-500 hover:bg-amber-50'
                            : isDark ? 'hover:bg-white/10 text-gray-600 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'
                        }`}
                      >
                        {article.bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                      {availableGoals.length > 0 && (
                        <select
                          value={article.goalId ?? ''}
                          onChange={(e) => linkArticleToGoal(article.id, e.target.value || null)}
                          title="Link to Goal"
                          className={`w-20 sm:w-24 text-[11px] py-0.5 pl-1.5 pr-5 rounded-lg border-0 cursor-pointer transition-colors appearance-none bg-no-repeat bg-[right_2px_center] truncate ${
                            article.goalId
                              ? isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600'
                              : isDark ? 'bg-white/5 text-gray-600 hover:text-gray-300' : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                          }`}
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")" }}
                        >
                          <option value="">{article.goalId ? 'Unlink' : 'Goal'}</option>
                          {availableGoals.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => removeArticle(article.id)}
                        title="Delete"
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-red-500/15 text-gray-600 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Tiered Analysis */}
                    {article.summary && (() => {
                      const analysis = parseAnalysis(article.summary);
                      return (
                        <div className="mt-3 space-y-3">
                          {/* Tier badge + Surface claim */}
                          <div className="flex items-start gap-2">
                            {analysis.tier && (
                              <span className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                analysis.tier === 3
                                  ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                                  : analysis.tier === 2
                                    ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                                    : isDark ? 'bg-white/10 text-gray-500' : 'bg-slate-100 text-slate-500'
                              }`}>
                                T{analysis.tier}
                              </span>
                            )}
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                              {analysis.surface_claim}
                            </p>
                          </div>

                          {/* Source credibility */}
                          {analysis.source_credibility && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${
                              analysis.source_credibility === 'high'
                                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                : analysis.source_credibility === 'medium'
                                  ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                                  : isDark ? 'text-gray-500' : 'text-slate-400'
                            }`}>
                              {analysis.source_credibility === 'high' ? <Star size={10} /> : null}
                              {analysis.source_credibility} signal source
                            </span>
                          )}

                          {/* Key Points */}
                          {analysis.key_points.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleTakeaways(article.id)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                  isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-500 hover:text-violet-600'
                                }`}
                              >
                                {takeawaysExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                Key Points ({analysis.key_points.length})
                                {analysis.implications.length > 0 && ` + ${analysis.implications.length} Implications`}
                              </button>
                              {takeawaysExpanded && (
                                <div className="mt-2 space-y-3">
                                  <ul className={`space-y-1.5 ml-0.5 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                                    {analysis.key_points.map((t, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDark ? 'bg-violet-400' : 'bg-violet-500'}`} />
                                        {t}
                                      </li>
                                    ))}
                                  </ul>

                                  {/* Implications */}
                                  {analysis.implications.length > 0 && (
                                    <div>
                                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-orange-400/70' : 'text-orange-500/80'}`}>
                                        Implications
                                      </p>
                                      <ul className={`space-y-1.5 ml-0.5 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                                        {analysis.implications.map((t, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDark ? 'bg-orange-400' : 'bg-orange-500'}`} />
                                            {t}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Open Questions */}
                                  {analysis.open_questions.length > 0 && (
                                    <div>
                                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-cyan-400/70' : 'text-cyan-500/80'}`}>
                                        Worth Watching
                                      </p>
                                      <ul className={`space-y-1.5 ml-0.5 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                                        {analysis.open_questions.map((t, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isDark ? 'bg-cyan-400' : 'bg-cyan-500'}`} />
                                            {t}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                        {article.tags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                              tagFilter === tag
                                ? 'bg-violet-600 text-white'
                                : isDark
                                  ? 'bg-white/5 text-gray-500 hover:bg-white/10'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Subscriptions sidebar — desktop only */}
        {showSidebar && (
          <div className={`hidden md:block w-[300px] flex-shrink-0 rounded-2xl h-fit sticky top-4 ${
            isDark ? 'bg-white/[0.03] border border-white/10' : 'bg-white border border-slate-200'
          }`}>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Subscriptions</h2>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{subscriptions.length}</span>
              </div>

              {subscriptions.length === 0 ? (
                <p className={`text-xs text-center py-4 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                  No feeds yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {subscriptions.map(sub => (
                    <div
                      key={sub.id}
                      className={`group/sub rounded-xl px-3 py-2.5 transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                              {sub.title || 'Untitled Feed'}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {subArticleCounts[sub.id] || 0}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                            {sub.feed_url}
                          </p>
                          {sub.last_fetched_at && (
                            <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-700' : 'text-slate-300'}`}>
                              Last fetched {relativeTime(sub.last_fetched_at)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFeed(sub.id)}
                          className={`p-1 rounded-lg opacity-0 group-hover/sub:opacity-100 transition-all ${
                            isDark ? 'hover:bg-red-500/15 text-gray-600 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Curated suggested feeds */}
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  Suggested Feeds
                </h3>
                <div className="space-y-1.5">
                  {CURATED_FEEDS.map(sf => {
                    const alreadySubscribed = subscribedUrls.has(sf.url);
                    return (
                      <div
                        key={sf.url}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                          isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                              {sf.label}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              isDark ? 'bg-white/5 text-gray-600' : 'bg-slate-200/70 text-slate-400'
                            }`}>
                              {sf.category}
                            </span>
                          </div>
                        </div>
                        {alreadySubscribed ? (
                          <CheckCircle2 size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
                        ) : (
                          <button
                            onClick={() => addFeed(sf.url)}
                            className={`p-1 rounded-md transition-colors ${
                              isDark
                                ? 'hover:bg-violet-500/20 text-gray-500 hover:text-violet-400'
                                : 'hover:bg-violet-50 text-slate-400 hover:text-violet-600'
                            }`}
                            title={`Add ${sf.label}`}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clear old read articles */}
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <button
                  onClick={handleClearOldRead}
                  disabled={clearingOld}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600'
                  } disabled:opacity-50`}
                >
                  {clearingOld ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Clear read articles older than 7 days
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile sidebar modal overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className={`absolute inset-0 overflow-y-auto ${
            isDark ? 'bg-gray-950' : 'bg-white'
          }`}>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Subscriptions</h2>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <X size={20} />
                </button>
              </div>

              {subscriptions.length === 0 ? (
                <p className={`text-sm text-center py-8 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                  No feeds yet
                </p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map(sub => (
                    <div
                      key={sub.id}
                      className={`rounded-xl px-3 py-2.5 transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                              {sub.title || 'Untitled Feed'}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              isDark ? 'bg-white/5 text-gray-500' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {subArticleCounts[sub.id] || 0}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                            {sub.feed_url}
                          </p>
                          {sub.last_fetched_at && (
                            <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-700' : 'text-slate-300'}`}>
                              Last fetched {relativeTime(sub.last_fetched_at)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFeed(sub.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-red-500/15 text-gray-600 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Curated suggested feeds */}
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  Suggested Feeds
                </h3>
                <div className="space-y-1.5">
                  {CURATED_FEEDS.map(sf => {
                    const alreadySubscribed = subscribedUrls.has(sf.url);
                    return (
                      <div
                        key={sf.url}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                          isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                              {sf.label}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              isDark ? 'bg-white/5 text-gray-600' : 'bg-slate-200/70 text-slate-400'
                            }`}>
                              {sf.category}
                            </span>
                          </div>
                        </div>
                        {alreadySubscribed ? (
                          <CheckCircle2 size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-500'} />
                        ) : (
                          <button
                            onClick={() => addFeed(sf.url)}
                            className={`p-1 rounded-md transition-colors ${
                              isDark
                                ? 'hover:bg-violet-500/20 text-gray-500 hover:text-violet-400'
                                : 'hover:bg-violet-50 text-slate-400 hover:text-violet-600'
                            }`}
                            title={`Add ${sf.label}`}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clear old read articles */}
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <button
                  onClick={handleClearOldRead}
                  disabled={clearingOld}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isDark
                      ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600'
                  } disabled:opacity-50`}
                >
                  {clearingOld ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Clear read articles older than 7 days
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={selection.count}
        itemLabel="article"
        allSelected={selection.allSelected}
        onSelectAll={selection.selectAll}
        onDelete={() => runBulk(ids => { void bulkDelete(ids); })}
        onClear={selection.clear}
      >
        <button onClick={() => runBulk(ids => bulkMarkRead(ids, true))} className={bulkButtonClass}>
          Mark Read
        </button>
        <button onClick={() => runBulk(ids => bulkMarkRead(ids, false))} className={bulkButtonClass}>
          Mark Unread
        </button>
        <button onClick={() => runBulk(ids => bulkBookmark(ids, true))} className={bulkButtonClass}>
          Bookmark
        </button>
        <button onClick={() => runBulk(ids => bulkBookmark(ids, false))} className={bulkButtonClass}>
          Unbookmark
        </button>
      </BulkActionBar>
    </div>
  );
}
