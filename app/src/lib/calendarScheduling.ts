import {
  getScheduledDate,
  getScheduledEndMinute,
  getScheduledStartMinute,
  normalizeDurationMinutes,
  type SchedulableTask,
} from './dateUtils';

export interface CalendarBlock extends SchedulableTask {
  id: string;
  title?: string;
}

export interface CollisionResult {
  valid: boolean;
  collisions: CalendarBlock[];
}

export function validateSchedule(
  candidate: CalendarBlock,
  existing: CalendarBlock[],
): CollisionResult {
  const date = getScheduledDate(candidate);
  const start = getScheduledStartMinute(candidate);
  const end = getScheduledEndMinute(candidate);
  if (!date || start === null || end === null) return { valid: true, collisions: [] };
  const collisions = existing.filter(block => {
    if (block.id === candidate.id || getScheduledDate(block) !== date) return false;
    const otherStart = getScheduledStartMinute(block);
    const otherEnd = getScheduledEndMinute(block);
    return otherStart !== null && otherEnd !== null && start < otherEnd && otherStart < end;
  });
  return { valid: collisions.length === 0, collisions };
}

export function findNextFreeSlot(
  existing: CalendarBlock[],
  date: string,
  durationMinutes: number,
  notBefore = 6 * 60,
  notAfter = 22 * 60,
  stepMinutes = 15,
  excludeId?: string,
): number | null {
  const duration = normalizeDurationMinutes(durationMinutes, 30);
  for (let minute = Math.max(0, notBefore); minute + duration <= Math.min(1440, notAfter); minute += stepMinutes) {
    const candidate: CalendarBlock = {
      id: excludeId ?? '__candidate__',
      scheduledDate: date,
      scheduledTime: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
      durationMinutes: duration,
    };
    if (validateSchedule(candidate, existing).valid) return minute;
  }
  return null;
}

export interface LaneLayout {
  id: string;
  lane: number;
  laneCount: number;
  conflicted: boolean;
}

/** Deterministic interval partitioning for side-by-side calendar blocks. */
export function layoutOverlapLanes(blocks: CalendarBlock[]): LaneLayout[] {
  const sorted = blocks
    .map(block => ({
      block,
      start: getScheduledStartMinute(block),
      end: getScheduledEndMinute(block),
    }))
    .filter((row): row is { block: CalendarBlock; start: number; end: number } =>
      row.start !== null && row.end !== null
    )
    .sort((a, b) => a.start - b.start || a.end - b.end || a.block.id.localeCompare(b.block.id));

  const result: LaneLayout[] = [];
  let index = 0;
  while (index < sorted.length) {
    const component = [sorted[index]];
    let componentEnd = sorted[index].end;
    let cursor = index + 1;
    while (cursor < sorted.length && sorted[cursor].start < componentEnd) {
      component.push(sorted[cursor]);
      componentEnd = Math.max(componentEnd, sorted[cursor].end);
      cursor++;
    }

    const laneEnds: number[] = [];
    const assignments = component.map(row => {
      let lane = laneEnds.findIndex(end => end <= row.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = row.end;
      return { id: row.block.id, lane };
    });
    const laneCount = laneEnds.length;
    result.push(...assignments.map(item => ({
      ...item,
      laneCount,
      conflicted: laneCount > 1,
    })));
    index = cursor;
  }
  return result;
}
