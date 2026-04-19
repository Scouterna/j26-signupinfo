import { createContext, useContext } from "react";

/**
 * @typedef {{ id: number, name: string }} ScoutGroup
 *
 * @typedef {{
 *   filteredScoutGroups: ScoutGroup[],
 *   selectionChoiceLabel: string | string[] | null,
 *   searchTerm: string,
 *   setSearchTerm: (term: string) => void,
 *   toggleScoutGroup: (id: number) => void,
 *   clearSelection: () => void,
 *   selectAll: () => void,
 *   isDrawerOpen: boolean,
 *   toggleDrawer: () => void,
 * }} ScoutGroupSelectorState
 */

const ScoutGroupSelectorContext = createContext(/** @type {ScoutGroupSelectorState} */ ({
  filteredScoutGroups: [],
  selectionChoiceLabel: null,
  searchTerm: "",
  setSearchTerm: () => {},
  toggleScoutGroup: () => {},
  clearSelection: () => {},
  selectAll: () => {},
  isDrawerOpen: false,
  toggleDrawer: () => {},
}));

export default ScoutGroupSelectorContext;

export function useScoutGroupSelectorContext() {
  return useContext(ScoutGroupSelectorContext);
}
