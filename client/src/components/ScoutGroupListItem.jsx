import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { SELECTION_TYPES } from "../constants/selectionTypes";

/**
 * @param {object} props
 * @param {{ id: string | number, name: string }} props.scoutGroup
 * @param {Set<string | number>} props.selectedScoutGroupIds
 * @param {(type: string, id: string | number) => void} props.handleSelection
 * @param {string | string[]} [props.selectionChoiceLabel]
 */
export default function ScoutGroupListItem({
  scoutGroup,
  selectedScoutGroupIds,
  handleSelection,
  selectionChoiceLabel,
}) {
  const isSelected = selectedScoutGroupIds.has(scoutGroup.id);
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
            checked={selectedScoutGroupIds.has(scoutGroup.id)}
            sx={{ p: 0.5 }}
          />
        </ListItemIcon>
        <ListItemText primary={scoutGroup.name} />
      </ListItemButton>
    </ListItem>
  );
}
