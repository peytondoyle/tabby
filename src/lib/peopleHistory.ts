/**
 * Track and retrieve people names from past bills for quick-add suggestions
 */

const PEOPLE_HISTORY_KEY = 'tabby-people-history';
const USER_IDENTITY_KEY = 'tabby-user-identity';
const MAX_RECENT_PEOPLE = 10;

export interface PersonSuggestion {
  name: string;
  lastUsed: string; // ISO timestamp
  useCount: number;
}

/**
 * Get the current user's identity (the "Me" person)
 */
export function getUserIdentity(): string | null {
  try {
    return localStorage.getItem(USER_IDENTITY_KEY);
  } catch {
    return null;
  }
}

/**
 * Set the current user's identity
 */
export function setUserIdentity(name: string): void {
  try {
    localStorage.setItem(USER_IDENTITY_KEY, name.trim());
  } catch (error) {
    console.error('Failed to save user identity:', error);
  }
}

/**
 * Clear the user's identity
 */
export function clearUserIdentity(): void {
  try {
    localStorage.removeItem(USER_IDENTITY_KEY);
  } catch (error) {
    console.error('Failed to clear user identity:', error);
  }
}

/**
 * Track a person name when they're added to a bill
 */
export function trackPersonName(name: string): void {
  if (!name || !name.trim()) return;

  try {
    const history = getPeopleHistory();
    const normalizedName = name.trim();

    // Find existing entry or create new one
    const existingIndex = history.findIndex(
      p => p.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing entry
      history[existingIndex] = {
        ...history[existingIndex],
        lastUsed: new Date().toISOString(),
        useCount: history[existingIndex].useCount + 1
      };
    } else {
      // Add new entry
      history.push({
        name: normalizedName,
        lastUsed: new Date().toISOString(),
        useCount: 1
      });
    }

    // Sort by last used (most recent first) and limit
    const sortedHistory = history
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, MAX_RECENT_PEOPLE);

    localStorage.setItem(PEOPLE_HISTORY_KEY, JSON.stringify(sortedHistory));
  } catch (error) {
    console.error('Failed to track person name:', error);
  }
}

/**
 * Get recently used people names
 */
export function getPeopleHistory(): PersonSuggestion[] {
  try {
    const raw = localStorage.getItem(PEOPLE_HISTORY_KEY);
    if (!raw) return [];

    const history = JSON.parse(raw) as PersonSuggestion[];
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Failed to load people history:', error);
    return [];
  }
}

/**
 * Get quick-add suggestions excluding already-added people
 */
export function getQuickAddSuggestions(excludeNames: string[]): PersonSuggestion[] {
  const history = getPeopleHistory();
  const excludeSet = new Set(excludeNames.map(n => n.toLowerCase().trim()));

  return history.filter(p => !excludeSet.has(p.name.toLowerCase()));
}

/**
 * Clear people history
 */
export function clearPeopleHistory(): void {
  try {
    localStorage.removeItem(PEOPLE_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear people history:', error);
  }
}
