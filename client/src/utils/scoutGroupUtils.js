/**
 * Returns the subset of scout groups whose IDs are in the selected set.
 * @param {import('../services/api').ScoutGroup[]} scoutGroups
 * @param {Set<number>} selectedIds
 * @returns {import('../services/api').ScoutGroup[]}
 */
export function getSelectedScoutGroups(scoutGroups, selectedIds) {
	return scoutGroups.filter((sg) => selectedIds.has(sg.id));
}
