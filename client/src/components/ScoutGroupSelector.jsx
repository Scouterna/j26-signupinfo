import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import ScoutGroupListItem from "./ScoutGroupListItem.jsx";

const DRAWER_WIDTH = 340;

/**
 * @typedef {{ id: string | number, name: string }} ScoutGroup
 * @typedef {{ id: string | number, name: string, ScoutGroups: ScoutGroup[] }} Village
 */

/**
 * Content displayed inside the drawer.
 * @param {object} props
 * @param {Village[]} props.filteredVillages
 * @param {Set<string | number>} props.selectedScoutGroupIds
 * @param {string | string[] | null} [props.selectionChoiceLabel]
 * @param {Set<string | number>} props.expandedVillageIds
 * @param {string} props.searchTerm
 * @param {(term: string) => void} props.setSearchTerm
 * @param {(type: "village" | "ScoutGroup", id: string | number) => void} props.handleSelection
 * @param {(id: string | number) => void} props.toggleVillageExpansion
 * @param {() => void} props.clearSelection
 * @param {() => void} props.selectAll
 * @param {() => void} [props.onClose]
 * @param {boolean} [props.showCloseButton]
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
  const parentRef = useRef(null);

  /** @type {Array<{ type: 'village', id: string, village: Village, isAllSelected: boolean, isPartiallySelected: boolean, isExpanded: boolean } | { type: 'scoutGroup', id: string, scoutGroup: ScoutGroup, villageId: string | number }>} */
  const flattenedItems = [];
  
  filteredVillages.forEach((village) => {
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

    flattenedItems.push({
      type: /** @type {const} */ ('village'),
      id: `village-${village.id}`,
      village,
      isAllSelected,
      isPartiallySelected,
      isExpanded,
    });

    if (isExpanded) {
      village.ScoutGroups.forEach((scoutGroup) => {
        flattenedItems.push({
          type: /** @type {const} */ ('scoutGroup'),
          id: `scoutGroup-${scoutGroup.id}`,
          scoutGroup,
          villageId: village.id,
        });
      });
    }
  });

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      return flattenedItems[index].type === 'village' ? 64 : 48;
    },
    overscan: 10,
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: 3,
        pb: 0
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

      {/* Selection choice label */}
      {selectionChoiceLabel && (() => {
        const labels = Array.isArray(selectionChoiceLabel)
          ? selectionChoiceLabel
          : [selectionChoiceLabel];
        const displayText = labels.join(" → ");
        return (
          <Typography
            variant="caption"
            sx={{
              mb: 1.5,
              fontStyle: "italic",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              display: "inline-block",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              backgroundColor: "rgba(255, 255, 0, 0.25)",
              color: "text.secondary",
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
      <Box
        ref={parentRef}
        sx={{ 
          flexGrow: 1, 
          overflowY: "auto", 
          pr: 1, 
          minHeight: 0,
          position: "relative"
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = flattenedItems[virtualRow.index];
            
            return (
              <div
                key={item.id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === 'village' ? (
                  <VillageListItem
                    village={item.village}
                    isAllSelected={item.isAllSelected}
                    isPartiallySelected={item.isPartiallySelected}
                    isExpanded={item.isExpanded}
                    toggleVillageExpansion={toggleVillageExpansion}
                    handleSelection={handleSelection}
                    selectedScoutGroupIds={selectedScoutGroupIds}
                    renderChildrenExternally={true}
                    selectionChoiceLabel={selectionChoiceLabel ?? undefined}
                  />
                ) : (
                  <div style={{ paddingLeft: "32px" }}>
                    <ScoutGroupListItem
                      scoutGroup={item.scoutGroup}
                      selectedScoutGroupIds={selectedScoutGroupIds}
                      handleSelection={handleSelection}
                      selectionChoiceLabel={selectionChoiceLabel ?? undefined}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Box>
    </Box>
  );
}

/**
 * Responsive drawer for selecting scout groups.
 * - Persistent on large screens (lg and up)
 * - Temporary (overlay) on smaller screens
 *
 * @param {object} props
 * @param {Village[]} [props.filteredVillages]
 * @param {Set<string | number>} [props.selectedScoutGroupIds]
 * @param {string | string[] | null} [props.selectionChoiceLabel]
 * @param {Set<string | number>} [props.expandedVillageIds]
 * @param {string} [props.searchTerm]
 * @param {(term: string) => void} [props.setSearchTerm]
 * @param {(type: "village" | "ScoutGroup", id: string | number) => void} [props.handleSelection]
 * @param {(id: string | number) => void} [props.toggleVillageExpansion]
 * @param {() => void} [props.clearSelection]
 * @param {() => void} [props.selectAll]
 * @param {boolean} [props.isDrawerOpen]
 * @param {() => void} [props.toggleDrawer]
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
 * @param {object} props
 * @param {() => void} props.onClick
 * @param {number} [props.selectedCount]
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
