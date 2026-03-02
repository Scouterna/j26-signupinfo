import { useState, useMemo } from 'react';
import { SELECTION_TYPES } from '../constants/selectionTypes';

const EMPTY_DATA = { villages: [] };

/**
 * Hook that encapsulates all the sidebar's selection and UI logic.
 * Accepts the lightweight villages data (from /groups endpoint) for the selector list.
 *
 * @param {import('../services/api').VillagesData} villagesData - Villages structure from useProjectQueries
 */
export default function useScoutGroupSelector(villagesData) {
	const data = villagesData || EMPTY_DATA;

	const [selectedScoutGroupIds, setSelectedScoutGroupIds] = useState(new Set());
	const [selectionChoiceLabel, setSelectionChoiceLabel] = useState(/** @type {string[] | null} */ (null));
	const [expandedVillageIds, setExpandedVillageIds] = useState(new Set());
	const [searchTerm, setSearchTerm] = useState('');
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	/**
	 * Memoized list of villages filtered by the search term.
	 * If the search term is empty, returns all villages.
	 * Otherwise, returns villages whose name or any of their ScoutGroups' names
	 * include the search term (case-insensitive). Within each village, only
	 * matching ScoutGroups are shown (or all if the village name matches).
	 */
	const filteredVillages = useMemo(() => {
		if (!searchTerm) return data.villages;
		const lower = searchTerm.toLowerCase();
		return data.villages
			.filter(
				(village) =>
					village.name.toLowerCase().includes(lower) ||
					village.ScoutGroups.some((sg) => sg.name.toLowerCase().includes(lower)),
			)
			.map((village) => ({
				...village,
				ScoutGroups: village.name.toLowerCase().includes(lower)
					? village.ScoutGroups
					: village.ScoutGroups.filter((sg) => sg.name.toLowerCase().includes(lower)),
			}));
	}, [searchTerm, data.villages]);

	/**
	 * Effective expanded village IDs for display.
	 * When search is active, all filtered villages are expanded so matches are visible.
	 * When search is empty, uses the user's manual expansion state.
	 */
	const effectiveExpandedVillageIds = useMemo(() => {
		if (searchTerm) {
			return new Set(filteredVillages.map((v) => v.id));
		}
		return expandedVillageIds;
	}, [searchTerm, filteredVillages, expandedVillageIds]);

	/**
	 * Toggles the expansion state of a village by its ID.
	 *
	 * @param {string|number} villageId - The unique identifier of the village to toggle.
	 */
	const toggleVillageExpansion = (villageId) => {
		setExpandedVillageIds((prev) => {
			const newSet = new Set(prev);
			newSet.has(villageId) ? newSet.delete(villageId) : newSet.add(villageId);
			return newSet;
		});
	};

	/**
	 * Handles selection and deselection of scout groups or entire villages.
	 *
	 * If a village is selected, toggles selection for all scout groups within that village:
	 * - If all scout groups in the village are already selected, deselects them.
	 * - Otherwise, selects all scout groups in the village.
	 *
	 * If a scout group is selected individually, toggles its selection.
	 *
	 * @param {'village'|'ScoutGroup'} type - The type of selection ('village' or 'ScoutGroup').
	 * @param {string|number} id - The ID of the village or scout group to select/deselect.
	 */
	const handleSelection = (type, id) => {
		setSelectionChoiceLabel(null);
		setSelectedScoutGroupIds((prev) => {
			const newSet = new Set(prev);
			if (type === SELECTION_TYPES.VILLAGE) {
				const village = data.villages.find((v) => v.id === id);
				if (!village) return newSet;
				const allScoutGroupInVillageSelected = village.ScoutGroups.every((t) => newSet.has(t.id));
				// If all ScoutGroups in the village are selected, deselect them; otherwise, select them.
				// If some are selected, this will select the rest.
				village.ScoutGroups.forEach((t) => {
					allScoutGroupInVillageSelected ? newSet.delete(t.id) : newSet.add(t.id);
				});
			} else {
				// type === SELECTION_TYPES.SCOUT_GROUP
				newSet.has(id) ? newSet.delete(id) : newSet.add(id);
			}
			return newSet;
		});
	};

	/**
	 * Clears the current selection of scout group IDs.
	 */
	const clearSelection = () => {
		setSelectedScoutGroupIds(new Set());
		setSelectionChoiceLabel(null);
	};

	/**
	 * Selects all scout groups from the currently filtered villages.
	 */
	const selectAll = () => {
		const allIds = new Set();
		filteredVillages.forEach((village) => {
			village.ScoutGroups.forEach((sg) => allIds.add(sg.id));
		});
		setSelectedScoutGroupIds(allIds);
		setSelectionChoiceLabel(null);
	};

	/**
	 * Narrows the current selection by intersecting with the given scout group IDs.
	 * When current selection is empty, uses the given ids as the new selection (first filter).
	 * Accumulates labels so multiple "Välj dessa kårer" clicks build a chain (e.g. charterbuss → 00:00).
	 * @param {Array<number>|Set<number>} ids - Scout group IDs to intersect with
	 * @param {string} [label] - Optional label describing the choice (e.g. "Charterbuss")
	 */
	const replaceSelectionWithIds = (ids, label) => {
		const idSet = ids instanceof Set ? ids : new Set(ids);
		setSelectedScoutGroupIds((prev) => {
			if (prev.size === 0) return idSet;
			return new Set([...prev].filter((id) => idSet.has(id)));
		});
		setSelectionChoiceLabel((prev) => {
			const newLabel = label ?? null;
			if (!newLabel) return prev;
			return prev ? [...prev, newLabel] : [newLabel];
		});
	};

	/**
	 * Toggles the drawer open/closed state (used for mobile navigation).
	 */
	const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

	return {
		selectedScoutGroupIds,
		selectionChoiceLabel,
		expandedVillageIds: effectiveExpandedVillageIds,
		searchTerm,
		setSearchTerm,
		filteredVillages,
		handleSelection,
		toggleVillageExpansion,
		clearSelection,
		selectAll,
		replaceSelectionWithIds,
		isDrawerOpen,
		toggleDrawer,
	};
}
