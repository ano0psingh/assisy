/** Rows past this position all animate together. */
const MAX_STAGGERED_ROWS = 10;

/**
 * Entry delay for a list row, in milliseconds.
 *
 * The delay has to stop growing at some point: an uncapped `index * step`
 * leaves the 200th row waiting six seconds and the 500th waiting fifteen, so a
 * long list appears to hang rather than animate.
 */
export function staggerDelay(index: number, step = 30): string {
  return `${Math.min(index, MAX_STAGGERED_ROWS) * step}ms`;
}
