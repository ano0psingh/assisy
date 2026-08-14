/**
 * Reconciling local and cloud copies of the same data.
 *
 * The previous behaviour was to let the cloud win outright: if the cloud row
 * existed at all, the local copy was never read. Combined with a cloud write
 * that could fail to land when the tab closed, that silently destroyed work —
 * local held the newer data and it was replaced by a stale cloud copy.
 *
 * The rules below are deliberately biased towards never losing an entity. When
 * the two sides disagree we would rather keep something the user has to delete
 * again than drop something they cannot get back.
 */

export interface Tombstone {
  /** When the entity was deleted locally, ISO 8601. */
  deletedAt: string;
}

export type TombstoneMap = Record<string, Tombstone>;

interface Entity {
  id: string;
  updatedAt?: string | Date;
  createdAt?: string | Date;
}

const EPOCH = '';

/**
 * Best available modification time, as a comparable ISO string.
 *
 * Entities stored before timestamps were maintained have no `updatedAt`, so they
 * fall back to `createdAt` and finally to the empty string, which sorts before
 * any real ISO timestamp. Values arrive as strings from JSON but the Project
 * types declare them as `Date`, so both are handled.
 */
function modifiedAt(entity: Entity): string {
  return toIso(entity.updatedAt) || toIso(entity.createdAt) || EPOCH;
}

function toIso(value: string | Date | undefined): string {
  if (!value) return EPOCH;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? EPOCH : value.toISOString();
  return typeof value === 'string' ? value : EPOCH;
}

/**
 * Resolve two versions of the same entity.
 *
 * With timestamps on both sides the newer one wins. When only one side carries a
 * timestamp, that side wins: stamps are only written on modification, so a
 * stamped copy has been touched more recently than an unstamped one. With no
 * timestamps at all we fall back to whether this device has unsynced writes.
 */
function pickNewer<T extends Entity>(local: T, cloud: T, localIsDirty: boolean): T {
  const localTime = modifiedAt(local);
  const cloudTime = modifiedAt(cloud);
  if (localTime && cloudTime) return localTime >= cloudTime ? local : cloud;
  if (localTime) return local;
  if (cloudTime) return cloud;
  return localIsDirty ? local : cloud;
}

/**
 * Union both sides by id, then apply deletions.
 *
 * A deletion only wins if it happened after the surviving copy was last
 * modified; otherwise the entity was edited on another device after this one
 * deleted it, and the edit is the more recent intent.
 */
export function mergeEntities<T extends Entity>(
  local: T[],
  cloud: T[],
  tombstones: TombstoneMap = {},
  localIsDirty = false,
): T[] {
  const byId = new Map<string, T>();

  for (const entity of cloud) {
    if (entity?.id) byId.set(entity.id, entity);
  }
  for (const entity of local) {
    if (!entity?.id) continue;
    const existing = byId.get(entity.id);
    byId.set(entity.id, existing ? pickNewer(entity, existing, localIsDirty) : entity);
  }

  for (const [id, tombstone] of Object.entries(tombstones)) {
    const survivor = byId.get(id);
    if (!survivor) continue;
    if (modifiedAt(survivor) <= tombstone.deletedAt) byId.delete(id);
  }

  return Array.from(byId.values());
}

interface DatedLog {
  date: string;
}

/**
 * Merge `Record<habitId, HabitLog[]>`.
 *
 * Logs have no timestamp beyond the day they describe, so a day present on both
 * sides is resolved by which side has unsynced writes. Union first: dropping a
 * logged day breaks a streak, which is the thing the app exists to protect.
 */
export function mergeLogMaps<T extends DatedLog>(
  local: Record<string, T[]>,
  cloud: Record<string, T[]>,
  localIsDirty = false,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  const habitIds = new Set([...Object.keys(cloud ?? {}), ...Object.keys(local ?? {})]);

  for (const habitId of habitIds) {
    const byDate = new Map<string, T>();
    const preferred = localIsDirty ? cloud?.[habitId] : local?.[habitId];
    const winner = localIsDirty ? local?.[habitId] : cloud?.[habitId];
    for (const log of preferred ?? []) {
      if (log?.date) byDate.set(log.date, log);
    }
    for (const log of winner ?? []) {
      if (log?.date) byDate.set(log.date, log);
    }
    result[habitId] = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  return result;
}

interface SkillTree {
  id: string;
  currentXP?: number;
  [key: string]: unknown;
}

interface Achievement {
  id: string;
  isUnlocked?: boolean;
  unlockedAt?: string;
  [key: string]: unknown;
}

/**
 * Merge gamification state by taking the furthest progress on each side.
 *
 * This replaces an all-or-nothing guard that compared a single `totalXPEarned`
 * field and discarded the entire losing side. XP, unlocks and lifetime counters
 * only ever go up, so the maximum is the correct reconciliation and it cannot
 * lose an achievement earned on another device.
 */
export function mergeGamification(
  local: Record<string, unknown> | undefined,
  cloud: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const localTrees = (local?.skillTrees as SkillTree[] | undefined) ?? [];
  const cloudTrees = (cloud?.skillTrees as SkillTree[] | undefined) ?? [];
  const treesById = new Map<string, SkillTree>();
  for (const tree of [...cloudTrees, ...localTrees]) {
    if (!tree?.id) continue;
    const existing = treesById.get(tree.id);
    if (!existing) {
      treesById.set(tree.id, tree);
      continue;
    }
    treesById.set(tree.id, (tree.currentXP ?? 0) >= (existing.currentXP ?? 0) ? tree : existing);
  }

  const localAchievements = (local?.achievements as Achievement[] | undefined) ?? [];
  const cloudAchievements = (cloud?.achievements as Achievement[] | undefined) ?? [];
  const achievementsById = new Map<string, Achievement>();
  for (const achievement of [...cloudAchievements, ...localAchievements]) {
    if (!achievement?.id) continue;
    const existing = achievementsById.get(achievement.id);
    // Once unlocked, always unlocked.
    if (!existing || (achievement.isUnlocked && !existing.isUnlocked)) {
      achievementsById.set(achievement.id, achievement);
    }
  }

  const localStats = (local?.userStats as Record<string, unknown> | undefined) ?? {};
  const cloudStats = (cloud?.userStats as Record<string, unknown> | undefined) ?? {};
  const userStats: Record<string, unknown> = { ...cloudStats, ...localStats };
  for (const key of new Set([...Object.keys(localStats), ...Object.keys(cloudStats)])) {
    const localValue = localStats[key];
    const cloudValue = cloudStats[key];
    if (typeof localValue === 'number' && typeof cloudValue === 'number') {
      userStats[key] = Math.max(localValue, cloudValue);
    } else if (localValue === undefined) {
      userStats[key] = cloudValue;
    }
  }

  return {
    skillTrees: Array.from(treesById.values()),
    achievements: Array.from(achievementsById.values()),
    userStats,
  };
}
