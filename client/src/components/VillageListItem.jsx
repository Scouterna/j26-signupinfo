import PropTypes from "prop-types";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Checkbox,
  List,
} from "@mui/material";
import ExpandCollapseButton from "./ExpandCollapseButton";
import ScoutGroupListItem from "./ScoutGroupListItem";
import { SELECTION_TYPES } from "../constants/selectionTypes";

export default function VillageListItem({
  village,
  isAllSelected,
  isPartiallySelected,
  isExpanded,
  toggleVillageExpansion,
  handleSelection,
  selectedScoutGroupIds,
}) {
  return (
    <>
      <ListItem
        disablePadding
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          borderRadius: "8px",
          marginBottom: "8px",
        }}
      >
        <ListItemButton
          onClick={() => toggleVillageExpansion(village.id)}
          sx={{ borderRadius: "8px" }}
        >
          <ListItemIcon sx={{ minWidth: 32, mr: 0 }}>
            <Checkbox
              edge="start"
              size="small"
              checked={isAllSelected}
              indeterminate={isPartiallySelected}
              onChange={() => handleSelection(SELECTION_TYPES.VILLAGE, village.id)}
              onClick={(e) => e.stopPropagation()}
              sx={{ p: 0.5 }}
            />
          </ListItemIcon>
          <ListItemText
            primary={village.name}
            sx={{
              fontWeight: "bold",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          />
          <ExpandCollapseButton isExpanded={isExpanded} />
        </ListItemButton>
      </ListItem>
      <Collapse in={isExpanded}>
        <List component="div" disablePadding sx={{ paddingLeft: "32px" }}>
          {village.ScoutGroups.map((scoutGroup) => (
            <ScoutGroupListItem
              key={scoutGroup.id}
              scoutGroup={scoutGroup}
              selectedScoutGroupIds={selectedScoutGroupIds}
              handleSelection={handleSelection}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

VillageListItem.propTypes = {
  /** Village object with id, name, and ScoutGroups array */
  village: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    ScoutGroups: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  /** Whether all scout groups in this village are selected */
  isAllSelected: PropTypes.bool.isRequired,
  /** Whether some (but not all) scout groups are selected */
  isPartiallySelected: PropTypes.bool.isRequired,
  /** Whether the village list is expanded */
  isExpanded: PropTypes.bool.isRequired,
  /** Handler to toggle village expansion */
  toggleVillageExpansion: PropTypes.func.isRequired,
  /** Handler for selection changes */
  handleSelection: PropTypes.func.isRequired,
  /** Set of currently selected scout group IDs */
  selectedScoutGroupIds: PropTypes.instanceOf(Set).isRequired,
};
