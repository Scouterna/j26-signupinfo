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

/**
 * @typedef {{ id: string | number, name: string }} ScoutGroup
 * @typedef {{ id: string | number, name: string, ScoutGroups: ScoutGroup[] }} Village
 */

/**
 * @param {object} props
 * @param {Village} props.village
 * @param {boolean} props.isAllSelected
 * @param {boolean} props.isPartiallySelected
 * @param {boolean} props.isExpanded
 * @param {(id: string | number) => void} props.toggleVillageExpansion
 * @param {(type: "village" | "ScoutGroup", id: string | number) => void} props.handleSelection
 * @param {boolean} [props.renderChildrenExternally]
 * @param {string | string[]} [props.selectionChoiceLabel]
 */
export default function VillageListItem({
  village,
  isAllSelected,
  isPartiallySelected,
  isExpanded,
  toggleVillageExpansion,
  handleSelection,
  renderChildrenExternally = false,
  selectionChoiceLabel,
}) {
  const hasChoiceTint =
    selectionChoiceLabel && (isAllSelected || isPartiallySelected);

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
          sx={{
            borderRadius: "8px",
            ...(hasChoiceTint && {
              backgroundColor: "rgba(255, 255, 0, 0.25)",
            }),
          }}
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
      {!renderChildrenExternally && (
        <Collapse in={isExpanded}>
          <List component="div" disablePadding sx={{ paddingLeft: "32px" }}>
            {village.ScoutGroups.map((scoutGroup) => (
              <ScoutGroupListItem
                key={scoutGroup.id}
                scoutGroup={scoutGroup}
                handleSelection={handleSelection}
                selectionChoiceLabel={selectionChoiceLabel}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}
