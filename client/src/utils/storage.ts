const DASHBOARD_PANEL_STORAGE_KEY = 'dashboard-panel-collapsed';

/**
 * Get collapsed state for dashboard panels from localStorage
 */
export function getCollapsedState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(DASHBOARD_PANEL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Set collapsed state for a dashboard panel in localStorage
 */
export function setCollapsedState(key: string, collapsed: boolean): void {
  try {
    const state = getCollapsedState();
    state[key] = collapsed;
    localStorage.setItem(DASHBOARD_PANEL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage not available
  }
}
