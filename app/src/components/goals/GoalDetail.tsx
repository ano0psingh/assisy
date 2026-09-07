import { useState, useMemo } from 'react';
import type { Goal, Task, GoalTheme, Habit, GoalHealthStatus, GoalPriority } from '../../types';
import { useGoalContext } from '../../context/GoalContext';
import { askAI, isAIConfigured } from '../../lib/ai';
import { GoalTree } from './GoalTree';
import {
  Target, Plus, Link2, Unlink, Check, BookOpen, ExternalLink,
  X, Sparkles, Loader2, Trophy, Flame, Pencil, ArrowUp, ArrowDown, CalendarClock,
} from 'lucide-react';
import { ExpandableModal } from '../common/ExpandableModal';
import { TiptapEditor } from '../common/TiptapEditor';
import { TextField } from '../ui';
import { ScheduleTaskSheet } from '../calendar/ScheduleTaskSheet';
import { useUnifiedTaskActions } from '../../hooks/useUnifiedTaskActions';
import { formatGoalTargetDate, getMilestoneProgress, isGoalOverdue } from '../../lib/goalUtils';
import { getLocalDateString } from '../../lib/dateUtils';

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
  const { addMilestone, completeMilestone, removeMilestone, reorderMilestone, addHealthCheckIn } = useGoalContext();
  const { schedule, unschedule } = useUnifiedTaskActions();

  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description || '');
  const [editTargetDate, setEditTargetDate] = useState(goal.targetDate ?? '');
  const [editPriority, setEditPriority] = useState<GoalPriority>(goal.priority);
  const [editNextAction, setEditNextAction] = useState(goal.nextAction ?? '');
  const [editTitleError, setEditTitleError] = useState('');

  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDescription, setMsDescription] = useState('');
  const [msXP, setMsXP] = useState('25');
  const [healthStatus, setHealthStatus] = useState<GoalHealthStatus>('on-track');
  const [healthNote, setHealthNote] = useState('');
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);

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
  }, [goal.title, goal.description, linkedArticles]);

  const handleSaveEdit = () => {
    const title = editTitle.trim();
    if (!title) {
      setEditTitleError('Enter a name for this goal.');
      return;
    }
    onUpdateGoal(goal.id, {
      title,
      description: editDescription.trim(),
      targetDate: editTargetDate || undefined,
      priority: editPriority,
      nextAction: editNextAction.trim() || undefined,
    });
    setEditTitleError('');
    setIsEditing(false);
  };

  const startEditing = () => {
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
    setEditTargetDate(goal.targetDate ?? '');
    setEditPriority(goal.priority);
    setEditNextAction(goal.nextAction ?? '');
    setEditTitleError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
    setEditTargetDate(goal.targetDate ?? '');
    setEditPriority(goal.priority);
    setEditNextAction(goal.nextAction ?? '');
    setEditTitleError('');
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
      <GoalTree level={goal.level} theme={goal.theme} size="lg" animate={false} />
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
          'bg-[var(--action-soft)] text-[var(--action)]'
        }`}>
          <Trophy size={14} /> Level {goal.level}
        </span>
        <span className={`text-xs text-[var(--ink-muted)]`}>
          {goal.totalXP} XP total
        </span>
      </div>
      {/* XP progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium text-[var(--ink-muted)]`}>XP to next level</span>
          <span className={`text-xs font-semibold text-[var(--action)]`}>
            {goal.currentLevelXP} / {goal.xpToNextLevel || '—'}
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden bg-[var(--surface-subtle)]`}>
          <div
            className="h-full rounded-full bg-[var(--action)] transition-all duration-500"
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
          className={`w-6 h-6 rounded-full border-2 transition-colors ${
            goal.theme === t.value
              ? 'border-white shadow-[0_8px_20px_rgba(0,0,0,0.14)] scale-110'
              : 'border-transparent opacity-50 hover:opacity-100 dark:opacity-60'
          }`}
          style={{ backgroundColor: t.color }}
        />
      ))}
    </div>
  );

  const planningSection = (
    <div className="space-y-2 rounded-md border border-[var(--rule)] bg-[var(--surface)] p-4 text-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--ink-secondary)]">
        <span><strong>Priority:</strong> {goal.priority}</span>
        {goal.targetDate && (
          <span className={isGoalOverdue(goal) ? 'font-semibold text-[var(--danger)]' : ''} role={isGoalOverdue(goal) ? 'alert' : undefined}>
            <strong>{isGoalOverdue(goal) ? 'Overdue' : 'Target'}:</strong> {formatGoalTargetDate(goal.targetDate)}
          </span>
        )}
      </div>
      {goal.nextAction && <p className="text-[var(--ink-secondary)]"><strong>Next action:</strong> {goal.nextAction}</p>}
    </div>
  );

  const milestonesSection = (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
        Milestones ({(goal.milestones || []).filter(m => m.isCompleted).length}/{(goal.milestones || []).length})
      </label>
      {(goal.milestones || []).length === 0 && !showMilestoneForm && (
        <div className={`text-center py-6 rounded-md bg-[var(--surface)]`}>
          <p className={`text-sm text-[var(--ink-muted)]`}>No milestones yet. Add one to track progress!</p>
        </div>
      )}
      {(goal.milestones || []).length > 0 && (
        <div className="relative pl-6 space-y-0">
          {/* Vertical line */}
          <div className={`absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--surface-inset)]`} />
          {(goal.milestones || []).map((ms, index) => (
            <div key={ms.id} className="relative flex items-start gap-3 py-2">
              {/* Circle / check */}
              <button
                onClick={() => !ms.isCompleted && completeMilestone(goal.id, ms.id)}
                className={`absolute -left-6 top-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all z-10 ${
                  ms.isCompleted
                    ? 'bg-[var(--success)] border-emerald-500'
                    : 'border-[var(--rule-strong)] bg-[var(--surface)] hover:border-emerald-500 hover:bg-[var(--success-soft)]'
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
                      ? 'text-[var(--ink-muted)] line-through'
                      : 'text-[var(--ink-secondary)]'
                  }`}>
                    {ms.title}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    'bg-[var(--warning-soft)] text-[var(--warning)]'
                  }`}>
                    +{ms.xpReward} XP
                  </span>
                </div>
                {ms.description && (
                  <p className={`text-xs mt-1 text-[var(--ink-muted)]`}>{ms.description}</p>
                )}
              </div>
              <div className="flex flex-col">
                <button onClick={() => reorderMilestone(goal.id, ms.id, 'up')} disabled={index === 0} aria-label={`Move ${ms.title} up`} className="rounded p-1 text-[var(--ink-muted)] hover:text-[var(--action)] disabled:opacity-25"><ArrowUp size={13} /></button>
                <button onClick={() => reorderMilestone(goal.id, ms.id, 'down')} disabled={index === goal.milestones.length - 1} aria-label={`Move ${ms.title} down`} className="rounded p-1 text-[var(--ink-muted)] hover:text-[var(--action)] disabled:opacity-25"><ArrowDown size={13} /></button>
              </div>
              {/* Delete */}
              <button
                onClick={() => removeMilestone(goal.id, ms.id)}
                className={`p-1 rounded-sm transition-colors flex-shrink-0 ${
                  'text-[var(--ink-disabled)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]'
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
        <div className={`mt-3 p-3 rounded-md space-y-2 bg-[var(--surface)] border border-[var(--rule)]`}>
          <input
            type="text"
            placeholder="Milestone title"
            value={msTitle}
            onChange={e => setMsTitle(e.target.value)}
            className={`w-full px-3 py-2 text-sm rounded-sm border outline-none ${
              'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--action)]'
            }`}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAddMilestone()}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={msDescription}
            onChange={e => setMsDescription(e.target.value)}
            className={`w-full px-3 py-2 text-sm rounded-sm border outline-none ${
              'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--action)]'
            }`}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="XP"
              value={msXP}
              onChange={e => setMsXP(e.target.value)}
              className={`w-20 px-3 py-2 text-sm rounded-sm border outline-none ${
                'bg-[var(--surface)] border-[var(--rule)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--action)]'
              }`}
            />
            <span className={`text-xs text-[var(--ink-muted)]`}>XP reward</span>
            <div className="flex-1" />
            <button
              onClick={() => setShowMilestoneForm(false)}
              className={`px-3 py-2 text-xs rounded-sm text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)]`}
            >Cancel</button>
            <button
              onClick={handleAddMilestone}
              disabled={!msTitle.trim()}
              className="px-3 py-2 text-xs font-medium rounded-sm bg-[var(--action)] text-white hover:bg-[var(--action-hover)] disabled:opacity-40 transition-colors"
            >Add</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowMilestoneForm(true)}
          className={`mt-3 flex items-center gap-2 text-sm font-medium transition-colors ${
            'text-[var(--ink-muted)] hover:text-[var(--action)]'
          }`}
        >
          <Plus size={15} /> Add milestone
        </button>
      )}
    </div>
  );

  const healthSection = (
    <div>
      <label className="mb-3 block text-sm font-medium text-[var(--ink-secondary)]">Weekly health check-in</label>
      <div className="rounded-md border border-[var(--rule)] bg-[var(--surface)] p-3">
        <div className="flex flex-wrap gap-2">
          {(['on-track', 'at-risk', 'paused'] as const).map(status => (
            <button key={status} type="button" onClick={() => setHealthStatus(status)} className={`rounded-sm px-3 py-2 text-xs font-medium ${healthStatus === status ? 'bg-[var(--action)] text-white' : 'bg-[var(--surface)] text-[var(--ink-secondary)]'}`}>
              {status.replace('-', ' ')}
            </button>
          ))}
        </div>
        <input value={healthNote} onChange={event => setHealthNote(event.target.value)} placeholder="Optional note" aria-label="Health check-in note" className="mt-2 min-h-11 w-full rounded-sm border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--action)]" />
        <button type="button" onClick={() => { addHealthCheckIn(goal.id, healthStatus, healthNote); setHealthNote(''); }} className="mt-2 rounded-sm bg-[var(--action)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--action-hover)]">Save check-in</button>
        {goal.healthCheckIns.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-[var(--rule)] pt-3 text-xs">
            {goal.healthCheckIns.slice(-3).reverse().map(checkIn => (
              <div key={checkIn.id}>
                <span className="font-semibold capitalize text-[var(--ink-secondary)]">{checkIn.status.replace('-', ' ')}</span>
                <span className="ml-2 text-[var(--ink-muted)]">{new Date(checkIn.createdAt).toLocaleString()}</span>
                {checkIn.note && <p className="mt-0.5 text-[var(--ink-muted)]">{checkIn.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const aiCoachSection = isAIConfigured() ? (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
        <Sparkles size={14} /> AI Coach
      </label>
      {!aiResponse && !aiLoading && (
        <button
          onClick={handleAskAI}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            'bg-[var(--action-soft)] border border-[var(--action)] text-[var(--action)] hover:bg-[var(--action-soft)]'
          }`}
        >
          <Sparkles size={16} /> Get AI Advice
        </button>
      )}
      {aiLoading && (
        <div className={`flex items-center justify-center gap-2 px-4 py-6 rounded-md ${
          'bg-[var(--action-soft)] border border-[var(--action)]'
        }`}>
          <Loader2 size={18} className="animate-spin text-[var(--action)]" />
          <span className={`text-sm text-[var(--action)]`}>Thinking...</span>
        </div>
      )}
      {aiError && (
        <div className={`p-4 rounded-md text-sm bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)]`}>
          {aiError}
          <button onClick={handleAskAI} className="ml-2 underline">Retry</button>
        </div>
      )}
      {aiResponse && (
        <div className={`p-4 rounded-md text-sm whitespace-pre-wrap leading-relaxed ${
          'bg-[var(--action-soft)] border border-[var(--action)] text-[var(--ink)]'
        }`}>
          {aiResponse}
          <button
            onClick={handleAskAI}
            className={`mt-3 flex items-center gap-1 text-xs font-medium text-[var(--action)] hover:underline`}
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
        <label className={`text-sm font-medium text-[var(--ink-secondary)]`}>Progress</label>
        <span className={`text-sm font-semibold text-[var(--action)]`}>{progress}%</span>
      </div>
      <div className={`h-3 rounded-full overflow-hidden bg-[var(--surface-subtle)]`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress === 100
              ? 'bg-[var(--success)]'
              : 'bg-[var(--action)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={`text-xs mt-2 space-y-1 text-[var(--ink-muted)]`}>
        {nonRecurringTasks.length > 0 && (
          <p>{completedNonRecurring} of {nonRecurringTasks.length} tasks completed</p>
        )}
        {totalMilestones > 0 && (
          <p>{completedMilestones} of {totalMilestones} milestones completed ({getMilestoneProgress(goal)}% milestone progress)</p>
        )}
        {recurringCount > 0 && (
          <p className={'text-[var(--ink-muted)]'}>{recurringCount} recurring task{recurringCount > 1 ? 's' : ''} (ongoing, earn XP daily)</p>
        )}
        {linkedHabits.length > 0 && (
          <p className={'text-[var(--ink-muted)]'}>{linkedHabits.length} habit{linkedHabits.length > 1 ? 's' : ''} linked (earn XP daily)</p>
        )}
      </div>
    </div>
  );

  const linkedTasksSection = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className={`text-sm font-medium text-[var(--ink-secondary)]`}>
          Linked Tasks ({linkedTasks.length})
        </label>
        <button
          onClick={() => setIsLinkingMode(!isLinkingMode)}
          className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
            isLinkingMode
              ? 'text-[var(--action)]'
              : 'text-[var(--ink-muted)] hover:text-[var(--action)]'
          }`}
        >
          <Plus size={16} />
          <span>{isLinkingMode ? 'Done' : 'Link Tasks'}</span>
        </button>
      </div>

      {isLinkingMode && availableTasks.length > 0 && (
        <div className={`mb-4 p-4 rounded-md bg-[var(--surface)]`}>
          <p className={`text-sm mb-3 text-[var(--ink-secondary)]`}>Select tasks to link:</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onLinkTask(goal.id, task.id)}
                className={`w-full flex items-center justify-between p-3 rounded-sm transition-colors ${
                  'bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--ink-secondary)]'
                }`}
              >
                <span className="text-sm truncate">{task.title}</span>
                <Link2 size={14} className={'text-[var(--action)]'} />
              </button>
            ))}
          </div>
        </div>
      )}

      {isLinkingMode && availableTasks.length === 0 && (
        <div className={`mb-4 p-4 rounded-md text-center bg-[var(--surface)]`}>
          <p className={`text-sm text-[var(--ink-muted)]`}>No available tasks to link.</p>
        </div>
      )}

      {linkedTasks.length === 0 ? (
        <div className={`text-center py-8 rounded-md bg-[var(--surface)]`}>
          <Target className={`w-10 h-10 mx-auto mb-3 text-[var(--ink-muted)]`} />
          <p className={`text-sm text-[var(--ink-muted)]`}>No tasks linked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-md ${
                'bg-[var(--surface)] border border-[var(--rule)]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onToggleTaskComplete(task.id)}
                  className={`w-6 h-6 rounded-sm border-2 flex items-center justify-center transition-all ${
                    task.status === 'Completed'
                      ? 'bg-[var(--success)] border-emerald-500'
                      : 'border-[var(--rule-strong)] hover:border-[var(--action)] hover:bg-[var(--action-soft)]'
                  }`}
                >
                  {task.status === 'Completed' && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
                <span className={`text-sm ${
                  task.status === 'Completed'
                    ? 'text-[var(--ink-muted)] line-through'
                    : 'text-[var(--ink-secondary)]'
                }`}>
                  {task.title}
                </span>
              </div>
              <div className="flex items-center">
                {task.status !== 'Completed' && (
                  <button type="button" onClick={() => setSchedulingTask(task)} className="rounded-sm p-2 text-[var(--ink-muted)] hover:bg-[var(--action-soft)] hover:text-[var(--action)]" aria-label={`Schedule ${task.title}`} title="Schedule task">
                    <CalendarClock size={15} />
                  </button>
                )}
                <button
                  onClick={() => onUnlinkTask(goal.id, task.id)}
                  className={`p-2 rounded-sm transition-colors ${
                    'text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]'
                  }`}
                  title="Unlink task"
                  aria-label="Unlink task"
                >
                  <Unlink size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const linkedHabitsSection = linkedHabits.length > 0 ? (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
        <Flame size={14} /> Linked Habits ({linkedHabits.length})
      </label>
      <div className="space-y-2">
        {linkedHabits.map(h => {
          const todayLog = h.logs.find(l => l.date === getLocalDateString());
          const todayVal = todayLog?.value ?? 0;
          const done = h.dailyTarget ? todayVal >= h.dailyTarget : todayVal > 0;
          return (
            <div
              key={h.id}
              className={`flex items-center gap-3 p-3 rounded-md ${
                'bg-[var(--surface)] border border-[var(--rule)]'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-[var(--success)] text-white' : 'bg-[var(--surface-inset)] text-[var(--ink-muted)]'
              }`}>
                {done && <Check size={12} strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${done ? ('text-[var(--ink-muted)] line-through') : ('text-[var(--ink-secondary)]')}`}>
                  {h.name}
                </span>
                {h.dailyTarget && h.trackingType !== 'boolean' && (
                  <span className={`ml-2 text-xs tabular-nums text-[var(--ink-muted)]`}>
                    {todayVal}/{h.dailyTarget}{h.trackingType === 'duration' ? 'm' : ''}
                  </span>
                )}
              </div>
              {h.streakCount > 0 && (
                <span className={`text-xs font-bold flex items-center gap-1 ${h.streakCount >= 7 ? 'text-[var(--warning)]' : 'text-[var(--warning)]'}`}>
                  <Flame size={11} />{h.streakCount}d
                </span>
              )}
              <span className={`text-xs px-2 py-1 rounded bg-[var(--action-soft)] text-[var(--action)]`}>
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
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
        <BookOpen size={14} /> Recommended Reading
      </label>
      {recommendedArticles.length === 0 ? (
        <p className={`text-xs italic text-[var(--ink-muted)]`}>No recommended articles yet</p>
      ) : (
        <div className="space-y-2">
          {recommendedArticles.map(article => (
            <a
              key={article.id}
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between p-3 rounded-md transition-colors group ${
                'bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate text-[var(--ink-secondary)]`}>{article.title || 'Untitled'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {article.source && (
                    <span className={`text-xs text-[var(--ink-muted)]`}>{article.source}</span>
                  )}
                  {article.matched_goals?.some(g => g.toLowerCase() === goal.title.toLowerCase()) && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      'bg-[var(--success-soft)] text-[var(--success)]'
                    }`}>AI match</span>
                  )}
                  {!article.matched_goals?.some(g => g.toLowerCase() === goal.title.toLowerCase()) && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      'bg-[var(--action-soft)] text-[var(--action)]'
                    }`}>tag match</span>
                  )}
                </div>
              </div>
              <ExternalLink size={14} className={`flex-shrink-0 transition-opacity opacity-60 md:opacity-0 md:group-hover:opacity-100 text-[var(--ink-muted)]`} />
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const relatedArticlesSection = linkedArticles.length > 0 ? (
    <div>
      <label className={`text-sm font-medium mb-3 flex items-center gap-2 text-[var(--ink-secondary)]`}>
        <BookOpen size={14} /> Related Articles ({linkedArticles.length})
      </label>
      <div className="space-y-2">
        {linkedArticles.map(article => (
          <a
            key={article.id}
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between p-3 rounded-md transition-colors group ${
              'bg-[var(--surface)] border border-[var(--rule)] hover:bg-[var(--surface-subtle)]'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate text-[var(--ink-secondary)]`}>{article.title || 'Untitled'}</p>
              <div className="flex items-center gap-2 mt-1">
                {article.reading_time_minutes && (
                  <span className={`text-xs text-[var(--ink-muted)]`}>{article.reading_time_minutes} min read</span>
                )}
                {article.relevance_score && (
                  <span className={`text-xs text-[var(--ink-muted)]`}>{article.relevance_score}/10</span>
                )}
              </div>
            </div>
            <ExternalLink size={14} className={`flex-shrink-0 transition-opacity opacity-60 md:opacity-0 md:group-hover:opacity-100 text-[var(--ink-muted)]`} />
          </a>
        ))}
      </div>
      <p className={`text-xs mt-2 text-[var(--ink-muted)]`}>
        Total reading: ~{linkedArticles.reduce((s, a) => s + (a.reading_time_minutes ?? 0), 0)} min across {linkedArticles.length} article{linkedArticles.length !== 1 ? 's' : ''}
      </p>
    </div>
  ) : null;

  const editPlanningFields = (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Target date" type="date" value={editTargetDate} onChange={event => setEditTargetDate(event.target.value)} />
        <label className="text-sm font-medium text-[var(--ink-secondary)]">
          Priority
          <select value={editPriority} onChange={event => setEditPriority(event.target.value as GoalPriority)} className="mt-2 min-h-11 w-full rounded-md border border-[var(--rule)] bg-[var(--surface)] px-3">
            <option>High</option><option>Medium</option><option>Low</option>
          </select>
        </label>
      </div>
      <TextField label="Next action" value={editNextAction} onChange={event => setEditNextAction(event.target.value)} />
    </div>
  );

  const editButtons = isEditing ? (
    <div className="flex justify-end space-x-2">
      <button onClick={cancelEditing} className={`px-4 py-2 rounded-sm text-sm text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)]`}>Cancel</button>
      <button onClick={handleSaveEdit} className="btn-primary px-4 py-2 rounded-sm text-sm">Save Changes</button>
    </div>
  ) : null;

  return (
    <>
    <ExpandableModal
      isOpen={isOpen}
      onClose={onClose}
      title={goal.title}
      icon={<Target className={`w-5 h-5 text-[var(--action)]`} />}
      maxWidth="max-w-2xl"
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            {/* Left: tree + description + milestones + AI */}
            <div className={`flex-1 flex flex-col p-8 space-y-6 border-r overflow-y-auto border-[var(--rule)]`}>
              {treeSection}
              {themeSelector}
              {planningSection}
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm mb-1 text-[var(--ink-muted)]`}>{goal.category} &bull; {goal.status}</p>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium text-[var(--action)] hover:bg-[var(--action-soft)]"
                  >
                    <Pencil size={13} />
                    Rename goal
                  </button>
                )}
              </div>
              <div className="flex-1">
                {!isEditing && (
                  <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Description</label>
                )}
                {isEditing ? (
                  <>
                    <TextField
                      label="Goal name"
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        if (editTitleError) setEditTitleError('');
                      }}
                      error={editTitleError || undefined}
                      className="mb-4"
                      autoFocus
                    />
                    <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Description</label>
                    <TiptapEditor
                      content={editDescription}
                      onChange={setEditDescription}
                      placeholder="Add a description..."
                      size="tall"
                    />
                    {editPlanningFields}
                  </>
                ) : (
                  <p
                    className={`cursor-pointer hover:opacity-80 whitespace-pre-wrap text-[var(--ink-secondary)]`}
                    onClick={startEditing}
                  >
                    {goal.description || 'Click to add a description...'}
                  </p>
                )}
                {editButtons}
              </div>
              {milestonesSection}
              {healthSection}
              {aiCoachSection}
            </div>
            {/* Right: progress + linked tasks */}
            <div className={`w-96 flex-shrink-0 p-6 space-y-6 overflow-y-auto bg-[var(--surface)]`}>
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
            {planningSection}
            <div className="flex items-center justify-between gap-3">
              <p className={`text-sm mb-1 text-[var(--ink-muted)]`}>{goal.category} &bull; {goal.status}</p>
              {!isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 rounded-sm px-3 py-2 text-xs font-medium text-[var(--action)] hover:bg-[var(--action-soft)]"
                >
                  <Pencil size={13} />
                  Rename goal
                </button>
              )}
            </div>
            <div>
              {!isEditing && (
                <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Description</label>
              )}
              {isEditing ? (
                <>
                  <TextField
                    label="Goal name"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      if (editTitleError) setEditTitleError('');
                    }}
                    error={editTitleError || undefined}
                    className="mb-3"
                    autoFocus
                  />
                  <label className={`block text-sm font-medium mb-2 text-[var(--ink-secondary)]`}>Description</label>
                  <TiptapEditor
                    content={editDescription}
                    onChange={setEditDescription}
                    placeholder="Add a description..."
                    size="tall"
                  />
                  {editPlanningFields}
                </>
              ) : (
                <p
                  className={`cursor-pointer hover:opacity-80 whitespace-pre-wrap text-[var(--ink-secondary)]`}
                  onClick={startEditing}
                >
                  {goal.description || 'Click to add a description...'}
                </p>
              )}
              {editButtons}
            </div>
            {progressBar}
            {milestonesSection}
            {healthSection}
            {linkedHabitsSection}
            {linkedTasksSection}
            {recommendedReadingSection}
            {relatedArticlesSection}
            {aiCoachSection}
          </div>
        )
      }
    </ExpandableModal>
    <ScheduleTaskSheet
      key={schedulingTask?.id ?? 'none'}
      task={schedulingTask}
      defaultDate={getLocalDateString()}
      onClose={() => setSchedulingTask(null)}
      onSchedule={schedule}
      onUnschedule={unschedule}
    />
    </>
  );
}
