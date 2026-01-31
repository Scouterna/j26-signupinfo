import { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Box, List, Typography, Button, Paper } from "@mui/material";
import ExpandCollapseButton from "./ExpandCollapseButton.jsx";
import SearchField from "./SearchField.jsx";
import VillageListItem from "./VillageListItem.jsx";

export default function ScoutGroupSelector({
  filteredVillages = [],
  selectedScoutGroupIds,
  expandedVillageIds,
  searchTerm = "",
  setSearchTerm,
  handleSelection,
  toggleVillageExpansion,
  clearSelection,
  isCollapsed = false,
  toggleCollapse,
}) {
  // Memoize the selection state calculations for all villages
  const villageSelectionStates = useMemo(() => {
    return filteredVillages.map((village) => {
      const scoutGroupIds = village.ScoutGroups.map((sg) => sg.id);
      const selectedCount = scoutGroupIds.filter((id) =>
        selectedScoutGroupIds.has(id)
      ).length;
      const totalCount = scoutGroupIds.length;

      return {
        villageId: village.id,
        isAllSelected: totalCount > 0 && selectedCount === totalCount,
        isPartiallySelected: selectedCount > 0 && selectedCount < totalCount,
      };
    });
  }, [filteredVillages, selectedScoutGroupIds]);

  // Create a lookup map for quick access
  const selectionStateMap = useMemo(() => {
    return new Map(villageSelectionStates.map((state) => [state.villageId, state]));
  }, [villageSelectionStates]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (value && isCollapsed) {
      toggleCollapse();
    }
  }, [setSearchTerm, isCollapsed, toggleCollapse]);

  return (
    <Paper
      elevation={3}
      sx={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        height: isCollapsed ? "auto" : "100%",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography variant="h5" component="h2" fontWeight="600">
            Byar och kårer
          </Typography>
          <ExpandCollapseButton
            onClick={toggleCollapse}
            isExpanded={!isCollapsed}
          />
        </Box>
        <Button
          onClick={clearSelection}
          disabled={selectedScoutGroupIds.size === 0}
        >
          Rensa val
        </Button>
      </Box>

      <SearchField
        placeholder="Sök efter by eller kår..."
        searchTerm={searchTerm}
        setSearchTerm={handleSearchChange}
      />

      {!isCollapsed && (
        <List sx={{ flexGrow: 1, overflowY: "auto", pr: 1, minHeight: 0 }}>
          {filteredVillages.map((village) => {
            const selectionState = selectionStateMap.get(village.id) || {
              isAllSelected: false,
              isPartiallySelected: false,
            };
            const isExpanded = expandedVillageIds.has(village.id);

            return (
              <VillageListItem
                key={village.id}
                village={village}
                isAllSelected={selectionState.isAllSelected}
                isPartiallySelected={selectionState.isPartiallySelected}
                isExpanded={isExpanded}
                toggleVillageExpansion={toggleVillageExpansion}
                handleSelection={handleSelection}
                selectedScoutGroupIds={selectedScoutGroupIds}
              />
            );
          })}
        </List>
      )}
    </Paper>
  );
}

ScoutGroupSelector.propTypes = {
  /** Filtered list of villages based on search term */
  filteredVillages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      ScoutGroups: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          name: PropTypes.string.isRequired,
        })
      ).isRequired,
    })
  ),
  /** Set of currently selected scout group IDs */
  selectedScoutGroupIds: PropTypes.instanceOf(Set).isRequired,
  /** Set of currently expanded village IDs */
  expandedVillageIds: PropTypes.instanceOf(Set).isRequired,
  /** Current search term */
  searchTerm: PropTypes.string,
  /** Function to update search term */
  setSearchTerm: PropTypes.func.isRequired,
  /** Handler for selection changes */
  handleSelection: PropTypes.func.isRequired,
  /** Handler to toggle village expansion */
  toggleVillageExpansion: PropTypes.func.isRequired,
  /** Handler to clear all selections */
  clearSelection: PropTypes.func.isRequired,
  /** Whether the selector panel is collapsed */
  isCollapsed: PropTypes.bool,
  /** Handler to toggle collapse state */
  toggleCollapse: PropTypes.func.isRequired,
};
