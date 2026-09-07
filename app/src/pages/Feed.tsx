import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFeed, type FeedFilter, type FeedSort } from '../context/FeedContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../components/common/PullToRefreshIndicator';
import { FeedPageSkeleton } from '../components/common/Skeleton';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { SelectButton, SelectionCheckbox } from '../components/common/SelectionControls';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useFocusHighlight } from '../hooks/useFocusHighlight';
import {
  Newspaper, Plus, Link, RefreshCw, Bookmark, BookmarkCheck,
  Eye, EyeOff, Trash2, ChevronDown, ChevronUp, ExternalLink,
  Rss, Clock, Star, Sparkles, X, Settings2, Loader2,
  CheckCircle2, MoreHorizontal, Filter,
} from 'lucide-react';
import { Button, IconButton } from '../components/ui';

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

function RelevanceBadge({ score }: { score: number; }) {
  const color =
    score >= 7
      ? 'badge-green'
      : score >= 4
        ? 'badge-yellow'
        : 'badge-gray';

  return (
    <span className={`badge gap-1 ${color}`}>
      <Star size={10} /> {score}/10
    </span>
  );
}

function ContentTypePill({ type }: { type: string; }) {
  const label = type.startsWith('tier_')
    ? `Tier ${type.replace('tier_', '')}`
    : type.replace(/_/g, ' ');
  const tierColor = type === 'tier_3'
    ? 'badge-yellow'
    : type === 'tier_2'
      ? 'badge-blue'
      : type === 'tier_1'
        ? 'badge-gray'
        : 'badge-purple';
  return (
    <span className={`badge ${tierColor}`}>
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

  const bulkButtonClass = 'min-h-10 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]';

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
    <div ref={containerRef} className="space-y-6">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={pullRefreshing} />
      {/* Gemini banner */}
      {!geminiReady && (
        <div className="flex items-center gap-3 border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
          <p className="text-sm text-[var(--warning)]">
            AI summaries are not configured on the server.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="relative border-y border-[var(--rule-strong)] bg-[var(--surface)]">
        <div className="relative px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-[-0.025em] text-[var(--ink)]">Reading desk</h1>
                <p className="mt-1 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                  {articles.length} article{articles.length !== 1 ? 's' : ''} · {unreadCount} unread · {bookmarkedCount} bookmarked
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SelectButton
                active={selection.active}
                onClick={() => selection.active ? selection.clear() : selection.start()}
                disabled={filteredArticles.length === 0}
              />
              <button
                onClick={() => { setShowAddFeed(!showAddFeed); setShowSaveURL(false); }}
                className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${
                  showAddFeed
                    ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                    : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                }`}
              >
                <Rss size={16} />
                <span>Add Feed</span>
              </button>
              <button
                onClick={() => { setShowSaveURL(!showSaveURL); setShowAddFeed(false); }}
                className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${
                  showSaveURL
                    ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                    : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
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
                  className="flex min-h-11 flex-col items-center rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)] disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Check for new
                  </span>
                  {lastRefreshedAt && (
                    <span className="text-xs leading-tight text-[var(--ink-muted)]">
                      Last checked {relativeTime(lastRefreshedAt)}
                    </span>
                  )}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                  >
                    <Eye size={16} />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  aria-label="Subscriptions"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${
                    showSidebar
                      ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                      : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  <Settings2 size={16} />
                </button>
              </div>

              {/* Mobile-only: More dropdown */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors ${
                    moreMenuOpen
                      ? 'border-[var(--action)] bg-[var(--action-soft)] text-[var(--action)]'
                      : 'border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  <MoreHorizontal size={16} />
                  <span>More</span>
                </button>
                {moreMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMoreMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-elevated)]">
                      <button
                        onClick={() => { refreshFeeds(); setMoreMenuOpen(false); }}
                        disabled={refreshing}
                        className="flex min-h-11 w-full items-center gap-2 px-3 py-3 text-left text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)] disabled:opacity-50"
                      >
                        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                        Check for new
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => { markAllRead(); setMoreMenuOpen(false); }}
                          className="flex min-h-11 w-full items-center gap-2 px-3 py-3 text-left text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
                        >
                          <Eye size={15} />
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => { setMobileSidebarOpen(true); setMoreMenuOpen(false); }}
                        className="flex min-h-11 w-full items-center gap-2 px-3 py-3 text-left text-sm text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
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
            <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] p-3">
              <Rss size={16} className="text-[var(--action)]" />
              <input
                type="url"
                value={feedUrl}
                onChange={e => setFeedUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFeed()}
                placeholder="Paste RSS feed URL..."
                autoFocus
                className="min-h-11 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
              />
              <Button
                onClick={handleAddFeed}
                disabled={addingFeed || !feedUrl.trim()}
                variant="primary"
                size="sm"
              >
                {addingFeed ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </Button>
              <IconButton
                icon={X}
                label="Cancel adding a feed"
                size="sm"
                onClick={() => setShowAddFeed(false)}
              />
            </div>
          )}

          {/* Inline Save URL */}
          {showSaveURL && (
            <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] p-3">
              <Link size={16} className="text-[var(--action)]" />
              <input
                type="url"
                value={articleUrl}
                onChange={e => setArticleUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveURL()}
                placeholder="Paste any article URL..."
                autoFocus
                className="min-h-11 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
              />
              <Button
                onClick={handleSaveURL}
                disabled={savingUrl || !articleUrl.trim()}
                variant="primary"
                size="sm"
              >
                {savingUrl ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Save
              </Button>
              <IconButton
                icon={X}
                label="Cancel saving a URL"
                size="sm"
                onClick={() => setShowSaveURL(false)}
              />
            </div>
          )}

          {/* Filter pills */}
          <div className="ui-page-tabs flex flex-wrap items-center gap-1">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`ui-page-tab px-3 py-2 text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-[var(--surface-raised)] text-[var(--ink)]'
                    : 'text-[var(--ink-muted)]'
                }`}
              >
                {filterLabel(opt)}
              </button>
            ))}

            <div className="mx-1 h-5 w-px bg-[var(--rule)]" />

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)]"
              >
                {SORT_OPTIONS.find(o => o.value === sort)?.label}
                <ChevronDown size={12} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-elevated)]">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          sort === opt.value
                            ? 'bg-[var(--action-soft)] text-[var(--action)]'
                            : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
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
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                onClick={() => setSubFilter(null)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  !subFilter
                    ? 'bg-[var(--action)] text-[var(--action-ink)]'
                    : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                }`}
              >
                All sources
              </button>
              {subscriptions.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSubFilter(subFilter === sub.id ? null : sub.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    subFilter === sub.id
                      ? 'bg-[var(--action)] text-[var(--action-ink)]'
                      : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  {sub.title || 'Untitled'}
                </button>
              ))}
              <button
                onClick={() => setSubFilter('saved')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  subFilter === 'saved'
                    ? 'bg-[var(--action)] text-[var(--action-ink)]'
                    : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
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
              <div className="hidden md:flex items-center gap-2 flex-wrap">
                {tagFilter && (
                  <button
                    onClick={() => setTagFilter(null)}
                    className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--danger-soft)] px-2 py-1 text-xs font-medium text-[var(--danger)] transition-colors"
                  >
                    <X size={10} /> Clear
                  </button>
                )}
                {(showAllTags ? allTags : allTags.slice(0, 8)).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      tagFilter === tag
                        ? 'bg-[var(--action)] text-[var(--action-ink)]'
                        : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink-secondary)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {allTags.length > 8 && (
                  <button
                    onClick={() => setShowAllTags(p => !p)}
                    className="rounded-[var(--radius-sm)] bg-[var(--action-soft)] px-2 py-1 text-xs font-medium text-[var(--action)] transition-colors hover:bg-[var(--selected)]"
                  >
                    {showAllTags ? 'Show less' : `+${allTags.length - 8} more`}
                  </button>
                )}
              </div>

              {/* Mobile: horizontal scroll with top 5 + Filter dropdown */}
              <div className="md:hidden">
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap flex-nowrap pb-1 scrollbar-none">
                  {tagFilter && (
                    <button
                      onClick={() => setTagFilter(null)}
                      className="flex flex-shrink-0 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--danger-soft)] px-2 py-1 text-xs font-medium text-[var(--danger)] transition-colors"
                    >
                      <X size={10} /> Clear
                    </button>
                  )}
                  {allTags.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                      className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        tagFilter === tag
                          ? 'bg-[var(--action)] text-[var(--action-ink)]'
                          : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {allTags.length > 5 && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setMobileTagsOpen(!mobileTagsOpen)}
                        className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--action-soft)] px-2 py-1 text-xs font-medium text-[var(--action)] transition-colors hover:bg-[var(--selected)]"
                      >
                        <Filter size={10} />
                        +{allTags.length - 5}
                      </button>
                      {mobileTagsOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMobileTagsOpen(false)} />
                          <div className="absolute right-0 top-full z-20 mt-1 max-h-60 min-w-[160px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--rule-strong)] bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-elevated)]">
                            {allTags.slice(5).map(tag => (
                              <button
                                key={tag}
                                onClick={() => { setTagFilter(tagFilter === tag ? null : tag); setMobileTagsOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                  tagFilter === tag
                                    ? 'bg-[var(--action-soft)] text-[var(--action)]'
                                    : 'text-[var(--ink-secondary)] hover:bg-[var(--state-hover)]'
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
        <div className="border border-[var(--action)] bg-[var(--action-soft)] px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-[var(--action)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--action)]">
                Summarizing {syncProgress.current}/{syncProgress.total}...
              </p>
              {syncProgress.currentTitle && (
                <p className="mt-1 truncate text-xs text-[var(--ink-secondary)]">
                  {syncProgress.currentTitle}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)]">
            <div
              className="h-full rounded-full bg-[var(--action)] transition-[width] duration-500"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main layout: articles + optional sidebar */}
      <div className={`flex gap-6`}>
        {/* Article list */}
        <div className={`min-w-0 flex-1 ${showSidebar ? 'md:max-w-[calc(100%-320px)]' : ''}`}>
          {filteredArticles.length === 0 ? (
            filter === 'unread' ? (
              <div className="border-y-2 border-[var(--ink)] bg-[var(--surface-raised)] p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[var(--success)]" />
                <h3 className="mb-1 text-xl font-bold text-[var(--ink)]">All caught up!</h3>
                <p className="text-sm text-[var(--ink-secondary)]">
                  No unread articles. Take a break or check back later.
                </p>
              </div>
            ) : (
              <div className="border-y-2 border-[var(--ink)] bg-[var(--surface-raised)] p-8 text-center">
                <Newspaper className="mx-auto mb-3 h-10 w-10 text-[var(--action)]" />
                <h3 className="mb-1 text-xl font-bold text-[var(--ink)]">No articles yet</h3>
                <p className="mb-4 text-sm text-[var(--ink-secondary)]">
                  Add your first RSS feed or paste an article URL to get started
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    onClick={() => { setShowAddFeed(true); setShowSaveURL(false); }}
                    variant="primary"
                    icon={Rss}
                  >
                    Add Feed
                  </Button>
                  <Button
                    onClick={() => { setShowSaveURL(true); setShowAddFeed(false); }}
                    variant="secondary"
                    icon={Link}
                  >
                    Save URL
                  </Button>
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
                  className={`group border-x border-b border-[var(--rule)] transition-colors first:border-t ${
                    isSelected
                      ? 'bg-[var(--selected)]'
                      : article.read
                        ? 'bg-[var(--surface-subtle)]'
                        : 'bg-[var(--surface-raised)] hover:bg-[var(--state-hover)]'
                  }`}
                >
                  <div className="px-3 py-3 sm:px-6 sm:py-4">
                    {/* Title + checkbox row — full width on mobile */}
                    <div className="flex items-start gap-2">
                      {/* Only while selecting, matching the other pages. A
                          permanent checkbox on every row read as the primary
                          action here. */}
                      {selection.active && (
                        <SelectionCheckbox
                          selected={isSelected}
                          onToggle={() => selection.toggle(article.id)}
                          label={`Select "${article.title}"`}
                          className="mt-1"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { if (!article.read) toggleRead(article.id, true); }}
                          className={`text-sm font-semibold leading-snug decoration-[var(--action)] underline-offset-2 hover:underline sm:text-base ${
                            article.read
                              ? 'text-[var(--ink-muted)]'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          {article.title || article.source_url}
                          <ExternalLink size={11} className="inline ml-1 opacity-40" />
                        </a>

                        {/* Meta row */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--ink-muted)]">
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
                              <span className="inline-flex items-center gap-1 text-[var(--info)]">
                                <Clock size={9} /> {article.reading_time_minutes}m
                              </span>
                            </>
                          )}
                          {article.relevance_score != null && (
                            <RelevanceBadge score={article.relevance_score} />
                          )}
                          {article.content_type && (
                            <ContentTypePill type={article.content_type} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons — separate row below title on mobile, inline on desktop */}
                    <div className="flex items-center gap-1 mt-2 ml-6 sm:ml-0">
                      <button
                        onClick={() => toggleRead(article.id, !article.read)}
                        title={article.read ? 'Mark unread' : 'Mark read'}
                        className="flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--ink-muted)] transition-colors hover:bg-[var(--state-hover)] hover:text-[var(--ink)]"
                      >
                        {article.read ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => toggleBookmark(article.id, !article.bookmarked)}
                        title={article.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                        className={`p-2 rounded-lg transition-colors ${
                          article.bookmarked
                            ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                            : 'text-[var(--ink-muted)] hover:bg-[var(--state-hover)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {article.bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                      {availableGoals.length > 0 && (
                        <select
                          value={article.goalId ?? ''}
                          onChange={(e) => linkArticleToGoal(article.id, e.target.value || null)}
                          title="Link to Goal"
                          className={`w-20 sm:w-24 text-xs py-1 pl-2 pr-6 rounded-lg border-0 cursor-pointer transition-colors appearance-none bg-no-repeat bg-[right_2px_center] truncate ${
                            article.goalId
                              ? 'bg-[var(--action-soft)] text-[var(--action)]'
                              : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
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
                        aria-label="Delete"
                        className="flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
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
                              <span className={`flex-shrink-0 mt-1 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                analysis.tier === 3
                                  ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                                  : analysis.tier === 2
                                    ? 'bg-[var(--info-soft)] text-[var(--info)]'
                                    : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)]'
                              }`}>
                                T{analysis.tier}
                              </span>
                            )}
                            <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">
                              {analysis.surface_claim}
                            </p>
                          </div>

                          {/* Source credibility */}
                          {analysis.source_credibility && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
                              analysis.source_credibility === 'high'
                                ? 'text-[var(--success)]'
                                : analysis.source_credibility === 'medium'
                                  ? 'text-[var(--warning)]'
                                  : 'text-[var(--ink-muted)]'
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
                                className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                                  'text-[var(--action)] hover:text-[var(--action-hover)]'
                                }`}
                              >
                                {takeawaysExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                Key Points ({analysis.key_points.length})
                                {analysis.implications.length > 0 && ` + ${analysis.implications.length} Implications`}
                              </button>
                              {takeawaysExpanded && (
                                <div className="mt-2 space-y-3">
                                  <ul className="ml-1 space-y-2 text-[var(--ink-secondary)]">
                                    {analysis.key_points.map((t, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--action)]" />
                                        {t}
                                      </li>
                                    ))}
                                  </ul>

                                  {/* Implications */}
                                  {analysis.implications.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--warning)]">
                                        Implications
                                      </p>
                                      <ul className="ml-1 space-y-2 text-[var(--ink-secondary)]">
                                        {analysis.implications.map((t, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--warning)]" />
                                            {t}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Open Questions */}
                                  {analysis.open_questions.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--info)]">
                                        Worth Watching
                                      </p>
                                      <ul className="ml-1 space-y-2 text-[var(--ink-secondary)]">
                                        {analysis.open_questions.map((t, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--info)]" />
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
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {article.tags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                              tagFilter === tag
                                ? 'bg-[var(--action)] text-[var(--action-ink)]'
                                : 'bg-[var(--surface-subtle)] text-[var(--ink-muted)] hover:bg-[var(--state-hover)]'
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
          <div className="sticky top-4 hidden h-fit w-[300px] flex-shrink-0 border border-[var(--rule-strong)] bg-[var(--surface)] md:block">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--ink)]">Subscriptions</h2>
                <span className="font-mono text-xs text-[var(--ink-muted)]">{subscriptions.length}</span>
              </div>

              {subscriptions.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--ink-muted)]">
                  No feeds yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {subscriptions.map(sub => (
                    <div
                      key={sub.id}
                      className="group/sub border-b border-[var(--rule)] px-3 py-3 transition-colors last:border-0 hover:bg-[var(--state-hover)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-[var(--ink-secondary)]">
                              {sub.title || 'Untitled Feed'}
                            </p>
                            <span className="badge badge-gray flex-shrink-0">
                              {subArticleCounts[sub.id] || 0}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
                            {sub.feed_url}
                          </p>
                          {sub.last_fetched_at && (
                            <p className="mt-1 text-xs text-[var(--ink-muted)]">
                              Last fetched {relativeTime(sub.last_fetched_at)}
                            </p>
                          )}
                        </div>
                          <button
                          aria-label="Unsubscribe from feed"
                          onClick={() => removeFeed(sub.id)}
                            className="rounded-[var(--radius-sm)] p-1 text-[var(--danger)] opacity-0 transition-opacity hover:bg-[var(--danger-soft)] group-hover/sub:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Curated suggested feeds */}
              <div className="mt-4 border-t border-[var(--rule)] pt-4">
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  Suggested Feeds
                </h3>
                <div className="space-y-2">
                  {CURATED_FEEDS.map(sf => {
                    const alreadySubscribed = subscribedUrls.has(sf.url);
                    return (
                      <div
                        key={sf.url}
                        className="flex items-center gap-2 border-b border-[var(--rule)] px-3 py-2 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-medium text-[var(--ink-secondary)]">
                              {sf.label}
                            </p>
                            <span className="badge badge-gray flex-shrink-0">
                              {sf.category}
                            </span>
                          </div>
                        </div>
                        {alreadySubscribed ? (
                          <CheckCircle2 size={14} className="text-[var(--success)]" />
                        ) : (
                          <button
                            aria-label="Subscribe to feed"
                            onClick={() => addFeed(sf.url)}
                            className="rounded-[var(--radius-sm)] p-1 text-[var(--action)] transition-colors hover:bg-[var(--action-soft)]"
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
              <div className="mt-4 border-t border-[var(--rule)] pt-4">
                <button
                  onClick={handleClearOldRead}
                  disabled={clearingOld}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)] disabled:opacity-50"
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
          <div className="ui-overlay absolute inset-0" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute inset-0 overflow-y-auto bg-[var(--canvas)]">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--ink)]">Subscriptions</h2>
                <IconButton
                  icon={X}
                  label="Close"
                  size="lg"
                  onClick={() => setMobileSidebarOpen(false)}
                />
              </div>

              {subscriptions.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
                  No feeds yet
                </p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map(sub => (
                    <div
                      key={sub.id}
                      className="border-b border-[var(--rule)] px-3 py-3 transition-colors last:border-0 hover:bg-[var(--state-hover)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-[var(--ink-secondary)]">
                              {sub.title || 'Untitled Feed'}
                            </p>
                            <span className="badge badge-gray flex-shrink-0">
                              {subArticleCounts[sub.id] || 0}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-[var(--ink-muted)]">
                            {sub.feed_url}
                          </p>
                          {sub.last_fetched_at && (
                            <p className="mt-1 text-xs text-[var(--ink-muted)]">
                              Last fetched {relativeTime(sub.last_fetched_at)}
                            </p>
                          )}
                        </div>
                        <button
                          aria-label="Unsubscribe from feed"
                          onClick={() => removeFeed(sub.id)}
                          className="rounded-[var(--radius-md)] p-2 text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Curated suggested feeds */}
              <div className="mt-4 border-t border-[var(--rule)] pt-4">
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  Suggested Feeds
                </h3>
                <div className="space-y-2">
                  {CURATED_FEEDS.map(sf => {
                    const alreadySubscribed = subscribedUrls.has(sf.url);
                    return (
                      <div
                        key={sf.url}
                        className="flex items-center gap-2 border-b border-[var(--rule)] px-3 py-2 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-medium text-[var(--ink-secondary)]">
                              {sf.label}
                            </p>
                            <span className="badge badge-gray flex-shrink-0">
                              {sf.category}
                            </span>
                          </div>
                        </div>
                        {alreadySubscribed ? (
                          <CheckCircle2 size={14} className="text-[var(--success)]" />
                        ) : (
                          <button
                            aria-label="Subscribe to feed"
                            onClick={() => addFeed(sf.url)}
                            className="rounded-[var(--radius-sm)] p-1 text-[var(--action)] transition-colors hover:bg-[var(--action-soft)]"
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
              <div className="mt-4 border-t border-[var(--rule)] pt-4">
                <button
                  onClick={handleClearOldRead}
                  disabled={clearingOld}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:bg-[var(--state-hover)] disabled:opacity-50"
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
