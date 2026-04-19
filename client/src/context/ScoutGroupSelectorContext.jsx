import { createContext, useContext } from "react";

/**
 * @typedef {{ id: number, name: string }} ScoutGroup
 * @typedef {{ id: string | number, name: string, ScoutGroups: ScoutGroup[] }} Village
 *
 * @typedef {{
 *   filteredVillages: Village[],
 *   selectionChoiceLabel: string | string[] | null,
 *   expandedVillageIds: Set<string | number>,
 *   searchTerm: string,
 *   setSearchTerm: (term: string) => void,
 *   handleSelection: (type: "village" | "ScoutGroup", id: string | number) => void,
 *   toggleVillageExpansion: (id: string | number) => void,
 *   clearSelection: () => void,
 *   selectAll: () => void,
 *   isDrawerOpen: boolean,
 *   toggleDrawer: () => void,
 * }} ScoutGroupSelectorState
 */

const ScoutGroupSelectorContext = createContext(/** @type {ScoutGroupSelectorState} */ ({
  filteredVillages: [],
  selectionChoiceLabel: null,
  expandedVillageIds: new Set(),
  searchTerm: "",
  setSearchTerm: () => {},
  handleSelection: () => {},
  toggleVillageExpansion: () => {},
  clearSelection: () => {},
  selectAll: () => {},
  isDrawerOpen: false,
  toggleDrawer: () => {},
}));

export default ScoutGroupSelectorContext;

export function useScoutGroupSelectorContext() {
  return useContext(ScoutGroupSelectorContext);
}
