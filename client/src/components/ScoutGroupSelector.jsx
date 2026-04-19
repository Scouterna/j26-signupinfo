import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Typography,
  Button,
  Drawer,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchField from "./SearchField.jsx";
import VillageListItem from "./VillageListItem.jsx";
import ScoutGroupListItem from "./ScoutGroupListItem.jsx";
import { DRAWER_WIDTH } from "../constants/layout.js";
import { useGroupSelection } from "../context/GroupSelectionContext.jsx";
import { useScoutGroupSelectorContext } from "../context/ScoutGroupSelectorContext.jsx";

/**
 * @param {{ showCloseButton: boolean }} props
 */
function DrawerContent({ showCloseButton }) {
  const {
    filteredVillages,
    selectionChoiceLabel,
    expandedVillageIds,
    searchTerm,
    setSearchTerm,
    clearSelection,
    selectAll,
    toggleDrawer,
  } = useScoutGroupSelectorContext();
  const { selectedGroupIds } = useGroupSelection();

  const parentRef = useRef(null);
  const choiceLabelDisplay = selectionChoiceLabel
    ? (Array.isArray(selectionChoiceLabel) ? selectionChoiceLabel : [selectionChoiceLabel]).join(" → ")
    : null;

  const flattenedItems = useMemo(() => {
    /** @type {Array<{ type: 'village', id: string, village: import('../context/ScoutGroupSelectorContext.jsx').Village, isAllSelected: boolean, isPartiallySelected: boolean, isExpanded: boolean } | { type: 'scoutGroup', id: string, scoutGroup: import('../context/ScoutGroupSelectorContext.jsx').ScoutGroup, villageId: string | number }>} */
    const items = [];
    filteredVillages.forEach((village) => {
      const scoutGroupIds = village.ScoutGroups.map((sg) => sg.id);
      const selectedInVillage = scoutGroupIds.filter((id) => selectedGroupIds.has(id));
      const isAllSelected =
        scoutGroupIds.length > 0 && selectedInVillage.length === scoutGroupIds.length;
      const isPartiallySelected = selectedInVillage.length > 0 && !isAllSelected;
      const isExpanded = expandedVillageIds.has(village.id);

      items.push({
        type: /** @type {const} */ ("village"),
        id: `village-${village.id}`,
        village,
        isAllSelected,
        isPartiallySelected,
        isExpanded,
      });

      if (isExpanded) {
        village.ScoutGroups.forEach((scoutGroup) => {
          items.push({
            type: /** @type {const} */ ("scoutGroup"),
            id: `scoutGroup-${scoutGroup.id}`,
            scoutGroup,
            villageId: village.id,
          });
        });
      }
    });
    return items;
  }, [filteredVillages, expandedVillageIds, selectedGroupIds]);

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (flattenedItems[index].type === "village" ? 64 : 48),
    overscan: 10,
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 3, pb: 0 }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
      >
        <Typography variant="h5" component="h2" fontWeight="600">
          Byar och kårer
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button size="small" onClick={selectedGroupIds.size > 0 ? clearSelection : selectAll}>
            {selectedGroupIds.size > 0 ? "Rensa" : "Välj alla"}
          </Button>
          {showCloseButton && (
            <IconButton onClick={toggleDrawer} aria-label="Stäng meny">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {choiceLabelDisplay && (
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
          title={`Valt utifrån: ${choiceLabelDisplay}`}
        >
          Valt utifrån: {choiceLabelDisplay}
        </Typography>
      )}

      <SearchField
        placeholder="Sök efter by eller kår..."
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <Box
        ref={parentRef}
        sx={{ flexGrow: 1, overflowY: "auto", pr: 1, minHeight: 0, position: "relative" }}
      >
        <div
          style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}
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
                {item.type === "village" ? (
                  <VillageListItem
                    village={item.village}
                    isAllSelected={item.isAllSelected}
                    isPartiallySelected={item.isPartiallySelected}
                    isExpanded={item.isExpanded}
                    renderChildrenExternally={true}
                  />
                ) : (
                  <div style={{ paddingLeft: "32px" }}>
                    <ScoutGroupListItem scoutGroup={item.scoutGroup} />
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

export default function ScoutGroupSelector() {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));
  const { isDrawerOpen, toggleDrawer } = useScoutGroupSelectorContext();

  const drawerContent = <DrawerContent showCloseButton={!isLargeScreen} />;

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
        "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
