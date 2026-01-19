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
    category?: TaskCategory,
    parentGoalId?: string
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
  getTopLevelGoals: () => Goal[];
  getSubGoals: (parentGoalId: string) => Goal[];
  calculateGoalProgress: (goal: Goal, completedTaskIds: string[], allGoals: Goal[]) => number;
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
    
    // Clean up orphaned sub-goals (where parentGoalId points to non-existent goal)
    const validGoalIds = new Set(savedGoals.map(g => g.id));
    const cleanedGoals = savedGoals.filter(goal => {
      // Keep if no parent OR parent exists
      if (!goal.parentGoalId) return true;
      return validGoalIds.has(goal.parentGoalId);
    });
    
    // If we cleaned up any orphans, save the cleaned list
    if (cleanedGoals.length !== savedGoals.length) {
      LocalStorage.saveGoals(cleanedGoals);
    }
    
    setGoals(cleanedGoals);
    setLoading(false);
  }, []);

  const createGoal = useCallback((
    title: string,
    description: string = '',
    category: TaskCategory = 'Personal',
    parentGoalId?: string
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
      parentGoalId,
      subGoalIds: [],
    };

    setGoals(prev => {
      let updated = [...prev, newGoal];
      
      // If this is a sub-goal, add it to parent's subGoalIds
      if (parentGoalId) {
        updated = updated.map(goal => {
          if (goal.id === parentGoalId) {
            return {
              ...goal,
              subGoalIds: [...(goal.subGoalIds || []), newGoal.id],
            };
          }
          return goal;
        });
      }
      
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
      const goalToDelete = prev.find(g => g.id === goalId);
      
      // Remove from parent's subGoalIds if it's a sub-goal
      let updated = prev;
      if (goalToDelete?.parentGoalId) {
        updated = updated.map(goal => {
          if (goal.id === goalToDelete.parentGoalId) {
            return {
              ...goal,
              subGoalIds: (goal.subGoalIds || []).filter(id => id !== goalId),
            };
          }
          return goal;
        });
      }
      
      // Find ALL sub-goals by parentGoalId field (more reliable than subGoalIds array)
      const allSubGoalIds = new Set<string>();
      const findAllDescendants = (parentId: string) => {
        prev.forEach(g => {
          if (g.parentGoalId === parentId && !allSubGoalIds.has(g.id)) {
            allSubGoalIds.add(g.id);
            findAllDescendants(g.id); // Recursively find nested sub-goals
          }
        });
      };
      findAllDescendants(goalId);
      
      // Delete this goal and all descendants
      updated = updated.filter(goal => goal.id !== goalId && !allSubGoalIds.has(goal.id));
      
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

  const getTopLevelGoals = useCallback((): Goal[] => {
    return goals.filter(goal => !goal.parentGoalId);
  }, [goals]);

  const getSubGoals = useCallback((parentGoalId: string): Goal[] => {
    return goals.filter(goal => goal.parentGoalId === parentGoalId);
  }, [goals]);

  // Pure function to calculate progress - doesn't trigger state updates
  // For parent goals: progress = ALL tasks (own + sub-goals) completed / total
  const calculateGoalProgress = useCallback((goal: Goal, completedTaskIds: string[], allGoals: Goal[]): number => {
    // Collect ALL linked task IDs (from this goal and all descendant sub-goals)
    const allLinkedTaskIds: string[] = [...goal.linkedTaskIds];
    
    // Recursively collect task IDs from all sub-goals
    const collectSubGoalTasks = (parentId: string) => {
      allGoals
        .filter(g => g.parentGoalId === parentId)
        .forEach(subGoal => {
          allLinkedTaskIds.push(...subGoal.linkedTaskIds);
          collectSubGoalTasks(subGoal.id); // Recurse for nested sub-goals
        });
    };
    collectSubGoalTasks(goal.id);
    
    // Calculate progress based on ALL collected tasks
    if (allLinkedTaskIds.length === 0) return 0;
    
    const completedLinkedTasks = allLinkedTaskIds.filter(taskId => 
      completedTaskIds.includes(taskId)
    );
    
    return Math.round((completedLinkedTasks.length / allLinkedTaskIds.length) * 100);
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
      getTopLevelGoals,
      getSubGoals,
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
