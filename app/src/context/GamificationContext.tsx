import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { SkillTree, SkillCategory, Achievement, UserStats, TaskCategory, DailyReward } from '../types';

// XP required for each level (cumulative)
const XP_PER_LEVEL = 100;

// Calculate level from XP
const calculateLevel = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;

// ============ DAILY REWARD CONFIGURATION ============
// Industry-standard rewards based on Duolingo, Habitica, etc.
const DAILY_REWARDS: DailyReward[] = [
  { id: 'daily-login', name: 'Daily Visit', description: 'Open the app', xpReward: 10, icon: '🌅', type: 'login' },
  { id: 'plan-day', name: 'Day Planner', description: 'Plan your day', xpReward: 15, icon: '📋', type: 'planning' },
  { id: 'add-task', name: 'Task Added', description: 'Add a task to Today', xpReward: 5, icon: '➕', type: 'task_add' },
  { id: 'complete-task', name: 'Task Done', description: 'Complete a task', xpReward: 10, icon: '✅', type: 'task_complete' },
];

// Streak multipliers (like Duolingo)
const getStreakMultiplier = (streak: number): number => {
  if (streak >= 30) return 2.0;  // 2x after 30 days
  if (streak >= 14) return 1.5;  // 1.5x after 14 days
  if (streak >= 7) return 1.25;  // 1.25x after 7 days
  if (streak >= 3) return 1.1;   // 1.1x after 3 days
  return 1.0;
};

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

// Default achievements - includes engagement achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  // ============ TASK MILESTONE ACHIEVEMENTS ============
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
  
  // ============ LOGIN STREAK ACHIEVEMENTS ============
  {
    id: 'welcome-back',
    name: 'Welcome Back',
    description: 'Visit 3 days in a row',
    type: 'streak',
    icon: '👋',
    requirement: { type: 'login_streak', value: 3 },
    xpReward: 50,
    isUnlocked: false,
  },
  {
    id: 'weekly-warrior',
    name: 'Weekly Warrior',
    description: '7-day login streak',
    type: 'streak',
    icon: '🔥',
    requirement: { type: 'login_streak', value: 7 },
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'fortnight-fighter',
    name: 'Fortnight Fighter',
    description: '14-day login streak',
    type: 'streak',
    icon: '💪',
    requirement: { type: 'login_streak', value: 14 },
    xpReward: 300,
    isUnlocked: false,
  },
  {
    id: 'monthly-master',
    name: 'Monthly Master',
    description: '30-day login streak',
    type: 'streak',
    icon: '🏆',
    requirement: { type: 'login_streak', value: 30 },
    xpReward: 500,
    isUnlocked: false,
  },
  {
    id: 'legendary-dedication',
    name: 'Legendary Dedication',
    description: '100-day login streak',
    type: 'streak',
    icon: '🌟',
    requirement: { type: 'login_streak', value: 100 },
    xpReward: 2000,
    isUnlocked: false,
  },
  
  // ============ TASK STREAK ACHIEVEMENTS ============
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
    icon: '⚡',
    requirement: { type: 'streak_days', value: 14 },
    xpReward: 300,
    isUnlocked: false,
  },
  {
    id: 'month-warrior',
    name: 'Month Warrior',
    description: '30-day task streak',
    type: 'streak',
    icon: '🎖️',
    requirement: { type: 'streak_days', value: 30 },
    xpReward: 500,
    isUnlocked: false,
  },
  
  // ============ PLANNING ACHIEVEMENTS ============
  {
    id: 'day-planner',
    name: 'Day Planner',
    description: 'Plan your day once',
    type: 'milestone',
    icon: '📋',
    requirement: { type: 'days_planned', value: 1 },
    xpReward: 25,
    isUnlocked: false,
  },
  {
    id: 'organized-mind',
    name: 'Organized Mind',
    description: 'Plan your day 7 times',
    type: 'milestone',
    icon: '🗓️',
    requirement: { type: 'days_planned', value: 7 },
    xpReward: 100,
    isUnlocked: false,
  },
  {
    id: 'master-planner',
    name: 'Master Planner',
    description: 'Plan your day 30 times',
    type: 'milestone',
    icon: '📊',
    requirement: { type: 'days_planned', value: 30 },
    xpReward: 300,
    isUnlocked: false,
  },
  
  // ============ TASK CREATION ACHIEVEMENTS ============
  {
    id: 'creator',
    name: 'Creator',
    description: 'Create 10 tasks',
    type: 'milestone',
    icon: '✏️',
    requirement: { type: 'tasks_created', value: 10 },
    xpReward: 50,
    isUnlocked: false,
  },
  {
    id: 'task-architect',
    name: 'Task Architect',
    description: 'Create 50 tasks',
    type: 'milestone',
    icon: '🏗️',
    requirement: { type: 'tasks_created', value: 50 },
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'prolific-planner',
    name: 'Prolific Planner',
    description: 'Create 200 tasks',
    type: 'milestone',
    icon: '📝',
    requirement: { type: 'tasks_created', value: 200 },
    xpReward: 400,
    isUnlocked: false,
  },
  
  // ============ TODAY'S LIST ACHIEVEMENTS ============
  {
    id: 'focus-mode',
    name: 'Focus Mode',
    description: 'Add 5 tasks to Today',
    type: 'milestone',
    icon: '🎯',
    requirement: { type: 'tasks_added_today', value: 5 },
    xpReward: 50,
    isUnlocked: false,
  },
  {
    id: 'daily-driver',
    name: 'Daily Driver',
    description: 'Add 25 tasks to Today',
    type: 'milestone',
    icon: '🚗',
    requirement: { type: 'tasks_added_today', value: 25 },
    xpReward: 150,
    isUnlocked: false,
  },
  {
    id: 'focus-champion',
    name: 'Focus Champion',
    description: 'Add 100 tasks to Today',
    type: 'milestone',
    icon: '🏅',
    requirement: { type: 'tasks_added_today', value: 100 },
    xpReward: 400,
    isUnlocked: false,
  },
  
  // ============ PRODUCTIVITY ACHIEVEMENTS ============
  {
    id: 'productive-day',
    name: 'Productive Day',
    description: 'Complete 5+ tasks in a day',
    type: 'special',
    icon: '💫',
    requirement: { type: 'productive_days', value: 1 },
    xpReward: 75,
    isUnlocked: false,
  },
  {
    id: 'productivity-streak',
    name: 'Productivity Streak',
    description: 'Have 5 productive days',
    type: 'special',
    icon: '🌊',
    requirement: { type: 'productive_days', value: 5 },
    xpReward: 200,
    isUnlocked: false,
  },
  {
    id: 'productivity-machine',
    name: 'Productivity Machine',
    description: 'Have 20 productive days',
    type: 'special',
    icon: '⚙️',
    requirement: { type: 'productive_days', value: 20 },
    xpReward: 500,
    isUnlocked: false,
  },
  
  // ============ PERFECT DAY ACHIEVEMENTS ============
  {
    id: 'perfect-day',
    name: 'Perfect Day',
    description: 'Complete all Today tasks',
    type: 'special',
    icon: '💯',
    requirement: { type: 'perfect_days', value: 1 },
    xpReward: 100,
    isUnlocked: false,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: '5 perfect days',
    type: 'special',
    icon: '✨',
    requirement: { type: 'perfect_days', value: 5 },
    xpReward: 300,
    isUnlocked: false,
  },
  {
    id: 'flawless-execution',
    name: 'Flawless Execution',
    description: '20 perfect days',
    type: 'special',
    icon: '💎',
    requirement: { type: 'perfect_days', value: 20 },
    xpReward: 750,
    isUnlocked: false,
  },
  
  // ============ TIME-BASED ACHIEVEMENTS ============
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete a task before 9 AM',
    type: 'special',
    icon: '🐦',
    requirement: { type: 'early_bird', value: 1 },
    xpReward: 50,
    isUnlocked: false,
  },
  {
    id: 'sunrise-champion',
    name: 'Sunrise Champion',
    description: 'Complete 10 tasks before 9 AM',
    type: 'special',
    icon: '🌅',
    requirement: { type: 'early_bird', value: 10 },
    xpReward: 200,
    isUnlocked: false,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete a task after 9 PM',
    type: 'special',
    icon: '🦉',
    requirement: { type: 'night_owl', value: 1 },
    xpReward: 50,
    isUnlocked: false,
  },
  {
    id: 'midnight-warrior',
    name: 'Midnight Warrior',
    description: 'Complete 10 tasks after 9 PM',
    type: 'special',
    icon: '🌙',
    requirement: { type: 'night_owl', value: 10 },
    xpReward: 200,
    isUnlocked: false,
  },
  
  // ============ GOAL ACHIEVEMENTS ============
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
    icon: '🏆',
    requirement: { type: 'goals_completed', value: 20 },
    xpReward: 750,
    isUnlocked: false,
  },
  
  // ============ LEVEL ACHIEVEMENTS ============
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
  
  // ============ XP ACHIEVEMENTS ============
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
  
  // ============ ACTIVE DAYS ACHIEVEMENTS ============
  {
    id: 'regular',
    name: 'Regular',
    description: 'Active for 7 days total',
    type: 'milestone',
    icon: '📆',
    requirement: { type: 'days_active', value: 7 },
    xpReward: 75,
    isUnlocked: false,
  },
  {
    id: 'committed',
    name: 'Committed',
    description: 'Active for 30 days total',
    type: 'milestone',
    icon: '🗓️',
    requirement: { type: 'days_active', value: 30 },
    xpReward: 200,
    isUnlocked: false,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Active for 100 days total',
    type: 'milestone',
    icon: '🎗️',
    requirement: { type: 'days_active', value: 100 },
    xpReward: 500,
    isUnlocked: false,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Active for 365 days total',
    type: 'milestone',
    icon: '🏅',
    requirement: { type: 'days_active', value: 365 },
    xpReward: 2000,
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
  // New engagement stats
  totalDaysActive: 0,
  totalTasksCreated: 0,
  totalDaysPlanned: 0,
  tasksAddedToToday: 0,
  dailyLoginStreak: 0,
  longestLoginStreak: 0,
  todayTasksCompleted: 0,
  productiveDays: 0,
  perfectDays: 0,
  earlyBirdCount: 0,
  nightOwlCount: 0,
};

interface DailyBonusResult {
  xpEarned: number;
  isNewDay: boolean;
  streakMultiplier: number;
  rewards: DailyReward[];
}

interface GamificationContextType {
  skillTrees: SkillTree[];
  achievements: Achievement[];
  userStats: UserStats;
  recentUnlocks: Achievement[];
  dailyRewards: DailyReward[];
  
  // Actions
  addXPToSkill: (category: SkillCategory, xp: number) => void;
  recordTaskCompletion: (category: TaskCategory, xp: number) => void;
  recordGoalCompletion: () => void;
  recordHabitCompletion: (habitCategory: string, xp: number) => void;
  updateStreak: () => void;
  checkAndUnlockAchievements: () => Achievement[];
  clearRecentUnlocks: () => void;
  
  // NEW: Daily Engagement Actions
  recordDailyLogin: () => DailyBonusResult;
  recordDayPlanned: () => number; // Returns XP earned
  recordTaskCreated: () => number;
  recordTaskAddedToToday: () => number;
  recordPerfectDay: () => void;
  getStreakMultiplier: () => number;
  
  // Getters
  getTotalLevel: () => number;
  getTotalXP: () => number;
  getTitle: () => string;
  getSkillTree: (category: SkillCategory) => SkillTree | undefined;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getAchievementProgress: (achievement: Achievement) => number;
  hasClaimedDailyLogin: () => boolean;
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
      const parsed = JSON.parse(stored);
      // Merge with defaults to add new stats fields
      return { ...DEFAULT_USER_STATS, ...parsed };
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

  // Get today's date string
  const getTodayStr = useCallback(() => new Date().toISOString().split('T')[0], []);

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

  // Get current streak multiplier
  const getCurrentStreakMultiplier = useCallback(() => {
    return getStreakMultiplier(userStats.dailyLoginStreak);
  }, [userStats.dailyLoginStreak]);

  // Check if already claimed daily login today
  const hasClaimedDailyLogin = useCallback(() => {
    return userStats.lastLoginDate === getTodayStr();
  }, [userStats.lastLoginDate, getTodayStr]);

  // Record daily login - gives XP bonus
  const recordDailyLogin = useCallback((): DailyBonusResult => {
    const today = getTodayStr();
    const lastLogin = userStats.lastLoginDate;
    
    // Already logged in today
    if (lastLogin === today) {
      return {
        xpEarned: 0,
        isNewDay: false,
        streakMultiplier: getCurrentStreakMultiplier(),
        rewards: [],
      };
    }

    // Calculate login streak
    let newLoginStreak = 1;
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newLoginStreak = userStats.dailyLoginStreak + 1;
      }
    }

    const streakMultiplier = getStreakMultiplier(newLoginStreak);
    const baseXP = DAILY_REWARDS.find(r => r.type === 'login')?.xpReward || 10;
    const xpEarned = Math.round(baseXP * streakMultiplier);

    // Update stats
    setUserStats(prev => ({
      ...prev,
      lastLoginDate: today,
      dailyLoginStreak: newLoginStreak,
      longestLoginStreak: Math.max(newLoginStreak, prev.longestLoginStreak),
      totalDaysActive: prev.totalDaysActive + 1,
      totalXPEarned: prev.totalXPEarned + xpEarned,
      todayTasksCompleted: 0, // Reset daily counter
      lastTaskCompletedDate: today,
    }));

    // Add XP to productivity skill
    addXPToSkill('productivity', xpEarned);

    return {
      xpEarned,
      isNewDay: true,
      streakMultiplier,
      rewards: [DAILY_REWARDS.find(r => r.type === 'login')!],
    };
  }, [userStats.lastLoginDate, userStats.dailyLoginStreak, getTodayStr, getCurrentStreakMultiplier, addXPToSkill]);

  // Record day planned (Plan Your Day modal used)
  const recordDayPlanned = useCallback((): number => {
    const baseXP = DAILY_REWARDS.find(r => r.type === 'planning')?.xpReward || 15;
    const xpEarned = Math.round(baseXP * getCurrentStreakMultiplier());

    setUserStats(prev => ({
      ...prev,
      totalDaysPlanned: prev.totalDaysPlanned + 1,
      totalXPEarned: prev.totalXPEarned + xpEarned,
    }));

    addXPToSkill('productivity', xpEarned);
    return xpEarned;
  }, [getCurrentStreakMultiplier, addXPToSkill]);

  // Record task created
  const recordTaskCreated = useCallback((): number => {
    const xpEarned = 2; // Small XP for creating tasks

    setUserStats(prev => ({
      ...prev,
      totalTasksCreated: prev.totalTasksCreated + 1,
      totalXPEarned: prev.totalXPEarned + xpEarned,
    }));

    addXPToSkill('productivity', xpEarned);
    return xpEarned;
  }, [addXPToSkill]);

  // Record task added to Today's list
  const recordTaskAddedToToday = useCallback((): number => {
    const baseXP = DAILY_REWARDS.find(r => r.type === 'task_add')?.xpReward || 5;
    const xpEarned = Math.round(baseXP * getCurrentStreakMultiplier());

    setUserStats(prev => ({
      ...prev,
      tasksAddedToToday: prev.tasksAddedToToday + 1,
      totalXPEarned: prev.totalXPEarned + xpEarned,
    }));

    addXPToSkill('productivity', xpEarned);
    return xpEarned;
  }, [getCurrentStreakMultiplier, addXPToSkill]);

  // Record perfect day (all today's tasks completed)
  const recordPerfectDay = useCallback(() => {
    setUserStats(prev => ({
      ...prev,
      perfectDays: prev.perfectDays + 1,
    }));
  }, []);

  // Record task completion
  const recordTaskCompletion = useCallback((category: TaskCategory, xp: number) => {
    const hour = new Date().getHours();
    const isEarlyBird = hour < 9;
    const isNightOwl = hour >= 21;
    const today = getTodayStr();

    setUserStats(prev => {
      const isNewDay = prev.lastTaskCompletedDate !== today;
      const newTodayTasksCompleted = isNewDay ? 1 : prev.todayTasksCompleted + 1;
      const isProductiveDay = newTodayTasksCompleted >= 5;
      
      return {
        ...prev,
        totalTasksCompleted: prev.totalTasksCompleted + 1,
        totalXPEarned: prev.totalXPEarned + xp,
        tasksCompletedByCategory: {
          ...prev.tasksCompletedByCategory,
          [category]: prev.tasksCompletedByCategory[category] + 1,
        },
        todayTasksCompleted: newTodayTasksCompleted,
        lastTaskCompletedDate: today,
        productiveDays: isProductiveDay && newTodayTasksCompleted === 5 
          ? prev.productiveDays + 1 
          : prev.productiveDays,
        earlyBirdCount: isEarlyBird ? prev.earlyBirdCount + 1 : prev.earlyBirdCount,
        nightOwlCount: isNightOwl ? prev.nightOwlCount + 1 : prev.nightOwlCount,
      };
    });

    // Add XP to relevant skill (only Personal/Financial earn skill XP)
    if (category !== 'Professional') {
      const skillCategory = mapCategoryToSkill(category);
      addXPToSkill(skillCategory, xp);
    }
  }, [addXPToSkill, getTodayStr]);

  // Record goal completion
  const recordGoalCompletion = useCallback(() => {
    setUserStats(prev => ({
      ...prev,
      goalsCompleted: prev.goalsCompleted + 1,
    }));
  }, []);

  // Record habit completion
  const recordHabitCompletion = useCallback((habitCategory: string, xp: number) => {
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
    const today = getTodayStr();
    const lastActive = userStats.lastActiveDate;

    setUserStats(prev => {
      if (!lastActive) {
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
        return prev;
      } else if (diffDays === 1) {
        const newStreak = prev.currentStreak + 1;
        return {
          ...prev,
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, prev.longestStreak),
          lastActiveDate: today,
        };
      } else {
        return {
          ...prev,
          currentStreak: 1,
          lastActiveDate: today,
        };
      }
    });
  }, [userStats.lastActiveDate, getTodayStr]);

  // Get total level
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
    const target = req.value;

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
      case 'login_streak':
        current = userStats.longestLoginStreak;
        break;
      case 'days_active':
        current = userStats.totalDaysActive;
        break;
      case 'days_planned':
        current = userStats.totalDaysPlanned;
        break;
      case 'tasks_created':
        current = userStats.totalTasksCreated;
        break;
      case 'tasks_added_today':
        current = userStats.tasksAddedToToday;
        break;
      case 'productive_days':
        current = userStats.productiveDays;
        break;
      case 'perfect_days':
        current = userStats.perfectDays;
        break;
      case 'early_bird':
        current = userStats.earlyBirdCount;
        break;
      case 'night_owl':
        current = userStats.nightOwlCount;
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

  // Clear recent unlocks
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
        dailyRewards: DAILY_REWARDS,
        addXPToSkill,
        recordTaskCompletion,
        recordGoalCompletion,
        recordHabitCompletion,
        updateStreak,
        checkAndUnlockAchievements,
        clearRecentUnlocks,
        recordDailyLogin,
        recordDayPlanned,
        recordTaskCreated,
        recordTaskAddedToToday,
        recordPerfectDay,
        getStreakMultiplier: getCurrentStreakMultiplier,
        getTotalLevel,
        getTotalXP,
        getTitle,
        getSkillTree,
        getUnlockedAchievements,
        getLockedAchievements,
        getAchievementProgress,
        hasClaimedDailyLogin,
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
