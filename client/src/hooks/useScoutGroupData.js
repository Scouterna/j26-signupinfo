/**
 * Returns an array of selected scout groups from the villages data.
 * @param {Array} villages - Array of village objects containing ScoutGroups
 * @param {Set} selectedIds - Set of selected scout group IDs
 * @returns {Array} Array of selected scout group objects
 */
export function getSelectedScoutGroups(villages, selectedIds) {
    return villages.flatMap(v => v.ScoutGroups).filter(sg => selectedIds.has(sg.id));
}
