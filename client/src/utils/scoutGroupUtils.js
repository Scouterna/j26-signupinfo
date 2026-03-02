/**
 * Returns an array of selected scout groups from the villages data.
 * @param {import('../services/api').Village[]} villages
 * @param {Set<number>} selectedIds
 * @returns {import('../services/api').ScoutGroup[]}
 */
export function getSelectedScoutGroups(villages, selectedIds) {
	return villages.flatMap((v) => v.ScoutGroups).filter((sg) => selectedIds.has(sg.id));
}
