import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Zap, Trophy, AlertCircle, Lightbulb, Target, BookOpen } from 'lucide-react';
import type { DailyLog } from '../../types';
import { ExpandableModal } from '../common/ExpandableModal';
import { NotesEditor } from '../common/NotesEditor';

interface DailyCheckInProps {
  isOpen: boolean;
  existingLog?: DailyLog;
  onSubmit: (data: Partial<Omit<DailyLog, 'id' | 'date'>>) => void;
  onCancel: () => void;
}

export function DailyCheckIn({ isOpen, existingLog, onSubmit, onCancel }: DailyCheckInProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [energyLevel, setEnergyLevel] = useState<number | undefined>(existingLog?.energyLevel);
  const [wins, setWins] = useState(existingLog?.wins || '');
  const [challenges, setChallenges] = useState(existingLog?.challenges || '');
  const [learnings, setLearnings] = useState(existingLog?.learnings || '');
  const [tomorrowFocus, setTomorrowFocus] = useState(existingLog?.tomorrowFocus || '');

  useEffect(() => {
    if (existingLog) {
      setEnergyLevel(existingLog.energyLevel);
      setWins(existingLog.wins || '');
      setChallenges(existingLog.challenges || '');
      setLearnings(existingLog.learnings || '');
      setTomorrowFocus(existingLog.tomorrowFocus || '');
    }
  }, [existingLog]);

  const handleSubmit = () => {
    onSubmit({
      energyLevel,
      wins: wins.trim() || undefined,
      challenges: challenges.trim() || undefined,
      learnings: learnings.trim() || undefined,
      tomorrowFocus: tomorrowFocus.trim() || undefined,
    });
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const energyField = (
    <div>
      <label className={`flex items-center gap-2 text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
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
                : isDark
                  ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>1 = exhausted, 10 = energized</p>
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
      <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
        {icon}
        {label}
      </label>
      <NotesEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minRows={isFS ? 4 : 2}
        maxRows={isFS ? 12 : 6}
        showToolbar={isFS}
        showWordCount={false}
      />
    </div>
  );

  const actionButtons = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className={`px-5 py-2.5 rounded-xl transition-colors ${
          isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
      >
        Cancel
      </button>
      <button type="button" onClick={handleSubmit} className="btn-primary px-5 py-2.5 rounded-xl">
        {existingLog ? 'Update Check-In' : 'Save Check-In'}
      </button>
    </div>
  );

  return (
    <ExpandableModal
      isOpen={isOpen}
      onClose={onCancel}
      title="Daily Check-In"
      icon={<BookOpen className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />}
      maxWidth="max-w-lg"
      footer={actionButtons}
    >
      {(isFS) =>
        isFS ? (
          <div className="flex h-full">
            {/* Left: Wins + Challenges */}
            <div className={`flex-1 flex flex-col p-8 space-y-5 border-r ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{today}</p>
              {energyField}
              {makeNotesField('Today\'s Wins', <Trophy size={16} className="text-emerald-500" />, wins, setWins, 'What went well today? What are you proud of?', true)}
              {makeNotesField('Challenges', <AlertCircle size={16} className="text-red-500" />, challenges, setChallenges, 'What obstacles did you face?', true)}
            </div>
            {/* Right: Learnings + Tomorrow */}
            <div className={`flex-1 flex flex-col p-8 space-y-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
              {makeNotesField('Key Learnings', <Lightbulb size={16} className="text-amber-500" />, learnings, setLearnings, 'What did you learn today? Any insights?', true)}
              {makeNotesField('Tomorrow\'s Focus', <Target size={16} className="text-violet-500" />, tomorrowFocus, setTomorrowFocus, 'What\'s your main focus for tomorrow?', true)}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{today}</p>
            {energyField}
            {makeNotesField('Today\'s Wins', <Trophy size={16} className="text-emerald-500" />, wins, setWins, 'What went well today?', false)}
            {makeNotesField('Challenges', <AlertCircle size={16} className="text-red-500" />, challenges, setChallenges, 'What obstacles did you face?', false)}
            {makeNotesField('Key Learnings', <Lightbulb size={16} className="text-amber-500" />, learnings, setLearnings, 'What did you learn today?', false)}
            {makeNotesField('Tomorrow\'s Focus', <Target size={16} className="text-violet-500" />, tomorrowFocus, setTomorrowFocus, 'What\'s your main focus for tomorrow?', false)}
          </div>
        )
      }
    </ExpandableModal>
  );
}
