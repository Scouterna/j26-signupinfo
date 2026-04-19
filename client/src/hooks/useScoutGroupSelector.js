import { useState, useMemo, useEffect } from 'react';

/**
 * Hook that encapsulates all the sidebar's selection and UI logic.
 *
 * @param {Array<{ id: number, name: string }>} scoutGroups - Scout groups from useProjectQueries
 */
export default function useScoutGroupSelector(scoutGroups) {
	const groups = scoutGroups || [];

	const [selectedScoutGroupIds, setSelectedScoutGroupIds] = useState(new Set());
	const [selectionChoiceLabel, setSelectionChoiceLabel] = useState(/** @type {string[] | null} */ (null));
	const [searchTerm, setSearchTerm] = useState('');
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const soleGroupId = groups.length === 1 ? groups[0].id : null;
	useEffect(() => {
		if (soleGroupId !== null && selectedScoutGroupIds.size === 0) {
			setSelectedScoutGroupIds(new Set([soleGroupId]));
		}
	}, [soleGroupId, selectedScoutGroupIds]);

	/**
	 * Memoized list of scout groups filtered by the search term.
	 */
	const filteredScoutGroups = useMemo(() => {
		if (!searchTerm) return groups;
		const lower = searchTerm.toLowerCase();
		return groups.filter((sg) => sg.name.toLowerCase().includes(lower));
	}, [searchTerm, groups]);

	/**
	 * Toggles selection of a single scout group.
	 *
	 * @param {number} id - The ID of the scout group to toggle.
	 */
	const toggleScoutGroup = (id) => {
		setSelectionChoiceLabel(null);
		setSelectedScoutGroupIds((prev) => {
			const newSet = new Set(prev);
			newSet.has(id) ? newSet.delete(id) : newSet.add(id);
			return newSet;
		});
	};

	const clearSelection = () => {
		setSelectedScoutGroupIds(new Set());
		setSelectionChoiceLabel(null);
	};

	const selectAll = () => {
		setSelectedScoutGroupIds(new Set(filteredScoutGroups.map((sg) => sg.id)));
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

	const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

	return {
		selectedScoutGroupIds,
		selectionChoiceLabel,
		searchTerm,
		setSearchTerm,
		filteredScoutGroups,
		toggleScoutGroup,
		clearSelection,
		selectAll,
		replaceSelectionWithIds,
		isDrawerOpen,
		toggleDrawer,
	};
}
