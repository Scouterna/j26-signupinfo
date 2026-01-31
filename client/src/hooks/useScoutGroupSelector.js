import { useState, useMemo } from 'react';
import useScoutGroupData, { getSelectedScoutGroups } from './useScoutGroupData';
import { SELECTION_TYPES } from '../constants/selectionTypes';

// Default empty data structure for when data is not yet loaded
const EMPTY_DATA = { villages: [] };

// This is a custom hook that encapsulates all the sidebar's logic.
export default function useScoutGroupSelector(jsonData) {
    const data = jsonData || EMPTY_DATA;

    // State management for the sidebar's functionality
    const [selectedScoutGroupIds, setSelectedScoutGroupIds] = useState(new Set());
    const [expandedVillageIds, setExpandedVillageIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const { statistics, totalParticipants, getStatisticData } = useScoutGroupData(data, selectedScoutGroupIds);

    const [selectedStatistics, setSelectedStatistics] = useState([]);

    /**
     * Memoized array of selected scout groups with their full data.
     * Used for the table view which needs access to raw group data.
     */
    const selectedScoutGroups = useMemo(
        () => getSelectedScoutGroups(data.villages, selectedScoutGroupIds),
        [data.villages, selectedScoutGroupIds]
    );

    /**
     * Memoized list of villages filtered by the search term.
     * If the search term is empty, returns all villages.
     * Otherwise, returns villages whose name or any of their ScoutGroups' names
     * include the search term (case-insensitive).
     *
     * @type {Array<Object>}
     */
    const filteredVillages = useMemo(() => {
        if (!searchTerm) return data.villages;
        const lowercasedFilter = searchTerm.toLowerCase();
        return data.villages.filter(village =>
            village.name.toLowerCase().includes(lowercasedFilter) ||
            village.ScoutGroups.some(scoutGroup => scoutGroup.name.toLowerCase().includes(lowercasedFilter))
        );
    }, [searchTerm, data.villages]);

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
            if (type === SELECTION_TYPES.VILLAGE) {
                const village = data.villages.find(v => v.id === id);
                if (!village) return newSet;
                const allScoutGroupInVillageSelected = village.ScoutGroups.every(t => newSet.has(t.id));
                // If all ScoutGroups in the village are selected, deselect them; otherwise, select them. 
                // If some are selected, this will select the rest.
                village.ScoutGroups.forEach(t => {
                    allScoutGroupInVillageSelected ? newSet.delete(t.id) : newSet.add(t.id);
                });
            } else { // type === SELECTION_TYPES.SCOUT_GROUP
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

    /**
     * Toggles the drawer open/closed state (used for mobile navigation).
     */
    const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

    // The hook returns all the necessary values and functions for the sidebar to use
    return {
        selectedScoutGroupIds,
        selectedScoutGroups,
        expandedVillageIds,
        searchTerm,
        setSearchTerm,
        filteredVillages,
        handleSelection,
        toggleVillageExpansion,
        clearSelection,
        isDrawerOpen,
        toggleDrawer,
        totalParticipants,
        statistics,
        selectedStatistics,
        setSelectedStatistics,
        getStatisticData
    };
}
