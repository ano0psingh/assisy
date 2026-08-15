import { useState, useMemo } from 'react';
import type { Goal, Task, GoalTheme, Habit } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useGoalContext } from '../../context/GoalContext';
import { askAI, isAIConfigured } from '../../lib/ai';
import { GoalTree } from './GoalTree';
import {
  Target, Plus, Link2, Unlink, Check, BookOpen, ExternalLink,
  X, Sparkles, Loader2, Trophy, Flame,
} from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { TiptapEditor } from '../common/TiptapEditor';

const THEME_OPTIONS: { value: GoalTheme; color: string; label: string }[] = [
  { value: 'forest', color: '#22C55E', label: 'Forest' },
  { value: 'mountain', color: '#94A3B8', label: 'Mountain' },
  { value: 'ocean', color: '#22D3EE', label: 'Ocean' },
  { value: 'space', color: '#A78BFA', label: 'Space' },
  { value: 'garden', color: '#F472B6', label: 'Garden' },
];

interface HabitWithLogs extends Habit {
  logs: { date: string; value: number }[];
}

interface GoalDetailProps {
  goal: Goal;
  progress: number;
  allTasks: Task[];
  linkedTasks: Task[];
  linkedHabits?: HabitWithLogs[];
  onClose: () => void;
  onLinkTask: (goalId: string, taskId: string) => void;
  onUnlinkTask: (goalId: string, taskId: string) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  onToggleTaskComplete: (taskId: string) => void;
  isOpen: boolean;
}

export function GoalDetail({
  goal,
  progress,
  allTasks,
  linkedTasks,
  linkedHabits = [],
  onClose,
  onLinkTask,
  onUnlinkTask,
  onUpdateGoal,
  onToggleTaskComplete,
  isOpen
}: GoalDetailProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { addMilestone, completeMilestone, removeMilestone } = useGoalContext();

  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || '');

  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDescription, setMsDescription] = useState('');
  const [msXP, setMsXP] = useState('25');

  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const availableTasks = allTasks.filter(
    task => !task.goalId && task.status !== 'Completed'
  );

  const completedLinkedTasks = linkedTasks.filter(t => t.status === 'Completed');

  const linkedArticles = useMemo(() => {
    try {
      const data = localStorage.getItem('assisy_feed_articles');
      if (!data) return [];
      const articles = JSON.parse(data) as { id: string; title: string | null; source_url: string; goalId?: string; reading_time_minutes?: number | null; relevance_score?: number | null; tags?: string[] | null; matched_goals?: string[] }[];
      return articles.filter(a => a.goalId === goal.id);
    } catch { return []; }
  }, [goal.id]);

  const recommendedArticles = useMemo(() => {
    try {
      const data = localStorage.getItem('assisy_feed_articles');
      if (!data) return [];
      const articles = JSON.parse(data) as { id: string; title: string | null; source_url: string; source?: string; goalId?: string; reading_time_minutes?: number | null; relevance_score?: number | null; tags?: string[] | null; matched_goals?: string[] }[];

      const goalKeywords = [goal.title, goal.description || '']
        .join(' ')
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3);

      const linkedIds = new Set(linkedArticles.map(a => a.id));

      return articles
        .filter(a => {
          if (linkedIds.has(a.id)) return false;
          if (a.matched_goals?.some(g => g.toLowerCase() === goal.title.toLowerCase())) return true;
          const articleTags = (a.tags || []).map(t => t.toLowerCase());
          return goalKeywords.some(kw => articleTags.some(tag => tag.includes(kw)));
        })
        .slice(0, 5);
    } catch { return []; }
  }, [goal.id, goal.title, goal.description, linkedArticles]);

  const handleSaveEdit = () => {
    onUpdateGoal(goal.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  const handleAddMilestone = () => {
    if (!msTitle.trim()) return;
    addMilestone(goal.id, {
      title: msTitle.trim(),
      description: msDescription.trim() || undefined,
      xpReward: parseInt(msXP) || 25,
      order: (goal.milestones?.length ?? 0),
    });
    setMsTitle('');
    setMsDescription('');
    setMsXP('25');
    setShowMilestoneForm(false);
  };

  const handleAskAI = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResponse('');
    const completedMs = (goal.milestones || []).filter(m => m.isCompleted).length;
    const totalMs = (goal.milestones || []).length;
    const prompt = `You are a supportive goal coach. Analyze this goal and provide 3 specific, actionable suggestions for what to do next. Goal: ${goal.title}, Description: ${goal.description || 'None'}, Level: ${goal.level}, Milestones completed: ${completedMs}/${totalMs}, Tasks completed: ${completedLinkedTasks.length}/${linkedTasks.length}`;
    try {
      const response = await askAI(prompt, {
        systemPrompt: 'You are a supportive, encouraging goal coach. Be concise and practical. Format your response with numbered suggestions.',
        temperature: 0.7,
      });
      setAiResponse(response);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to get AI advice');
    } finally {
      setAiLoading(false);
    }
  };

  const xpPercent = goal.xpToNextLevel > 0
    ? Math.min(100, Math.round((goal.currentLevelXP / goal.xpToNextLevel) * 100))
    : 100;

  // ── Shared sections ──

  const treeSection = (
    <div className="flex flex-col items-center gap-3">
      <GoalTree level={goal.level} theme={goal.theme} size="lg" animate />
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
          isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
        }`}>
          <Trophy size={14} /> Level {goal.level}
        </span>
        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
          {goal.totalXP} XP total
        </span>
      </div>
      {/* XP progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP to next level</span>
          <span className={`text-xs font-semibold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
            {goal.currentLevelXP} / {goal.xpToNextLevel || '—'}
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>
    </div>
  );

  const themeSelector = (
    <div className="flex items-center justify-center gap-3">
      {THEME_OPTIONS.map(t => (
        <button
          key={t.value}
          onClick={() => onUpdateGoal(goal.id, { theme: t.value })}
          title={t.label}
          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
            goal.theme === t.value
              ? 'border-white shadow-lg scale-110'
              : isDark ? 'border-transparent opacity-60 hover:opacity-100' : 'border-transparent opacity-50 hover:opacity-100'
          }`}
          style={{ backgroundColor: t.color }}
        />
      ))}
    </div>
  );

  const milestonesSection = (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        Milestones ({(goal.milestones || []).filter(m => m.isCompleted).length}/{(goal.milestones || []).length})
      </label>
      {(goal.milestones || []).length === 0 && !showMilestoneForm && (
        <div className={`text-center py-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>No milestones yet. Add one to track progress!</p>
        </div>
      )}
      {(goal.milestones || []).length > 0 && (
        <div className="relative pl-6 space-y-0">
          {/* Vertical line */}
          <div className={`absolute left-[11px] top-2 bottom-2 w-0.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
          {(goal.milestones || []).map((ms) => (
            <div key={ms.id} className="relative flex items-start gap-3 py-2">
              {/* Circle / check */}
              <button
                onClick={() => !ms.isCompleted && completeMilestone(goal.id, ms.id)}
                className={`absolute -left-6 top-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all z-10 ${
                  ms.isCompleted
                    ? 'bg-emerald-500 border-emerald-500'
                    : isDark
                      ? 'border-gray-600 bg-gray-900 hover:border-emerald-500 hover:bg-emerald-500/20'
                      : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50'
                }`}
                disabled={ms.isCompleted}
                title={ms.isCompleted ? 'Completed' : 'Click to complete'}
              >
                {ms.isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
              </button>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    ms.isCompleted
                      ? isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through'
                      : isDark ? 'text-gray-200' : 'text-slate-700'
                  }`}>
                    {ms.title}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    +{ms.xpReward} XP
                  </span>
                </div>
                {ms.description && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{ms.description}</p>
                )}
              </div>
              {/* Delete */}
              <button
                onClick={() => removeMilestone(goal.id, ms.id)}
                className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
                  isDark
                    ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/20'
                    : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                }`}
                title="Remove milestone"
                aria-label="Remove milestone"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showMilestoneForm ? (
        <div className={`mt-3 p-3 rounded-xl space-y-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'}`}>
          <input
            type="text"
            placeholder="Milestone title"
            value={msTitle}
            onChange={e => setMsTitle(e.target.value)}
            className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${
              isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-violet-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500'
            }`}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={msDescription}
            onChange={e => setMsDescription(e.target.value)}
            className={`w-full px-3 py-2 text-sm rounded-lg border outline-none ${
              isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-violet-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500'
            }`}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="XP"
              value={msXP}
              onChange={e => setMsXP(e.target.value)}
              className={`w-20 px-3 py-2 text-sm rounded-lg border outline-none ${
                isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-violet-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-500'
              }`}
            />
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>XP reward</span>
            <div className="flex-1" />
            <button
              onClick={() => setShowMilestoneForm(false)}
              className={`px-3 py-2 text-xs rounded-lg ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            >Cancel</button>
            <button
              onClick={handleAddMilestone}
              disabled={!msTitle.trim()}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >Add</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowMilestoneForm(true)}
          className={`mt-3 flex items-center gap-2 text-sm font-medium transition-colors ${
            isDark ? 'text-gray-400 hover:text-violet-400' : 'text-slate-500 hover:text-violet-600'
          }`}
        >
          <Plus size={15} /> Add milestone
        </button>
      )}
    </div>
  );

  const aiCoachSection = isAIConfigured() ? (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        <Sparkles size={14} /> AI Coach
      </label>
      {!aiResponse && !aiLoading && (
        <button
          onClick={handleAskAI}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            isDark
              ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20'
              : 'bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100'
          }`}
        >
          <Sparkles size={16} /> Get AI Advice
        </button>
      )}
      {aiLoading && (
        <div className={`flex items-center justify-center gap-2 px-4 py-6 rounded-xl ${
          isDark ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-200'
        }`}>
          <Loader2 size={18} className="animate-spin text-violet-500" />
          <span className={`text-sm ${isDark ? 'text-violet-300' : 'text-violet-600'}`}>Thinking...</span>
        </div>
      )}
      {aiError && (
        <div className={`p-4 rounded-xl text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {aiError}
          <button onClick={handleAskAI} className="ml-2 underline">Retry</button>
        </div>
      )}
      {aiResponse && (
        <div className={`p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed ${
          isDark
            ? 'bg-violet-500/10 border border-violet-500/20 text-violet-200'
            : 'bg-violet-50 border border-violet-200 text-violet-900'
        }`}>
          {aiResponse}
          <button
            onClick={handleAskAI}
            className={`mt-3 flex items-center gap-1 text-xs font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'} hover:underline`}
          >
            <Sparkles size={12} /> Refresh advice
          </button>
        </div>
      )}
    </div>
  ) : null;

  const nonRecurringTasks = linkedTasks.filter(t => !t.isRecurring);
  const completedNonRecurring = nonRecurringTasks.filter(t => t.status === 'Completed').length;
  const completedMilestones = (goal.milestones || []).filter(m => m.isCompleted).length;
  const totalMilestones = (goal.milestones || []).length;
  const recurringCount = linkedTasks.length - nonRecurringTasks.length;

  const progressBar = (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Progress</label>
        <span className={`text-sm font-semibold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{progress}%</span>
      </div>
      <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress === 100
              ? 'bg-emerald-500'
              : 'bg-violet-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={`text-xs mt-2 space-y-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
        {nonRecurringTasks.length > 0 && (
          <p>{completedNonRecurring} of {nonRecurringTasks.length} tasks completed</p>
        )}
        {totalMilestones > 0 && (
          <p>{completedMilestones} of {totalMilestones} milestones completed</p>
        )}
        {recurringCount > 0 && (
          <p className={isDark ? 'text-gray-600' : 'text-slate-400'}>{recurringCount} recurring task{recurringCount > 1 ? 's' : ''} (ongoing, earn XP daily)</p>
        )}
        {linkedHabits.length > 0 && (
          <p className={isDark ? 'text-gray-600' : 'text-slate-400'}>{linkedHabits.length} habit{linkedHabits.length > 1 ? 's' : ''} linked (earn XP daily)</p>
        )}
      </div>
    </div>
  );

  const linkedTasksSection = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
          Linked Tasks ({linkedTasks.length})
        </label>
        <button
          onClick={() => setIsLinkingMode(!isLinkingMode)}
          className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
            isLinkingMode
              ? 'text-violet-500'
              : isDark ? 'text-gray-400 hover:text-violet-400' : 'text-slate-500 hover:text-violet-600'
          }`}
        >
          <Plus size={16} />
          <span>{isLinkingMode ? 'Done' : 'Link Tasks'}</span>
        </button>
      </div>

      {isLinkingMode && availableTasks.length > 0 && (
        <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Select tasks to link:</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onLinkTask(goal.id, task.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="text-sm truncate">{task.title}</span>
                <Link2 size={14} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
              </button>
            ))}
          </div>
        </div>
      )}

      {isLinkingMode && availableTasks.length === 0 && (
        <div className={`mb-4 p-4 rounded-xl text-center ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>No available tasks to link.</p>
        </div>
      )}

      {linkedTasks.length === 0 ? (
        <div className={`text-center py-8 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
          <Target className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-slate-400'}`} />
          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>No tasks linked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-xl ${
                isDark
                  ? 'bg-white/5 border border-white/10'
                  : 'bg-slate-50 border border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onToggleTaskComplete(task.id)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    task.status === 'Completed'
                      ? 'bg-emerald-500 border-emerald-500'
                      : isDark
                        ? 'border-gray-600 hover:border-violet-500 hover:bg-violet-500/20'
                        : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50'
                  }`}
                >
                  {task.status === 'Completed' && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
                <span className={`text-sm ${
                  task.status === 'Completed'
                    ? isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through'
                    : isDark ? 'text-gray-300' : 'text-slate-700'
                }`}>
                  {task.title}
                </span>
              </div>
              <button
                onClick={() => onUnlinkTask(goal.id, task.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/20'
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                }`}
                title="Unlink task"
                aria-label="Unlink task"
              >
                <Unlink size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const linkedHabitsSection = linkedHabits.length > 0 ? (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        <Flame size={14} /> Linked Habits ({linkedHabits.length})
      </label>
      <div className="space-y-2">
        {linkedHabits.map(h => {
          const todayLog = h.logs.find(l => l.date === new Date().toISOString().slice(0, 10));
          const todayVal = todayLog?.value ?? 0;
          const done = h.dailyTarget ? todayVal >= h.dailyTarget : todayVal > 0;
          return (
            <div
              key={h.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-emerald-500 text-white' : isDark ? 'bg-white/10 text-gray-600' : 'bg-slate-200 text-slate-400'
              }`}>
                {done && <Check size={12} strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${done ? (isDark ? 'text-gray-500 line-through' : 'text-slate-400 line-through') : (isDark ? 'text-gray-300' : 'text-slate-700')}`}>
                  {h.name}
                </span>
                {h.dailyTarget && h.trackingType !== 'boolean' && (
                  <span className={`ml-2 text-xs tabular-nums ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
                    {todayVal}/{h.dailyTarget}{h.trackingType === 'duration' ? 'm' : ''}
                  </span>
                )}
              </div>
              {h.streakCount > 0 && (
                <span className={`text-xs font-bold flex items-center gap-1 ${h.streakCount >= 7 ? 'text-amber-400' : 'text-orange-500'}`}>
                  <Flame size={11} />{h.streakCount}d
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                +{h.xpPerUnit} XP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const recommendedReadingSection = (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        <BookOpen size={14} /> Recommended Reading
      </label>
      {recommendedArticles.length === 0 ? (
        <p className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>No recommended articles yet</p>
      ) : (
        <div className="space-y-2">
          {recommendedArticles.map(article => (
            <a
              key={article.id}
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between p-3 rounded-xl transition-colors group ${
                isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{article.title || 'Untitled'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {article.source && (
                    <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{article.source}</span>
                  )}
                  {article.matched_goals?.some(g => g.toLowerCase() === goal.title.toLowerCase()) && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    }`}>AI match</span>
                  )}
                  {!article.matched_goals?.some(g => g.toLowerCase() === goal.title.toLowerCase()) && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                    }`}>tag match</span>
                  )}
                </div>
              </div>
              <ExternalLink size={14} className={`flex-shrink-0 transition-opacity opacity-60 md:opacity-0 md:group-hover:opacity-100 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const relatedArticlesSection = linkedArticles.length > 0 ? (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
        <BookOpen size={14} /> Related Articles ({linkedArticles.length})
      </label>
      <div className="space-y-2">
        {linkedArticles.map(article => (
          <a
            key={article.id}
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between p-3 rounded-xl transition-colors group ${
              isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{article.title || 'Untitled'}</p>
              <div className="flex items-center gap-2 mt-1">
                {article.reading_time_minutes && (
                  <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{article.reading_time_minutes} min read</span>
                )}
                {article.relevance_score && (
                  <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>{article.relevance_score}/10</span>
                )}
              </div>
            </div>
            <ExternalLink size={14} className={`flex-shrink-0 transition-opacity opacity-60 md:opacity-0 md:group-hover:opacity-100 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
          </a>
        ))}
      </div>
      <p className={`text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
        Total reading: ~{linkedArticles.reduce((s, a) => s + (a.reading_time_minutes ?? 0), 0)} min across {linkedArticles.length} article{linkedArticles.length !== 1 ? 's' : ''}
      </p>
    </div>
  ) : null;

  const editButtons = isEditing ? (
    <div className="flex justify-end space-x-2">
      <button onClick={() => setIsEditing(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>Cancel</button>
      <button onClick={handleSaveEdit} className="btn-primary px-4 py-2 rounded-lg text-sm">Save Changes</button>
    </div>
  ) : null;

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={onClose}
      title={goal.title}
      icon={<Target className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
      maxWidth="max-w-2xl"
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            {/* Left: tree + description + milestones + AI */}
            <div className={`flex-1 flex flex-col p-8 space-y-6 border-r overflow-y-auto ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              {treeSection}
              {themeSelector}
              <div>
                <p className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{goal.category} &bull; {goal.status}</p>
              </div>
              <div className="flex-1">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description</label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`w-full px-4 py-3 mb-4 rounded-xl border outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'}`}
                      autoFocus
                    />
                    <TiptapEditor
                      content={editDescription}
                      onChange={setEditDescription}
                      placeholder="Add a description..."
                    />
                  </>
                ) : (
                  <p
                    className={`cursor-pointer hover:opacity-80 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                    onClick={() => setIsEditing(true)}
                  >
                    {goal.description || 'Click to add a description...'}
                  </p>
                )}
                {editButtons}
              </div>
              {milestonesSection}
              {aiCoachSection}
            </div>
            {/* Right: progress + linked tasks */}
            <div className={`w-96 flex-shrink-0 p-6 space-y-6 overflow-y-auto ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              {progressBar}
              {linkedHabitsSection}
              {linkedTasksSection}
              {recommendedReadingSection}
              {relatedArticlesSection}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {treeSection}
            {themeSelector}
            <div>
              <p className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{goal.category} &bull; {goal.status}</p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Description</label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`w-full px-4 py-3 mb-3 rounded-xl border outline-none ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-500'}`}
                    autoFocus
                  />
                  <TiptapEditor
                    content={editDescription}
                    onChange={setEditDescription}
                    placeholder="Add a description..."
                  />
                </>
              ) : (
                <p
                  className={`cursor-pointer hover:opacity-80 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}
                  onClick={() => setIsEditing(true)}
                >
                  {goal.description || 'Click to add a description...'}
                </p>
              )}
              {editButtons}
            </div>
            {progressBar}
            {milestonesSection}
            {linkedHabitsSection}
            {linkedTasksSection}
            {recommendedReadingSection}
            {relatedArticlesSection}
            {aiCoachSection}
          </div>
        )
      }
    </ExpandableModal>
  );
}
