/**
 * First-run state, kept out of the tour component so other first-run prompts can
 * read it without importing a component (and without breaking fast refresh).
 */
export const ONBOARDING_STORAGE_KEY = 'assisy_onboarding_done';

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}
