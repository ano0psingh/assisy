export type TaskCategory = 'Personal' | 'Financial' | 'Professional';
export type Priority = 'High' | 'Low';
export type Effort = 'High' | 'Low';
export type TaskStatus = 'Pending' | 'Completed' | 'Carried Forward';
export type RecurrencePattern = 'daily' | 'weekly' | 'specific_days' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: Priority;
  effort: Effort;
  status: TaskStatus;
  goalId?: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  specificDays?: number[];
  monthDay?: number;
  createdAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  xpValue: number;
  isFocusedToday?: boolean;
  focusedDate?: string; // YYYY-MM-DD
  pausedUntil?: string; // YYYY-MM-DD — recurring task paused until this date
  skippedDates?: string[]; // YYYY-MM-DD — specific dates to skip for recurring tasks
}

export type GoalStatus = 'Active' | 'Completed' | 'Archived';

export type GoalTheme = 'forest' | 'mountain' | 'ocean' | 'space' | 'garden';

export interface GoalMilestone {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: Date;
  xpReward: number;
  order: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: GoalStatus;
  linkedTaskIds: string[];
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  parentGoalId?: string;
  subGoalIds?: string[];
  level: number;
  totalXP: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  milestones: GoalMilestone[];
  theme?: GoalTheme;
}

export interface DailyLog {
  id: string;
  date: Date;
  energyLevel?: number;
  wins?: string;
  challenges?: string;
  learnings?: string;
  tomorrowFocus?: string;
  sentimentScore?: number; // 1-10, AI-generated mood score
  habits: {
    meditation?: number;
    reading?: number;
    exercise?: number;
    waterIntake?: number;
    [key: string]: number | undefined;
  };
}

export type TrackingType = 'duration' | 'count' | 'boolean';

export interface Habit {
  id: string;
  name: string;
  trackingType: TrackingType;
  category: string;
  streakCount: number;
  lastCompletedDate?: Date;
  xpPerUnit: number;
  dailyTarget?: number; // e.g. 8 glasses, 30 min — undefined means "any > 0"
  reminderTime?: string; // HH:MM format for notification, e.g. "07:00"
}

// ============ Metrics Types ============

export interface MetricEntry {
  id: string;
  date: string; // YYYY-MM-DD
  metricType: string; // e.g. "Weight", "Body Fat %", "Waist", "Sleep Hours"
  value: number;
  unit: string; // e.g. "kg", "%", "cm", "hrs"
  note?: string;
}

// ============ Project Management Types ============

export type ProjectStatus = 'Active' | 'Completed' | 'On Hold';
export type WorkItemStatus = 'Backlog' | 'In Progress' | 'Done';

export interface Project {
  id: string;
  title: string;
  description?: string; // For ideas/notes
  status: ProjectStatus;
  color: string; // Visual identifier (hex color)
  tags: string[];
  subProjectIds: string[];
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

export interface SubProject {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  tags: string[];
  taskIds: string[];
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  projectId: string;
  subProjectId: string;
  parentTaskId?: string; // For sub-tasks
  subTaskIds: string[];
  tags: string[];
  priority: 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
  timeSpent?: number; // In minutes, optional
  isFocusedToday?: boolean; // For daily dashboard integration
  focusedDate?: string; // Date when focused (YYYY-MM-DD)
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  deadline?: Date;
}

// ============ Gamification Types ============

export type SkillCategory = 'health' | 'learning' | 'financial' | 'productivity' | 'mindfulness';

export interface SkillTree {
  id: SkillCategory;
  name: string;
  icon: string; // emoji
  description: string;
  currentXP: number;
  level: number;
  color: string; // hex color for theming
}

export type AchievementType = 'milestone' | 'streak' | 'mastery' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  icon: string; // emoji or icon name
  requirement: {
    type: 'tasks_completed' | 'streak_days' | 'habit_streak' | 'level_reached' | 'xp_earned' | 'goals_completed' | 
          'login_streak' | 'days_active' | 'days_planned' | 'tasks_created' | 'tasks_added_today' | 
          'productive_days' | 'perfect_days' | 'early_bird' | 'night_owl' | 'tasks_in_day' | 'early_tasks' | 'late_tasks' | 'custom';
    value: number;
    current?: number;
    category?: SkillCategory | TaskCategory;
    habitId?: string;
  };
  xpReward: number;
  unlockedAt?: Date;
  isUnlocked: boolean;
}

export interface UserStats {
  totalTasksCompleted: number;
  totalXPEarned: number;
  currentStreak: number; // consecutive days with task completion
  longestStreak: number;
  tasksCompletedByCategory: {
    Personal: number;
    Financial: number;
    Professional: number;
  };
  goalsCompleted: number;
  habitsTracked: number;
  lastActiveDate?: string; // YYYY-MM-DD
  
  // Daily Engagement Stats
  totalDaysActive: number;
  totalTasksCreated: number;
  totalDaysPlanned: number; // Days where Plan Your Day was used
  tasksAddedToToday: number; // Total tasks added to Today's list
  dailyLoginStreak: number; // Consecutive days opened the app
  longestLoginStreak: number;
  lastLoginDate?: string; // YYYY-MM-DD
  todayTasksCompleted: number; // Tasks completed today
  lastTaskCompletedDate?: string; // YYYY-MM-DD for daily reset
  
  // Productivity Stats
  productiveDays: number; // Days with 5+ tasks completed
  perfectDays: number; // Days with 100% today's tasks completed
  earlyBirdCount: number; // Tasks completed before 9 AM
  nightOwlCount: number; // Tasks completed after 9 PM
}

// Daily Reward Configuration
export interface DailyReward {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  icon: string;
  type: 'login' | 'planning' | 'task_add' | 'task_complete' | 'streak_bonus';
}