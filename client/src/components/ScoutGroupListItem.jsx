import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { SELECTION_TYPES } from "../constants/selectionTypes";
import { useGroupSelection } from "../context/GroupSelectionContext.jsx";

/**
 * @param {object} props
 * @param {{ id: string | number, name: string }} props.scoutGroup
 * @param {(type: "village" | "ScoutGroup", id: string | number) => void} props.handleSelection
 * @param {string | string[]} [props.selectionChoiceLabel]
 */
export default function ScoutGroupListItem({
  scoutGroup,
  handleSelection,
  selectionChoiceLabel,
}) {
  const { selectedGroupIds } = useGroupSelection();
  const isSelected = selectedGroupIds.has(scoutGroup.id);
  const hasChoiceTint = isSelected && selectionChoiceLabel;

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => handleSelection(SELECTION_TYPES.SCOUT_GROUP, scoutGroup.id)}
        sx={
          hasChoiceTint
            ? { backgroundColor: "rgba(255, 255, 0, 0.25)" }
            : undefined
        }
      >
        <ListItemIcon sx={{ minWidth: 32, mr: 0 }}>
          <Checkbox
            edge="start"
            size="small"
            checked={isSelected}
            sx={{ p: 0.5 }}
          />
        </ListItemIcon>
        <ListItemText primary={scoutGroup.name} />
      </ListItemButton>
    </ListItem>
  );
}
