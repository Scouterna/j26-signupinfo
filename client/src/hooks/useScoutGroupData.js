/**
 * Returns an array of selected scout groups from the villages data.
 * @param {import('../services/api').Village[]} villages - Array of village objects containing ScoutGroups
 * @param {Set<number | string>} selectedIds - Set of selected scout group IDs
 * @returns {import('../services/api').ScoutGroup[]} Array of selected scout group objects
 */
export function getSelectedScoutGroups(villages, selectedIds) {
    return villages.flatMap(v => v.ScoutGroups).filter(sg => selectedIds.has(sg.id));
}
