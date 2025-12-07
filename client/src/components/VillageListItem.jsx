import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Checkbox,
  IconButton,
  List,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import ScoutGroupListItem from "./ScoutGroupListItem";

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
              onChange={() => handleSelection("village", village.id)}
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
          <IconButton edge="end">
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </ListItemButton>
      </ListItem>
      <Collapse in={isExpanded}>
        <List component="div" disablePadding sx={{ paddingLeft: "32px" }}>
          {village.ScoutGroups.map((ScoutGroup) => (
            <ScoutGroupListItem
              key={ScoutGroup.id}
              ScoutGroup={ScoutGroup}
              selectedScoutGroupIds={selectedScoutGroupIds}
              handleSelection={handleSelection}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}
