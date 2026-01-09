import { Target } from 'lucide-react';

export function Goals() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Goals</h1>
      
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <Target size={48} className="mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">Coming in Phase 2</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Set long-term goals and link tasks to track progress. 
          Goals will help you see the bigger picture and stay motivated.
        </p>
      </div>
    </div>
  );
}
