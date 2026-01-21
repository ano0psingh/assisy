import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { SkillTree, SkillCategory, Achievement, UserStats, TaskCategory } from '../types';

// XP required for each level (cumulative)
const XP_PER_LEVEL = 100;

// Calculate level from XP
const calculateLevel = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;

// Default skill trees
const DEFAULT_SKILL_TREES: SkillTree[] = [
  {
    id: 'health',
    name: 'Health & Fitness',
    icon: '🏃',
    description: 'Exercise, water intake, physical wellness',
    currentXP: 0,
    level: 1,
    color: '#10B981', // emerald
  },
  {
    id: 'learning',
    name: 'Learning & Growth',
    icon: '📚',
    description: 'Reading, courses, skill development',
    currentXP: 0,
    level: 1,
    color: '#3B82F6', // blue
  },
  {
    id: 'financial',
    name: 'Financial',
    icon: '💰',
    description: 'Savings, investments, financial goals',
    currentXP: 0,
    level: 1,
    color: '#F59E0B', // amber
  },
  {
    id: 'productivity',
    name: 'Productivity',
    icon: '🎯',
    description: 'Task completion, goal achievement',
    currentXP: 0,
    level: 1,
    color: '#8B5CF6', // violet
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    icon: '🧘',
    description: 'Meditation, journaling, mental wellness',
    currentXP: 0,
    level: 1,
    color: '#EC4899', // pink
  },
];

// Default achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  // Milestone Achievements
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Complete your first task',
    type: 'milestone',
    icon: '⭐',
    requirement: { type: 'tasks_completed', value: 1 },
    xpReward: 50,
    isUnlocked: false,
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Complete 10 tasks',
    type: 'milestone',
    icon: '🚀',
    requirement: { type: 'tasks_completed', value: 10 },
    xpReward: 100,
    isUnlocked: false,
  },
  {
    id: 'task-warrior',
    name: 'Task Warrior',
    description: 'Complete 50 tasks',
    type: 'milestone',
    icon: '⚔️',
    requirement: { type: 'tasks_completed', value: 50 },
    xpReward: 250,
    isUnlocked: false,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 tasks',
    type: 'milestone',
    icon: '🏛️',
    requirement: { type: 'tasks_completed', value: 100 },
    xpReward: 500,
    isUnlocked: false,
  },
  {
    id: 'task-master',
    name: 'Task Master',
    description: 'Complete 500 tasks',
    type: 'milestone',
    icon: '👑',
    requirement: { type: 'tasks_completed', value: 500 },
    xpReward: 1000,
    isUnlocked: false,
  },
  // Streak Achievements
  {
    id: 'on-fire',
    name: 'On Fire',
    description: '7-day task streak',
    type: 'streak',
    icon: '🔥',
    requirement: { type: 'streak_days', value: 7 },
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: '14-day task streak',
    type: 'streak',
    icon: '💪',
    requirement: { type: 'streak_days', value: 14 },
    xpReward: 300,
    isUnlocked: false,
  },
  {
    id: 'month-warrior',
    name: 'Month Warrior',
    description: '30-day task streak',
    type: 'streak',
    icon: '🏆',
    requirement: { type: 'streak_days', value: 30 },
    xpReward: 500,
    isUnlocked: false,
  },
  {
    id: 'legendary-streak',
    name: 'Legendary Streak',
    description: '100-day task streak',
    type: 'streak',
    icon: '🌟',
    requirement: { type: 'streak_days', value: 100 },
    xpReward: 2000,
    isUnlocked: false,
  },
  // Goal Achievements
  {
    id: 'goal-setter',
    name: 'Goal Setter',
    description: 'Complete your first goal',
    type: 'milestone',
    icon: '🎯',
    requirement: { type: 'goals_completed', value: 1 },
    xpReward: 100,
    isUnlocked: false,
  },
  {
    id: 'goal-crusher',
    name: 'Goal Crusher',
    description: 'Complete 5 goals',
    type: 'milestone',
    icon: '💥',
    requirement: { type: 'goals_completed', value: 5 },
    xpReward: 300,
    isUnlocked: false,
  },
  {
    id: 'goal-master',
    name: 'Goal Master',
    description: 'Complete 20 goals',
    type: 'milestone',
    icon: '🎖️',
    requirement: { type: 'goals_completed', value: 20 },
    xpReward: 750,
    isUnlocked: false,
  },
  // Level Achievements
  {
    id: 'level-5',
    name: 'Apprentice',
    description: 'Reach Level 5',
    type: 'mastery',
    icon: '📈',
    requirement: { type: 'level_reached', value: 5 },
    xpReward: 100,
    isUnlocked: false,
  },
  {
    id: 'level-10',
    name: 'Journeyman',
    description: 'Reach Level 10',
    type: 'mastery',
    icon: '📊',
    requirement: { type: 'level_reached', value: 10 },
    xpReward: 250,
    isUnlocked: false,
  },
  {
    id: 'level-25',
    name: 'Expert',
    description: 'Reach Level 25',
    type: 'mastery',
    icon: '🏅',
    requirement: { type: 'level_reached', value: 25 },
    xpReward: 500,
    isUnlocked: false,
  },
  {
    id: 'level-50',
    name: 'Grandmaster',
    description: 'Reach Level 50',
    type: 'mastery',
    icon: '👑',
    requirement: { type: 'level_reached', value: 50 },
    xpReward: 1000,
    isUnlocked: false,
  },
  // XP Achievements
  {
    id: 'xp-1000',
    name: 'XP Hunter',
    description: 'Earn 1,000 total XP',
    type: 'milestone',
    icon: '✨',
    requirement: { type: 'xp_earned', value: 1000 },
    xpReward: 100,
    isUnlocked: false,
  },
  {
    id: 'xp-5000',
    name: 'XP Collector',
    description: 'Earn 5,000 total XP',
    type: 'milestone',
    icon: '💎',
    requirement: { type: 'xp_earned', value: 5000 },
    xpReward: 250,
    isUnlocked: false,
  },
  {
    id: 'xp-10000',
    name: 'XP Legend',
    description: 'Earn 10,000 total XP',
    type: 'milestone',
    icon: '🌈',
    requirement: { type: 'xp_earned', value: 10000 },
    xpReward: 500,
    isUnlocked: false,
  },
];

const DEFAULT_USER_STATS: UserStats = {
  totalTasksCompleted: 0,
  totalXPEarned: 0,
  currentStreak: 0,
  longestStreak: 0,
  tasksCompletedByCategory: {
    Personal: 0,
    Financial: 0,
    Professional: 0,
  },
  goalsCompleted: 0,
  habitsTracked: 0,
};

interface GamificationContextType {
  skillTrees: SkillTree[];
  achievements: Achievement[];
  userStats: UserStats;
  recentUnlocks: Achievement[];
  
  // Actions
  addXPToSkill: (category: SkillCategory, xp: number) => void;
  recordTaskCompletion: (category: TaskCategory, xp: number) => void;
  recordGoalCompletion: () => void;
  recordHabitCompletion: (habitCategory: string, xp: number) => void;
  updateStreak: () => void;
  checkAndUnlockAchievements: () => Achievement[];
  clearRecentUnlocks: () => void;
  
  // Getters
  getTotalLevel: () => number;
  getTotalXP: () => number;
  getTitle: () => string;
  getSkillTree: (category: SkillCategory) => SkillTree | undefined;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getAchievementProgress: (achievement: Achievement) => number;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

const STORAGE_KEY_SKILLS = 'assisy_skill_trees';
const STORAGE_KEY_ACHIEVEMENTS = 'assisy_achievements';
const STORAGE_KEY_STATS = 'assisy_user_stats';

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SKILLS);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_SKILL_TREES;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ACHIEVEMENTS);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to add any new achievements
      const existingIds = new Set(parsed.map((a: Achievement) => a.id));
      const newAchievements = DEFAULT_ACHIEVEMENTS.filter(a => !existingIds.has(a.id));
      return [...parsed, ...newAchievements];
    }
    return DEFAULT_ACHIEVEMENTS;
  });

  const [userStats, setUserStats] = useState<UserStats>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_STATS);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_USER_STATS;
  });

  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SKILLS, JSON.stringify(skillTrees));
  }, [skillTrees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACHIEVEMENTS, JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(userStats));
  }, [userStats]);

  // Map task category to skill category
  const mapCategoryToSkill = (category: TaskCategory): SkillCategory => {
    switch (category) {
      case 'Personal':
        return 'productivity';
      case 'Financial':
        return 'financial';
      case 'Professional':
        return 'productivity';
      default:
        return 'productivity';
    }
  };

  // Add XP to a skill
  const addXPToSkill = useCallback((category: SkillCategory, xp: number) => {
    setSkillTrees(prev => prev.map(skill => {
      if (skill.id === category) {
        const newXP = skill.currentXP + xp;
        return {
          ...skill,
          currentXP: newXP,
          level: calculateLevel(newXP),
        };
      }
      return skill;
    }));
  }, []);

  // Record task completion
  const recordTaskCompletion = useCallback((category: TaskCategory, xp: number) => {
    // Update user stats
    setUserStats(prev => ({
      ...prev,
      totalTasksCompleted: prev.totalTasksCompleted + 1,
      totalXPEarned: prev.totalXPEarned + xp,
      tasksCompletedByCategory: {
        ...prev.tasksCompletedByCategory,
        [category]: prev.tasksCompletedByCategory[category] + 1,
      },
    }));

    // Add XP to relevant skill (only Personal/Financial earn XP)
    if (category !== 'Professional') {
      const skillCategory = mapCategoryToSkill(category);
      addXPToSkill(skillCategory, xp);
    }
  }, [addXPToSkill]);

  // Record goal completion
  const recordGoalCompletion = useCallback(() => {
    setUserStats(prev => ({
      ...prev,
      goalsCompleted: prev.goalsCompleted + 1,
    }));
  }, []);

  // Record habit completion
  const recordHabitCompletion = useCallback((habitCategory: string, xp: number) => {
    // Map habit category to skill
    let skillCategory: SkillCategory = 'mindfulness';
    if (habitCategory.toLowerCase().includes('exercise') || habitCategory.toLowerCase().includes('health')) {
      skillCategory = 'health';
    } else if (habitCategory.toLowerCase().includes('read') || habitCategory.toLowerCase().includes('learn')) {
      skillCategory = 'learning';
    } else if (habitCategory.toLowerCase().includes('meditat') || habitCategory.toLowerCase().includes('mindful')) {
      skillCategory = 'mindfulness';
    }

    addXPToSkill(skillCategory, xp);
    setUserStats(prev => ({
      ...prev,
      habitsTracked: prev.habitsTracked + 1,
      totalXPEarned: prev.totalXPEarned + xp,
    }));
  }, [addXPToSkill]);

  // Update streak
  const updateStreak = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = userStats.lastActiveDate;

    setUserStats(prev => {
      if (!lastActive) {
        // First activity
        return {
          ...prev,
          currentStreak: 1,
          longestStreak: Math.max(1, prev.longestStreak),
          lastActiveDate: today,
        };
      }

      const lastDate = new Date(lastActive);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, no change
        return prev;
      } else if (diffDays === 1) {
        // Consecutive day
        const newStreak = prev.currentStreak + 1;
        return {
          ...prev,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, prev.longestStreak),
          lastActiveDate: today,
        };
      } else {
        // Streak broken
        return {
          ...prev,
          currentStreak: 1,
          lastActiveDate: today,
        };
      }
    });
  }, [userStats.lastActiveDate]);

  // Get total level (sum of all skill levels)
  const getTotalLevel = useCallback(() => {
    const totalXP = skillTrees.reduce((sum, skill) => sum + skill.currentXP, 0);
    return calculateLevel(totalXP);
  }, [skillTrees]);

  // Get total XP
  const getTotalXP = useCallback(() => {
    return skillTrees.reduce((sum, skill) => sum + skill.currentXP, 0);
  }, [skillTrees]);

  // Get user title based on level
  const getTitle = useCallback(() => {
    const level = getTotalLevel();
    if (level >= 51) return 'Legendary Achiever';
    if (level >= 31) return 'Grand Taskmaster';
    if (level >= 21) return 'Taskmaster';
    if (level >= 11) return 'Task Warrior';
    if (level >= 6) return 'Task Apprentice';
    return 'Task Initiate';
  }, [getTotalLevel]);

  // Get a specific skill tree
  const getSkillTree = useCallback((category: SkillCategory) => {
    return skillTrees.find(s => s.id === category);
  }, [skillTrees]);

  // Get unlocked achievements
  const getUnlockedAchievements = useCallback(() => {
    return achievements.filter(a => a.isUnlocked);
  }, [achievements]);

  // Get locked achievements
  const getLockedAchievements = useCallback(() => {
    return achievements.filter(a => !a.isUnlocked);
  }, [achievements]);

  // Get achievement progress (0-100)
  const getAchievementProgress = useCallback((achievement: Achievement): number => {
    const req = achievement.requirement;
    let current = 0;
    let target = req.value;

    switch (req.type) {
      case 'tasks_completed':
        current = userStats.totalTasksCompleted;
        break;
      case 'streak_days':
        current = userStats.longestStreak;
        break;
      case 'goals_completed':
        current = userStats.goalsCompleted;
        break;
      case 'level_reached':
        current = getTotalLevel();
        break;
      case 'xp_earned':
        current = userStats.totalXPEarned;
        break;
      default:
        return 0;
    }

    return Math.min(100, Math.floor((current / target) * 100));
  }, [userStats, getTotalLevel]);

  // Check and unlock achievements
  const checkAndUnlockAchievements = useCallback((): Achievement[] => {
    const newUnlocks: Achievement[] = [];

    setAchievements(prev => prev.map(achievement => {
      if (achievement.isUnlocked) return achievement;

      const progress = getAchievementProgress(achievement);
      if (progress >= 100) {
        newUnlocks.push({
          ...achievement,
          isUnlocked: true,
          unlockedAt: new Date(),
        });
        return {
          ...achievement,
          isUnlocked: true,
          unlockedAt: new Date(),
        };
      }
      return achievement;
    }));

    if (newUnlocks.length > 0) {
      setRecentUnlocks(prev => [...prev, ...newUnlocks]);
      // Add achievement XP rewards
      newUnlocks.forEach(achievement => {
        addXPToSkill('productivity', achievement.xpReward);
      });
    }

    return newUnlocks;
  }, [getAchievementProgress, addXPToSkill]);

  // Clear recent unlocks (after showing notification)
  const clearRecentUnlocks = useCallback(() => {
    setRecentUnlocks([]);
  }, []);

  return (
    <GamificationContext.Provider
      value={{
        skillTrees,
        achievements,
        userStats,
        recentUnlocks,
        addXPToSkill,
        recordTaskCompletion,
        recordGoalCompletion,
        recordHabitCompletion,
        updateStreak,
        checkAndUnlockAchievements,
        clearRecentUnlocks,
        getTotalLevel,
        getTotalXP,
        getTitle,
        getSkillTree,
        getUnlockedAchievements,
        getLockedAchievements,
        getAchievementProgress,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}
