export type TaskCategory = 'Personal' | 'Financial' | 'Professional';
export type Priority = 'High' | 'Low';
export type Effort = 'High' | 'Low';
export type TaskStatus = 'Pending' | 'Completed' | 'Carried Forward';
export type RecurrencePattern = 'daily' | 'weekly' | 'specific_days';

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
  createdAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  xpValue: number;
  isFocusedToday?: boolean; // Manually added to Today's Tasks
  focusedDate?: string; // Date when task was focused (YYYY-MM-DD)
}

export type GoalStatus = 'Active' | 'Completed' | 'Archived';

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
}

export interface DailyLog {
  id: string;
  date: Date;
  energyLevel?: number;
  wins?: string;
  challenges?: string;
  learnings?: string;
  tomorrowFocus?: string;
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
}