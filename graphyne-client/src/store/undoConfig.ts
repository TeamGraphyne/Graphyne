import { excludeAction } from 'redux-undo';
import type { AnyAction } from '@reduxjs/toolkit';

// ========== UNDO FILTER ==========
// These actions modify state but should NEVER create undo history entries.
const EXCLUDED_ACTIONS = [
  'canvas/selectElement',
  'canvas/setSelection',
  'canvas/toggleSelection',
  'canvas/deselectAll',
];

export const undoFilter = excludeAction(EXCLUDED_ACTIONS);

// ========== UNDO GROUPING ==========
// Groups rapid consecutive actions into a single undo entry

// Debounce window: consecutive actions within this interval share the same group.
const GROUP_DEBOUNCE_MS = 750;

// Internal state for the grouping function (module-scoped, not in Redux).
let currentGroup = 0;
let lastActionTime = 0;
let lastActionKey = '';

/**
 * Determines a group key for the given action.
 * - Actions with the SAME group key are collapsed into one undo entry.
 *
 * Returns `null` for actions that don't need grouping (each gets its own entry).
 */
export function undoGroupBy(action: AnyAction): string | null {
  const now = Date.now();

  // --- TEXT EDITS: Group by element ID ---
  // When the user types in the properties panel
  if (action.type === 'canvas/updateElement' && action.payload?.text !== undefined) {
    const key = `text-${action.payload.id}`;

    if (key === lastActionKey && now - lastActionTime < GROUP_DEBOUNCE_MS) {
      // Same element, within debounce window — keep the same group
      lastActionTime = now;
      return `group-${currentGroup}`;
    }

    // New typing session (different element or timeout)
    currentGroup++;
    lastActionKey = key;
    lastActionTime = now;
    return `group-${currentGroup}`;
  }

  // --- NUDGES: Group rapid arrow key presses ---
  // Holding an arrow key fires nudgeElements actions rapidly.
  if (action.type === 'canvas/nudgeElements') {
    const key = 'nudge';

    if (key === lastActionKey && now - lastActionTime < GROUP_DEBOUNCE_MS) {
      lastActionTime = now;
      return `group-${currentGroup}`;
    }

    currentGroup++;
    lastActionKey = key;
    lastActionTime = now;
    return `group-${currentGroup}`;
  }

  // --- ALL OTHER ACTIONS: No grouping ---
  // Each action gets its own undo entry (normal behaviour).
  lastActionKey = '';
  return null;
}