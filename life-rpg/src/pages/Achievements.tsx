import { Trophy } from 'lucide-react';

export function Achievements() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Achievements</h1>
      
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <Trophy size={48} className="mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">Coming in Phase 4</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Unlock badges and achievements as you complete tasks and build streaks.
          Earn titles like "Task Warrior" and "Grand Taskmaster" as you level up.
        </p>
      </div>
    </div>
  );
}
