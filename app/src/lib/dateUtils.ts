/**
 * Get YYYY-MM-DD string in LOCAL timezone (not UTC).
 * This is critical for habit/task day boundaries — using toISOString()
 * returns UTC which causes dates to be off by a day in timezones like IST.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
