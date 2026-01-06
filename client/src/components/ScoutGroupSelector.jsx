import { List, Typography, Button, Paper } from "@mui/material";
import ExpandCollapseButton from "./ExpandCollapseButton.jsx";
import SearchField from "./SearchField.jsx";
import VillageListItem from "./VillageListItem.jsx";

export default function ScoutGroupSelector({
  filteredVillages = [],
  selectedScoutGroupIds,
  expandedVillageIds,
  searchTerm = "",
  setSearchTerm = () => {},
  handleSelection = () => {},
  toggleVillageExpansion = () => {},
  clearSelection = () => {},
  isCollapsed = false,
  toggleCollapse = () => {},
}) {
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (value && isCollapsed) {
      toggleCollapse();
    }
  };
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Typography variant="h5" component="h2" fontWeight="600">
            Byar och kårer
          </Typography>
          <ExpandCollapseButton
            onClick={toggleCollapse}
            isExpanded={!isCollapsed}
          />
        </div>
        <Button
          onClick={clearSelection}
          disabled={selectedScoutGroupIds.size === 0}
        >
          Rensa val
        </Button>
      </div>

      <SearchField
        placeholder="Sök efter by eller kår..."
        searchTerm={searchTerm}
        setSearchTerm={handleSearchChange}
      />

      {!isCollapsed && (
        <List sx={{ flexGrow: 1, overflowY: "auto", pr: 1, minHeight: 0 }}>
          {filteredVillages.map((village) => {
            const ScoutGroupsInVillage = village.ScoutGroups.map((t) => t.id);
            const selectedInVillage = ScoutGroupsInVillage.filter((id) =>
              selectedScoutGroupIds.has(id)
            );
            const isAllSelected =
              ScoutGroupsInVillage.length > 0 &&
              selectedInVillage.length === ScoutGroupsInVillage.length;
            const isPartiallySelected =
              selectedInVillage.length > 0 && !isAllSelected;
            const isExpanded = expandedVillageIds.has(village.id);

            return (
              <VillageListItem
                key={village.id}
                village={village}
                isAllSelected={isAllSelected}
                isPartiallySelected={isPartiallySelected}
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
