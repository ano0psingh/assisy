import { Calendar } from 'lucide-react';

export function Habits() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Habits</h1>
      
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <Calendar size={48} className="mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">Coming in Phase 3</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Track daily habits like meditation, reading, and exercise. 
          Build streaks and see your progress over time with a GitHub-style contribution graph.
        </p>
      </div>
    </div>
  );
}
