import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from "@mui/material";

export default function ScoutGroupListItem({
  ScoutGroup,
  selectedScoutGroupIds,
  handleSelection,
}) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => handleSelection("ScoutGroup", ScoutGroup.id)}
      >
        <ListItemIcon sx={{ minWidth: 32, mr: 0 }}>
          <Checkbox
            edge="start"
            size="small"
            checked={selectedScoutGroupIds.has(ScoutGroup.id)}
            sx={{ p: 0.5 }}
          />
        </ListItemIcon>
        <ListItemText primary={ScoutGroup.name} />
      </ListItemButton>
    </ListItem>
  );
}
