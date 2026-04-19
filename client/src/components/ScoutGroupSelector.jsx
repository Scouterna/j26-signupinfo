import { useRef } from "react";
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
import ScoutGroupListItem from "./ScoutGroupListItem.jsx";
import { DRAWER_WIDTH } from "../constants/layout.js";
import { useGroupSelection } from "../context/GroupSelectionContext.jsx";
import { useScoutGroupSelectorContext } from "../context/ScoutGroupSelectorContext.jsx";

/**
 * @param {{ showCloseButton: boolean }} props
 */
function DrawerContent({ showCloseButton }) {
  const {
    filteredScoutGroups,
    selectionChoiceLabel,
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

  const rowVirtualizer = useVirtualizer({
    count: filteredScoutGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 3, pb: 0 }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
      >
        <Typography variant="h5" component="h2" fontWeight="600">
          Kårer
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
        placeholder="Sök efter kår..."
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
            const scoutGroup = filteredScoutGroups[virtualRow.index];
            return (
              <div
                key={scoutGroup.id}
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
                <ScoutGroupListItem scoutGroup={scoutGroup} />
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
