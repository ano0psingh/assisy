import { useState, useEffect } from 'react';
import { useGoalContext } from '../../context/GoalContext';
import { useDailyLogContext } from '../../context/DailyLogContext';
import { Zap, Trophy, AlertCircle, Lightbulb, Target, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import type { DailyLog } from '../../types';
import { ExpandableModal } from '../common/ExpandableModal';
import { TiptapEditor } from '../common/TiptapEditor';
import { askAI, askAIJson, isAIConfigured } from '../../lib/ai';

function stripHtml(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
}

interface DailyCheckInProps {
  isOpen: boolean;
  existingLog?: DailyLog;
  onSubmit: (data: Partial<Omit<DailyLog, 'id' | 'date'>>) => void;
  onCancel: () => void;
}

export function DailyCheckIn({ isOpen, existingLog, onSubmit, onCancel }: DailyCheckInProps) {
  const { getActiveGoals } = useGoalContext();
  const { createOrUpdateLog } = useDailyLogContext();

  const [energyLevel, setEnergyLevel] = useState<number | undefined>(existingLog?.energyLevel);
  const [wins, setWins] = useState(existingLog?.wins || '');
  const [challenges, setChallenges] = useState(existingLog?.challenges || '');
  const [learnings, setLearnings] = useState(existingLog?.learnings || '');
  const [tomorrowFocus, setTomorrowFocus] = useState(existingLog?.tomorrowFocus || '');

  const [aiReflection, setAiReflection] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (existingLog) {
      setEnergyLevel(existingLog.energyLevel);
      setWins(existingLog.wins || '');
      setChallenges(existingLog.challenges || '');
      setLearnings(existingLog.learnings || '');
      setTomorrowFocus(existingLog.tomorrowFocus || '');
    }
  }, [existingLog]);

  useEffect(() => {
    if (!isOpen) {
      setAiReflection(null);
      setAiError(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onSubmit({
      energyLevel,
      wins: wins.trim() || undefined,
      challenges: challenges.trim() || undefined,
      learnings: learnings.trim() || undefined,
      tomorrowFocus: tomorrowFocus.trim() || undefined,
    });

    if (isAIConfigured()) {
      const winsText = stripHtml(wins);
      const challengesText = stripHtml(challenges);
      const learningsText = stripHtml(learnings);
      const goalTitles = getActiveGoals().map(g => g.title).join(', ') || 'None set';

      setAiLoading(true);
      setAiError(null);

      const reflectionPrompt = `Based on this daily check-in, give a brief 2-3 sentence reflection connecting today's experience to the user's goals. Check-in: Energy: ${energyLevel ?? 'N/A'}/10, Wins: ${winsText || 'None'}, Challenges: ${challengesText || 'None'}. Active goals: ${goalTitles}. Be encouraging and specific.`;

      const sentimentPrompt = `Rate the overall sentiment of this check-in on a scale of 1-10 (1=very negative, 10=very positive). Check-in text: ${winsText} ${challengesText} ${learningsText}. Respond with JSON: {"score": number}`;

      Promise.allSettled([
        askAI(reflectionPrompt),
        askAIJson<{ score: number }>(sentimentPrompt),
      ]).then(([reflectionResult, sentimentResult]) => {
        if (reflectionResult.status === 'fulfilled') {
          setAiReflection(reflectionResult.value);
        } else {
          setAiError('Could not generate reflection.');
        }

        if (sentimentResult.status === 'fulfilled') {
          const score = sentimentResult.value.score;
          if (typeof score === 'number' && score >= 1 && score <= 10) {
            createOrUpdateLog(new Date(), { sentimentScore: score });
          }
        }
      }).finally(() => setAiLoading(false));
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const energyField = (
    <div>
      <label className={`flex items-center gap-2 text-sm font-medium mb-3 text-slate-700 dark:text-gray-300`}>
        <Zap size={16} className="text-amber-500" />
        Energy Level
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setEnergyLevel(level)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              energyLevel === level
                ? level <= 3
                  ? 'bg-red-500 text-white'
                  : level <= 6
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <p className={`text-xs mt-1 text-slate-500 dark:text-gray-500`}>1 = exhausted, 10 = energized</p>
    </div>
  );

  const makeNotesField = (
    label: string,
    icon: React.ReactNode,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    isFS: boolean
  ) => (
    <div className={isFS ? 'flex-1 flex flex-col' : ''}>
      <label className={`flex items-center gap-2 text-sm font-medium mb-2 text-slate-700 dark:text-gray-300`}>
        {icon}
        {label}
      </label>
      <TiptapEditor
        content={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className={`px-6 py-3 rounded-xl transition-colors ${
          'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
        }`}
      >
        Cancel
      </button>
      <button type="button" onClick={handleSubmit} className="btn-primary px-6 py-3 rounded-xl">
        {existingLog ? 'Update Check-In' : 'Save Check-In'}
      </button>
    </div>
  );

  const aiReflectionSection = (aiLoading || aiReflection || aiError) ? (
    <div className={`mx-6 mb-6 p-4 rounded-xl border ${
      'bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/20'
    }`}>
      <div className={`flex items-center gap-2 text-sm font-medium mb-2 text-violet-700 dark:text-violet-300`}>
        <Sparkles size={14} />
        AI Reflection
      </div>
      {aiLoading && (
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-violet-400" />
          <span className={`text-sm text-slate-500 dark:text-gray-400`}>Reflecting on your day...</span>
        </div>
      )}
      {aiError && (
        <p className={`text-sm text-red-600 dark:text-red-400`}>{aiError}</p>
      )}
      {aiReflection && (
        <p className={`text-sm leading-relaxed text-slate-600 dark:text-gray-300`}>{aiReflection}</p>
      )}
    </div>
  ) : null;

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={onCancel}
      title="Daily Check-In"
      icon={<BookOpen className={`w-5 h-5 text-violet-600 dark:text-violet-400`} />}
      maxWidth="max-w-lg"
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex flex-col h-full">
            <div className="flex flex-1 min-h-0">
              {/* Left: Wins + Challenges */}
              <div className={`flex-1 flex flex-col p-8 space-y-6 border-r border-slate-200 dark:border-white/10`}>
                <p className={`text-sm text-slate-500 dark:text-gray-500`}>{today}</p>
                {energyField}
                {makeNotesField('Today\'s Wins', <Trophy size={16} className="text-emerald-500" />, wins, setWins, 'What went well today? What are you proud of?', true)}
                {makeNotesField('Challenges', <AlertCircle size={16} className="text-red-500" />, challenges, setChallenges, 'What obstacles did you face?', true)}
              </div>
              {/* Right: Learnings + Tomorrow */}
              <div className={`flex-1 flex flex-col p-8 space-y-6 bg-white dark:bg-white/[0.02]`}>
                {makeNotesField('Key Learnings', <Lightbulb size={16} className="text-amber-500" />, learnings, setLearnings, 'What did you learn today? Any insights?', true)}
                {makeNotesField('Tomorrow\'s Focus', <Target size={16} className="text-violet-500" />, tomorrowFocus, setTomorrowFocus, 'What\'s your main focus for tomorrow?', true)}
              </div>
            </div>
            {aiReflectionSection}
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <p className={`text-sm text-slate-500 dark:text-gray-500`}>{today}</p>
            {energyField}
            {makeNotesField('Today\'s Wins', <Trophy size={16} className="text-emerald-500" />, wins, setWins, 'What went well today?', false)}
            {makeNotesField('Challenges', <AlertCircle size={16} className="text-red-500" />, challenges, setChallenges, 'What obstacles did you face?', false)}
            {makeNotesField('Key Learnings', <Lightbulb size={16} className="text-amber-500" />, learnings, setLearnings, 'What did you learn today?', false)}
            {makeNotesField('Tomorrow\'s Focus', <Target size={16} className="text-violet-500" />, tomorrowFocus, setTomorrowFocus, 'What\'s your main focus for tomorrow?', false)}
            {aiReflectionSection}
          </div>
        )
      }
    </ExpandableModal>
  );
}
