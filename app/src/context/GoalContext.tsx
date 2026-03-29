import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Goal, GoalStatus, TaskCategory, GoalMilestone, GoalTheme } from '../types';
import { LocalStorage } from '../store/localStorage';
import { saveGoals as saveGoalsToStore } from '../store/unifiedStore';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useDataVersion } from './DataVersionContext';

// XP required for each level (exponential curve)
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200, 7000];

export function getLevelFromXP(totalXP: number): { level: number; currentLevelXP: number; xpToNextLevel: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  const maxLevel = LEVEL_THRESHOLDS.length;
  if (level >= maxLevel) {
    return { level: maxLevel, currentLevelXP: 0, xpToNextLevel: 0 };
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  return {
    level,
    currentLevelXP: totalXP - currentThreshold,
    xpToNextLevel: nextThreshold - currentThreshold,
  };
}

function migrateGoal(goal: Goal): Goal {
  if (goal.level !== undefined && goal.totalXP !== undefined && goal.milestones !== undefined) return goal;
  const totalXP = goal.totalXP ?? Math.round((goal.progress || 0) * 10);
  const { level, currentLevelXP, xpToNextLevel } = getLevelFromXP(totalXP);
  return {
    ...goal,
    level: goal.level ?? level,
    totalXP,
    currentLevelXP: goal.currentLevelXP ?? currentLevelXP,
    xpToNextLevel: goal.xpToNextLevel ?? xpToNextLevel,
    milestones: goal.milestones ?? [],
    theme: goal.theme ?? undefined,
  };
}

export interface LevelUpEvent {
  goalId: string;
  goalTitle: string;
  goalTheme?: GoalTheme;
  oldLevel: number;
  newLevel: number;
  totalXP: number;
}

interface GoalContextType {
  goals: Goal[];
  loading: boolean;
  levelUpEvent: LevelUpEvent | null;
  clearLevelUp: () => void;
  createGoal: (
    title: string,
    description?: string,
    category?: TaskCategory,
    parentGoalId?: string,
    theme?: GoalTheme
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
  calculateGoalProgress: (goal: Goal, completedTaskIds: string[], allGoals: Goal[], allTasks?: { id: string; isRecurring?: boolean }[]) => number;
  addXPToGoal: (goalId: string, xp: number) => void;
  addMilestone: (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'isCompleted' | 'completedAt'>) => void;
  completeMilestone: (goalId: string, milestoneId: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;
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
  const { user } = useAuth();
  const { dataVersion } = useDataVersion();
  const userId = user?.id ?? null;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);

  const clearLevelUp = useCallback(() => setLevelUpEvent(null), []);

  useEffect(() => {
    const savedGoals = LocalStorage.getGoals();
    
    // Clean up orphaned sub-goals (where parentGoalId points to non-existent goal)
    const validGoalIds = new Set(savedGoals.map(g => g.id));
    const cleanedGoals = savedGoals.filter(goal => {
      if (!goal.parentGoalId) return true;
      return validGoalIds.has(goal.parentGoalId);
    });
    
    // Migrate goals to include new XP/level fields
    const migratedGoals = cleanedGoals.map(migrateGoal);
    
    if (migratedGoals.length !== savedGoals.length || migratedGoals.some((g, i) => g !== cleanedGoals[i])) {
      saveGoalsToStore(migratedGoals, userId);
    }
    
    setGoals(migratedGoals);
    setLoading(false);
  }, [dataVersion, userId]);

  const createGoal = useCallback((
    title: string,
    description: string = '',
    category: TaskCategory = 'Personal',
    parentGoalId?: string,
    theme?: GoalTheme
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
      level: 1,
      totalXP: 0,
      currentLevelXP: 0,
      xpToNextLevel: LEVEL_THRESHOLDS[1],
      milestones: [],
      theme,
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
      
      saveGoalsToStore(updated, userId);
      return updated;
    });
    
    return newGoal;
  }, [userId]);

  const updateGoal = useCallback((goalId: string, updates: Partial<Goal>) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, updates);
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

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
      
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const completeGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, {
        status: 'Completed',
        completedAt: new Date(),
        progress: 100,
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const archiveGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, {
        status: 'Archived',
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const reactivateGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = updateGoalInArray(prev, goalId, {
        status: 'Active',
        completedAt: undefined,
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

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
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

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
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

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

  const addXPToGoal = useCallback((goalId: string, xp: number) => {
    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const oldLevel = goal.level || 1;
        const newTotalXP = (goal.totalXP || 0) + xp;
        const levelInfo = getLevelFromXP(newTotalXP);
        if (levelInfo.level > oldLevel) {
          setLevelUpEvent({
            goalId: goal.id,
            goalTitle: goal.title,
            goalTheme: goal.theme,
            oldLevel,
            newLevel: levelInfo.level,
            totalXP: newTotalXP,
          });
        }
        return { ...goal, totalXP: newTotalXP, ...levelInfo };
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const addMilestone = useCallback((goalId: string, milestone: Omit<GoalMilestone, 'id' | 'isCompleted' | 'completedAt'>) => {
    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const newMilestone: GoalMilestone = {
          ...milestone,
          id: uuidv4(),
          isCompleted: false,
        };
        return { ...goal, milestones: [...(goal.milestones || []), newMilestone] };
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const completeMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id !== goalId) return goal;
        const oldLevel = goal.level || 1;
        const milestones = (goal.milestones || []).map(m => {
          if (m.id !== milestoneId || m.isCompleted) return m;
          return { ...m, isCompleted: true, completedAt: new Date() };
        });
        const completedMilestone = milestones.find(m => m.id === milestoneId);
        const bonusXP = completedMilestone?.xpReward || 0;
        const newTotalXP = (goal.totalXP || 0) + bonusXP;
        const levelInfo = getLevelFromXP(newTotalXP);
        if (levelInfo.level > oldLevel) {
          setLevelUpEvent({
            goalId: goal.id,
            goalTitle: goal.title,
            goalTheme: goal.theme,
            oldLevel,
            newLevel: levelInfo.level,
            totalXP: newTotalXP,
          });
        }
        return { ...goal, milestones, totalXP: newTotalXP, ...levelInfo };
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const removeMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.id !== goalId) return goal;
        return { ...goal, milestones: (goal.milestones || []).filter(m => m.id !== milestoneId) };
      });
      saveGoalsToStore(updated, userId);
      return updated;
    });
  }, [userId]);

  const calculateGoalProgress = useCallback((
    goal: Goal,
    completedTaskIds: string[],
    allGoals: Goal[],
    allTasks?: { id: string; isRecurring?: boolean }[],
  ): number => {
    const allLinkedTaskIds: string[] = [...goal.linkedTaskIds];

    const collectSubGoalTasks = (parentId: string) => {
      allGoals
        .filter(g => g.parentGoalId === parentId)
        .forEach(subGoal => {
          allLinkedTaskIds.push(...subGoal.linkedTaskIds);
          collectSubGoalTasks(subGoal.id);
        });
    };
    collectSubGoalTasks(goal.id);

    const recurringIds = new Set(
      (allTasks ?? []).filter(t => t.isRecurring).map(t => t.id),
    );
    const oneOffIds = allLinkedTaskIds.filter(id => !recurringIds.has(id));

    const milestones = goal.milestones ?? [];
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.isCompleted).length;

    const totalItems = oneOffIds.length + totalMilestones;
    if (totalItems === 0) return 0;

    const completedOneOff = oneOffIds.filter(id => completedTaskIds.includes(id)).length;
    return Math.round(((completedOneOff + completedMilestones) / totalItems) * 100);
  }, []);

  return (
    <GoalContext.Provider value={{
      goals,
      loading,
      levelUpEvent,
      clearLevelUp,
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
      addXPToGoal,
      addMilestone,
      completeMilestone,
      removeMilestone,
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
