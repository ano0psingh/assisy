import { useState, useMemo } from 'react';
import { useFeed, type FeedFilter, type FeedSort } from '../context/FeedContext';
import { useTheme } from '../context/ThemeContext';
import {
  Newspaper, Plus, Link, RefreshCw, Bookmark, BookmarkCheck,
  Eye, EyeOff, Trash2, ChevronDown, ChevronUp, ExternalLink,
  Rss, Clock, Star, Sparkles, X, Settings2, Loader2,
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

const SUGGESTED_FEEDS = [
  { label: 'Substack', hint: 'https://yourname.substack.com/feed' },
  { label: 'Medium', hint: 'https://medium.com/feed/@username' },
  { label: 'WordPress', hint: 'Append /feed to any WordPress URL' },
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
    subscriptions, filteredArticles, filter, sort, tagFilter,
    loading, refreshing, syncProgress, geminiReady,
    addFeed, removeFeed, refreshFeeds, saveURL,
    toggleRead, toggleBookmark, removeArticle,
    setFilter, setSort, setTagFilter, articles,
  } = useFeed();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showSaveURL, setShowSaveURL] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);
  const [savingUrl, setSavingUrl] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedTakeaways, setExpandedTakeaways] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    articles.forEach(a => a.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [articles]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-violet-500/20' : 'bg-violet-100'
              }`}>
                <Newspaper className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
              </div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>My Feed</h1>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={refreshFeeds}
                disabled={refreshing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-white/70 text-slate-600 hover:bg-white'
                } disabled:opacity-50`}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
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
                {opt.label}
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

          {/* Tag filter pills */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
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
              {allTags.map(tag => (
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
      <div className={`flex gap-5 ${showSidebar ? '' : ''}`}>
        {/* Article list */}
        <div className={`flex-1 min-w-0 space-y-3 ${showSidebar ? 'max-w-[calc(100%-320px)]' : ''}`}>
          {filteredArticles.length === 0 ? (
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
          ) : (
            filteredArticles.map(article => {
              const sub = subscriptions.find(s => s.id === article.subscription_id);
              const takeawaysExpanded = expandedTakeaways.has(article.id);

              return (
                <div
                  key={article.id}
                  className={`group rounded-2xl transition-all ${
                    article.read
                      ? isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50/50 border border-slate-100'
                      : isDark ? 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.06]' : 'bg-white border border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="px-5 py-4">
                    {/* Title row */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-base font-semibold leading-snug hover:underline decoration-violet-500/40 underline-offset-2 inline-flex items-center gap-1.5 ${
                            article.read
                              ? isDark ? 'text-gray-400' : 'text-slate-500'
                              : isDark ? 'text-white' : 'text-slate-800'
                          }`}
                        >
                          {article.title || article.source_url}
                          <ExternalLink size={13} className="flex-shrink-0 opacity-40" />
                        </a>

                        {/* Meta row */}
                        <div className={`flex items-center gap-2 mt-1.5 flex-wrap text-xs ${
                          isDark ? 'text-gray-500' : 'text-slate-400'
                        }`}>
                          {article.author && <span>{article.author}</span>}
                          {article.author && sub?.title && <span>·</span>}
                          {sub?.title && <span>{sub.title}</span>}
                          {article.published_at && (
                            <>
                              <span>·</span>
                              <span>{relativeTime(article.published_at)}</span>
                            </>
                          )}
                          {article.reading_time_minutes != null && (
                            <>
                              <span>·</span>
                              <span className={`inline-flex items-center gap-0.5 ${
                                isDark ? 'text-blue-400/70' : 'text-blue-500/80'
                              }`}>
                                <Clock size={10} /> {article.reading_time_minutes} min
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

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleRead(article.id, !article.read)}
                          title={article.read ? 'Mark unread' : 'Mark read'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {article.read ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          onClick={() => toggleBookmark(article.id, !article.bookmarked)}
                          title={article.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            article.bookmarked
                              ? isDark ? 'text-amber-400 hover:bg-amber-500/15' : 'text-amber-500 hover:bg-amber-50'
                              : isDark ? 'hover:bg-white/10 text-gray-500 hover:text-gray-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {article.bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        </button>
                        <button
                          onClick={() => removeArticle(article.id)}
                          title="Delete"
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-red-500/15 text-gray-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                          }`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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

        {/* Subscriptions sidebar */}
        {showSidebar && (
          <div className={`w-[300px] flex-shrink-0 rounded-2xl h-fit sticky top-4 ${
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
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                            {sub.title || 'Untitled Feed'}
                          </p>
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

              {/* Suggested feeds */}
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  isDark ? 'text-gray-500' : 'text-slate-400'
                }`}>
                  Suggested Feeds
                </h3>
                <div className="space-y-2">
                  {SUGGESTED_FEEDS.map(sf => (
                    <div
                      key={sf.label}
                      className={`rounded-lg px-3 py-2 ${
                        isDark ? 'bg-white/[0.03]' : 'bg-slate-50'
                      }`}
                    >
                      <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{sf.label}</p>
                      <p className={`text-[11px] mt-0.5 font-mono ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{sf.hint}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
