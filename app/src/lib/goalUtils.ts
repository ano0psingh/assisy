import type { Goal, GoalHealthCheckIn, GoalHealthStatus, GoalMilestone } from '../types';
import { getLocalDateString, normalizeLocalDateString, parseLocalDate } from './dateUtils';

export function migrateGoalFields(goal: Goal): Goal {
  const targetDate = normalizeLocalDateString(goal.targetDate);
  const milestones = (goal.milestones ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((milestone, order) => ({ ...milestone, order }));

  return {
    ...goal,
    priority: goal.priority ?? 'Medium',
    nextAction: goal.nextAction ?? undefined,
    targetDate,
    healthCheckIns: goal.healthCheckIns ?? [],
    milestones,
  };
}

export function reorderMilestones(
  milestones: GoalMilestone[],
  milestoneId: string,
  direction: 'up' | 'down',
): GoalMilestone[] {
  const ordered = milestones.slice().sort((a, b) => a.order - b.order);
  const index = ordered.findIndex(milestone => milestone.id === milestoneId);
  const destination = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || destination < 0 || destination >= ordered.length) {
    return ordered.map((milestone, order) => ({ ...milestone, order }));
  }
  [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
  return ordered.map((milestone, order) => ({ ...milestone, order }));
}

export function addGoalHealthCheckIn(
  history: GoalHealthCheckIn[],
  status: GoalHealthStatus,
  note: string,
  createdAt: Date,
  id: string,
): GoalHealthCheckIn[] {
  return [...history, {
    id,
    status,
    note: note.trim() || undefined,
    createdAt,
  }];
}

export function getMilestoneProgress(goal: Pick<Goal, 'milestones'>): number {
  if (goal.milestones.length === 0) return 0;
  return Math.round(
    (goal.milestones.filter(milestone => milestone.isCompleted).length / goal.milestones.length) * 100,
  );
}

export function isGoalOverdue(
  goal: Pick<Goal, 'targetDate' | 'status'>,
  today = getLocalDateString(),
): boolean {
  return goal.status === 'Active'
    && Boolean(parseLocalDate(goal.targetDate))
    && goal.targetDate! < today;
}

export function formatGoalTargetDate(value: string): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** Pure hierarchy restoration used by GoalContext and deterministic checks. */
export function restoreGoalHierarchy(current: Goal[], removed: Goal[]): Goal[] {
  const existing = new Set(current.map(goal => goal.id));
  const inserted = removed.filter(goal => !existing.has(goal.id));
  const combined = [...current, ...inserted];
  return combined.map(goal => {
    const childIds = combined
      .filter(candidate => candidate.parentGoalId === goal.id)
      .map(candidate => candidate.id);
    if (childIds.length === 0) return goal;
    return { ...goal, subGoalIds: Array.from(new Set([...(goal.subGoalIds ?? []), ...childIds])) };
  });
}
