import { createContext, useContext } from "react";

/**
 * Holds the current group selection state.
 * selectedGroupIds changes as the user picks scout groups.
 * onReplaceSelection is a stable callback to replace the selection by answer drill-down.
 *
 * @typedef {{
 *   selectedGroupIds: Set<number>,
 *   onReplaceSelection: ((ids: number[], answerName: string) => void) | undefined,
 * }} GroupSelection
 */

const GroupSelectionContext = createContext(/** @type {GroupSelection} */ ({
  selectedGroupIds: new Set(),
  onReplaceSelection: undefined,
}));

export default GroupSelectionContext;

export function useGroupSelection() {
  return useContext(GroupSelectionContext);
}
