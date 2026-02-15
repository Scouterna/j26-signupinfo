import {
  List,
  Typography,
  Button,
  Drawer,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SearchField from "./SearchField.jsx";
import VillageListItem from "./VillageListItem.jsx";
import PropTypes from "prop-types";

const DRAWER_WIDTH = 340;

/**
 * Content displayed inside the drawer.
 * Extracted for reusability and cleaner code.
 */
function DrawerContent({
  filteredVillages,
  selectedScoutGroupIds,
  selectionChoiceLabel,
  expandedVillageIds,
  searchTerm,
  setSearchTerm,
  handleSelection,
  toggleVillageExpansion,
  clearSelection,
  selectAll,
  onClose,
  showCloseButton,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" component="h2" fontWeight="600">
          Byar och kårer
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            onClick={selectedScoutGroupIds.size > 0 ? clearSelection : selectAll}
          >
            {selectedScoutGroupIds.size > 0 ? "Rensa" : "Välj alla"}
          </Button>
          {showCloseButton && (
            <IconButton onClick={onClose} aria-label="Stäng meny">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Selection choice label - discreet, only when filtered by answer */}
      {selectionChoiceLabel && (() => {
        const labels = Array.isArray(selectionChoiceLabel)
          ? selectionChoiceLabel
          : [selectionChoiceLabel];
        const displayText = labels.join(" → ");
        return (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mb: 1.5,
              fontStyle: "italic",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
            title={`Valt utifrån: ${displayText}`}
          >
            Valt utifrån: {displayText}
          </Typography>
        );
      })()}

      {/* Search */}
      <SearchField
        placeholder="Sök efter by eller kår..."
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Village list */}
      <List sx={{ flexGrow: 1, overflowY: "auto", pr: 1, minHeight: 0 }}>
        {filteredVillages.map((village) => {
          const scoutGroupIds = village.ScoutGroups.map((sg) => sg.id);
          const selectedInVillage = scoutGroupIds.filter((id) =>
            selectedScoutGroupIds.has(id)
          );
          const isAllSelected =
            scoutGroupIds.length > 0 &&
            selectedInVillage.length === scoutGroupIds.length;
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
    </Box>
  );
}

/**
 * Responsive drawer for selecting scout groups.
 * - Persistent on large screens (lg and up)
 * - Temporary (overlay) on smaller screens
 */
export default function ScoutGroupSelector({
  filteredVillages = [],
  selectedScoutGroupIds = new Set(),
  selectionChoiceLabel = null,
  expandedVillageIds = new Set(),
  searchTerm = "",
  setSearchTerm = () => {},
  handleSelection = () => {},
  toggleVillageExpansion = () => {},
  clearSelection = () => {},
  selectAll = () => {},
  isDrawerOpen = false,
  toggleDrawer = () => {},
}) {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));

  const drawerContent = (
    <DrawerContent
      filteredVillages={filteredVillages}
      selectedScoutGroupIds={selectedScoutGroupIds}
      selectionChoiceLabel={selectionChoiceLabel}
      expandedVillageIds={expandedVillageIds}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      handleSelection={handleSelection}
      toggleVillageExpansion={toggleVillageExpansion}
      clearSelection={clearSelection}
      selectAll={selectAll}
      onClose={toggleDrawer}
      showCloseButton={!isLargeScreen}
    />
  );

  // Persistent drawer for large screens
  if (isLargeScreen) {
    return (
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            position: "relative",
            borderRadius: 2,
            border: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Temporary drawer for smaller screens
  return (
    <Drawer
      variant="temporary"
      open={isDrawerOpen}
      onClose={toggleDrawer}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

/**
 * Button to open the drawer on mobile screens.
 * Should be rendered in the app bar or header on small screens.
 */
export function DrawerToggleButton({ onClick, selectedCount = 0 }) {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));

  if (isLargeScreen) {
    return null;
  }

  return (
    <IconButton
      color="inherit"
      aria-label="Öppna meny"
      onClick={onClick}
      sx={{ mr: 2, position: "relative" }}
    >
      <MenuIcon />
      {selectedCount > 0 && (
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            borderRadius: "50%",
            width: 18,
            height: 18,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selectedCount > 9 ? "9+" : selectedCount}
        </Box>
      )}
    </IconButton>
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
  /** Label(s) when selection was narrowed via "Välj dessa kårer" (e.g. "Ja" or ["Charterbuss", "00:00"]) */
  selectionChoiceLabel: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  /** Set of currently expanded village IDs */
  expandedVillageIds: PropTypes.instanceOf(Set).isRequired,
  /** Current search term */
  searchTerm: PropTypes.string,
  /** Function to update search term */
  setSearchTerm: PropTypes.func,
  /** Handler for selection changes */
  handleSelection: PropTypes.func,
  /** Handler to toggle village expansion */
  toggleVillageExpansion: PropTypes.func,
  /** Handler to clear all selections */
  clearSelection: PropTypes.func,
  /** Handler to select all (filtered) scout groups */
  selectAll: PropTypes.func,
  /** Whether the drawer is open (mobile) */
  isDrawerOpen: PropTypes.bool,
  /** Handler to toggle drawer state */
  toggleDrawer: PropTypes.func,
};
