// Build a `/?tab=…[&goal=…]` href, preserving existing params (year, etc.).
// Shared by the hub, GoalTracker, and the saved-plans list so the "open a tab /
// reopen a plan" idiom lives in one place.
export function tabHref(current: URLSearchParams, tab: string, goalId?: number): string {
  const params = new URLSearchParams(current.toString());
  params.set('tab', tab);
  if (goalId != null) params.set('goal', String(goalId));
  else params.delete('goal');
  return `/?${params.toString()}`;
}
