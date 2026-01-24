import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Zap, Trophy, AlertCircle, Lightbulb, Target } from 'lucide-react';
import type { DailyLog } from '../../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      energyLevel,
      wins: wins.trim() || undefined,
      challenges: challenges.trim() || undefined,
      learnings: learnings.trim() || undefined,
      tomorrowFocus: tomorrowFocus.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-slate-900/20'}`}
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className={`relative rounded-2xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col ${
        isDark 
          ? 'bg-[#12121a] border border-white/10' 
          : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Daily Check-In
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              {today}
            </p>
          </div>
          <button 
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Energy Level */}
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
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
              1 = exhausted, 10 = energized
            </p>
          </div>

          {/* Wins */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              <Trophy size={16} className="text-emerald-500" />
              Today's Wins
            </label>
            <textarea
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              placeholder="What went well today? What are you proud of?"
              className="w-full px-4 py-3 input rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Challenges */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              <AlertCircle size={16} className="text-red-500" />
              Challenges
            </label>
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="What obstacles did you face? What was difficult?"
              className="w-full px-4 py-3 input rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Learnings */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              <Lightbulb size={16} className="text-amber-500" />
              Key Learnings
            </label>
            <textarea
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              placeholder="What did you learn today? Any insights?"
              className="w-full px-4 py-3 input rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Tomorrow's Focus */}
          <div>
            <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
              <Target size={16} className="text-violet-500" />
              Tomorrow's Focus
            </label>
            <textarea
              value={tomorrowFocus}
              onChange={(e) => setTomorrowFocus(e.target.value)}
              placeholder="What's your main focus for tomorrow?"
              className="w-full px-4 py-3 input rounded-xl resize-none"
              rows={2}
            />
          </div>
        </form>

        {/* Footer */}
        <div className={`flex justify-end gap-3 p-5 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-5 py-2.5 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary px-5 py-2.5 rounded-xl"
          >
            {existingLog ? 'Update Check-In' : 'Save Check-In'}
          </button>
        </div>
      </div>
    </div>
  );
}
