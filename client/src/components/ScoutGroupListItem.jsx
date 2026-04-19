import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";
import { useGroupSelection } from "../context/GroupSelectionContext.jsx";
import { useScoutGroupSelectorContext } from "../context/ScoutGroupSelectorContext.jsx";

/**
 * @param {object} props
 * @param {{ id: number, name: string }} props.scoutGroup
 */
export default function ScoutGroupListItem({ scoutGroup }) {
  const { selectedGroupIds } = useGroupSelection();
  const { toggleScoutGroup, selectionChoiceLabel } = useScoutGroupSelectorContext();
  const isSelected = selectedGroupIds.has(scoutGroup.id);
  const hasChoiceTint = isSelected && selectionChoiceLabel;

  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => toggleScoutGroup(scoutGroup.id)}
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
