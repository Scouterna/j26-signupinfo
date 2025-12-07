import { useState, useMemo } from 'react';

// This is a custom hook that encapsulates all the sidebar's logic.
export default function useScoutGroupSelector(jsonData) {
    // State management for the sidebar's functionality
    const [selectedScoutGroupIds, setSelectedScoutGroupIds] = useState(new Set());
    const [expandedVillageIds, setExpandedVillageIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * Memoized list of villages filtered by the search term.
     * If the search term is empty, returns all villages.
     * Otherwise, returns villages whose name or any of their ScoutGroups' names
     * include the search term (case-insensitive).
     *
     * @type {Array<Object>}
     */
    const filteredVillages = useMemo(() => {
        if (!searchTerm) return jsonData.villages;
        const lowercasedFilter = searchTerm.toLowerCase();
        return jsonData.villages.filter(village =>
            village.name.toLowerCase().includes(lowercasedFilter) ||
            village.ScoutGroups.some(scoutGroup => scoutGroup.name.toLowerCase().includes(lowercasedFilter))
        );
    }, [searchTerm, jsonData.villages]);

    /**
     * Toggles the expansion state of a village by its ID.
     * If the village is currently expanded, it will be collapsed; if collapsed, it will be expanded.
     *
     * @param {string|number} villageId - The unique identifier of the village to toggle.
     */
    const toggleVillageExpansion = (villageId) => {
        setExpandedVillageIds(prev => {
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
        setSelectedScoutGroupIds(prev => {
            const newSet = new Set(prev);
            if (type === 'village') {
                const village = jsonData.villages.find(v => v.id === id);
                if (!village) return newSet;
                const allScoutGroupInVillageSelected = village.ScoutGroups.every(t => newSet.has(t.id));
                // If all ScoutGroups in the village are selected, deselect them; otherwise, select them. 
                // If some are selected, this will select the rest.
                village.ScoutGroups.forEach(t => {
                    allScoutGroupInVillageSelected ? newSet.delete(t.id) : newSet.add(t.id);
                });
            } else { // type === 'ScoutGroup'
                newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            }
            return newSet;
        });
    };

    /**
     * Clears the current selection of scout group IDs.
     * Sets the selected scout group IDs to an empty set.
     */
    const clearSelection = () => setSelectedScoutGroupIds(new Set());

    // The hook returns all the necessary values and functions for the sidebar to use
    return {
        selectedScoutGroupIds,
        expandedVillageIds,
        searchTerm,
        setSearchTerm,
        filteredVillages,
        handleSelection,
        toggleVillageExpansion,
        clearSelection
    };
}
