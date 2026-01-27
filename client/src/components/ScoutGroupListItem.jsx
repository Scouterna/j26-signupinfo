import PropTypes from "prop-types";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { SELECTION_TYPES } from "../constants/selectionTypes";

export default function ScoutGroupListItem({
  scoutGroup,
  selectedScoutGroupIds,
  handleSelection,
}) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => handleSelection(SELECTION_TYPES.SCOUT_GROUP, scoutGroup.id)}
      >
        <ListItemIcon sx={{ minWidth: 32, mr: 0 }}>
          <Checkbox
            edge="start"
            size="small"
            checked={selectedScoutGroupIds.has(scoutGroup.id)}
            sx={{ p: 0.5 }}
          />
        </ListItemIcon>
        <ListItemText primary={scoutGroup.name} />
      </ListItemButton>
    </ListItem>
  );
}

ScoutGroupListItem.propTypes = {
  /** Scout group object with id and name */
  scoutGroup: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  /** Set of currently selected scout group IDs */
  selectedScoutGroupIds: PropTypes.instanceOf(Set).isRequired,
  /** Handler for selection changes */
  handleSelection: PropTypes.func.isRequired,
};
