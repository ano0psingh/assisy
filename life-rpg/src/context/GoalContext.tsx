import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Goal, GoalStatus, TaskCategory } from '../types';
import { LocalStorage } from '../store/localStorage';
import { v4 as uuidv4 } from 'uuid';

interface GoalContextType {
  goals: Goal[];
  loading: boolean;
  createGoal: (
    title: string,
    description?: string,
    category?: TaskCategory
  ) => Goal;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
  completeGoal: (goalId: string) => void;
  archiveGoal: (goalId: string) => void;
  reactivateGoal: (goalId: string) => void;
  linkTaskToGoal: (goalId: string, taskId: string) => void;
  unlinkTaskFromGoal: (goalId: string, taskId: string) => void;
  getGoalById: (goalId: string) => Goal | undefined;
  getGoalsByCategory: (category: TaskCategory) => Goal[];
  getGoalsByStatus: (status: GoalStatus) => Goal[];
  getActiveGoals: () => Goal[];
  calculateGoalProgress: (goal: Goal, completedTaskIds: string[]) => number;
}

const GoalContext = createContext<GoalContextType | null>(null);

// Helper function to update a goal in the array
const updateGoalInArray = (goals: Goal[], goalId: string, updates: Partial<Goal>): Goal[] => {
  return goals.map(goal => {
    if (goal.id === goalId) {
      return { ...goal, ...updates };
    }
    return goal;
  });
};

export function GoalProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedGoals = LocalStorage.getGoals();
    setGoals(savedGoals);
    setLoading(false);
  }, []);

  const createGoal = useCallback((
    title: string,
    description: string = '',
    category: TaskCategory = 'Personal'
  ): Goal => {
    const newGoal: Goal = {
      id: uuidv4(),
      title,
      description,
      category,
      status: 'Active',
      linkedTaskIds: [],
      progress: 0,
      createdAt: new Date(),
    };

    setGoals(prev => {
      const updated = [...prev, newGoal];
      LocalStorage.saveGoals(updated);
      return updated;
    });
    
    return newGoal;
  }, []);

  const updateGoal = useCallback((goalId: string, updates: Partial<Goal>) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, updates);
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const deleteGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = prev.filter(goal => goal.id !== goalId);
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const completeGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, {
        status: 'Completed',
        completedAt: new Date(),
        progress: 100,
      });
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const archiveGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, {
        status: 'Archived',
      });
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const reactivateGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, {
        status: 'Active',
        completedAt: undefined,
      });
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const linkTaskToGoal = useCallback((goalId: string, taskId: string) => {
    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id === goalId && !goal.linkedTaskIds.includes(taskId)) {
          return {
            ...goal,
            linkedTaskIds: [...goal.linkedTaskIds, taskId],
          };
        }
        return goal;
      });
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const unlinkTaskFromGoal = useCallback((goalId: string, taskId: string) => {
    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id === goalId) {
          return {
            ...goal,
            linkedTaskIds: goal.linkedTaskIds.filter(id => id !== taskId),
          };
        }
        return goal;
      });
      LocalStorage.saveGoals(updated);
      return updated;
    });
  }, []);

  const getGoalById = useCallback((goalId: string): Goal | undefined => {
    return goals.find(goal => goal.id === goalId);
  }, [goals]);

  const getGoalsByCategory = useCallback((category: TaskCategory): Goal[] => {
    return goals.filter(goal => goal.category === category);
  }, [goals]);

  const getGoalsByStatus = useCallback((status: GoalStatus): Goal[] => {
    return goals.filter(goal => goal.status === status);
  }, [goals]);

  const getActiveGoals = useCallback((): Goal[] => {
    return goals.filter(goal => goal.status === 'Active');
  }, [goals]);

  // Pure function to calculate progress - doesn't trigger state updates
  const calculateGoalProgress = useCallback((goal: Goal, completedTaskIds: string[]): number => {
    if (goal.linkedTaskIds.length === 0) return 0;
    
    const completedLinkedTasks = goal.linkedTaskIds.filter(taskId => 
      completedTaskIds.includes(taskId)
    );
    
    return Math.round((completedLinkedTasks.length / goal.linkedTaskIds.length) * 100);
  }, []);

  return (
    <GoalContext.Provider value={{
      goals,
      loading,
      createGoal,
      updateGoal,
      deleteGoal,
      completeGoal,
      archiveGoal,
      reactivateGoal,
      linkTaskToGoal,
      unlinkTaskFromGoal,
      getGoalById,
      getGoalsByCategory,
      getGoalsByStatus,
      getActiveGoals,
      calculateGoalProgress,
    }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoalContext() {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoalContext must be used within a GoalProvider');
  }
  return context;
}
