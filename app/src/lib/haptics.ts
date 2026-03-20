function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function hapticLight(): void {
  if (canVibrate()) navigator.vibrate(10);
}

export function hapticMedium(): void {
  if (canVibrate()) navigator.vibrate(20);
}

export function hapticHeavy(): void {
  if (canVibrate()) navigator.vibrate([15, 50, 30]);
}

export function hapticSuccess(): void {
  if (canVibrate()) navigator.vibrate([10, 30, 10, 30, 10]);
}
