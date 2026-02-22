import { useState } from "react";
import {
  Box,
  Chip,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import PropTypes from "prop-types";

const MAX_VISIBLE = 8;

/**
 * Selection model:
 *
 * - Chips WITHOUT sub-categories use `selectedOptions` / `onToggle` (simple toggle).
 * - Chips WITH sub-categories use `selectedSubQuestions` / `onSubQuestionToggle`:
 *     key absent        → not active, nothing shown
 *     key present, null → fully active, all sub-questions shown
 *     key present, [..] → partially active, only those sub-questions shown
 *
 * Clicking a sub-category chip body toggles between "all" and "none".
 * Using the dropdown arrow lets users pick individual sub-questions.
 */
export default function StatisticChipSelector({
  options,
  selectedOptions,
  onToggle,
  subQuestionMap = {},
  selectedSubQuestions = {},
  onSubQuestionToggle,
  onClearAllSubQuestions,
  idToDisplayText = {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [popoverOption, setPopoverOption] = useState(null);

  const getSubQuestions = (option) => subQuestionMap[option] || null;

  // Whether a chip is active (should be shown as selected / partially selected)
  const isChipActive = (option) => {
    if (getSubQuestions(option)) {
      return option in selectedSubQuestions;
    }
    return selectedOptions.includes(option);
  };

  // Fully selected = all sub-questions (value is null)
  const isFullySelected = (option) => {
    if (!getSubQuestions(option)) return selectedOptions.includes(option);
    return selectedSubQuestions[option] === null;
  };

  // Partially selected = some sub-questions (value is a non-empty array)
  const isPartiallySelected = (option) => {
    if (!getSubQuestions(option)) return false;
    const val = selectedSubQuestions[option];
    return Array.isArray(val) && val.length > 0;
  };

  // --- Chip body click ---
  const handleToggle = (option) => {
    const hasSubs = !!getSubQuestions(option);

    if (hasSubs) {
      if (isChipActive(option)) {
        // Active → deselect all (remove entry)
        onSubQuestionToggle(option, undefined);
      } else {
        // Inactive → select all
        onSubQuestionToggle(option, null);
      }
    } else {
      // Simple chip toggle
      if (selectedOptions.includes(option)) {
        onToggle(selectedOptions.filter((s) => s !== option));
      } else {
        onToggle([...selectedOptions, option]);
      }
    }
  };

  // --- Dropdown arrow click ---
  const handleDropdownClick = (event, option) => {
    event.stopPropagation();
    setPopoverAnchor(event.currentTarget);
    setPopoverOption(option);
  };

  const handlePopoverClose = () => {
    setPopoverAnchor(null);
    setPopoverOption(null);
  };

  // --- Chip label ---
  const getDisplayText = (id) => idToDisplayText[id] ?? id;

  const getChipLabel = (option) => {
    const subs = getSubQuestions(option);
    const displayOption = getDisplayText(option);
    if (!subs) return displayOption;
    if (!(option in selectedSubQuestions)) return displayOption;
    const active = selectedSubQuestions[option];
    if (active === null) return displayOption; // all selected
    return `${displayOption} (${active.length}/${subs.length})`;
  };

  // --- Popover: toggle individual sub-question ---
  const handleSubQuestionCheck = (subName) => {
    if (!onSubQuestionToggle || !popoverOption) return;
    const subs = getSubQuestions(popoverOption);
    if (!subs) return;

    const isActive = popoverOption in selectedSubQuestions;
    const current = isActive ? selectedSubQuestions[popoverOption] : undefined;

    if (!isActive) {
      // Not active yet → create entry with just this sub-question
      onSubQuestionToggle(popoverOption, [subName]);
    } else if (current === null) {
      // All selected → deselect this one
      const newSelection = subs.filter((s) => s !== subName);
      onSubQuestionToggle(
        popoverOption,
        newSelection.length === 0 ? undefined : newSelection
      );
    } else if (current.includes(subName)) {
      // Deselect this sub-question
      const newSelection = current.filter((s) => s !== subName);
      onSubQuestionToggle(
        popoverOption,
        newSelection.length === 0 ? undefined : newSelection
      );
    } else {
      // Select this sub-question
      const newSelection = [...current, subName];
      onSubQuestionToggle(
        popoverOption,
        newSelection.length === subs.length ? null : newSelection
      );
    }
  };

  // --- Popover: "Alla" toggle ---
  const handleSelectAll = () => {
    if (!onSubQuestionToggle || !popoverOption) return;
    if (isFullySelected(popoverOption)) {
      // All → none
      onSubQuestionToggle(popoverOption, undefined);
    } else {
      // None / partial → all
      onSubQuestionToggle(popoverOption, null);
    }
  };

  // --- Popover checkbox states ---
  const isSubQuestionChecked = (option, subName) => {
    if (!(option in selectedSubQuestions)) return false;
    const active = selectedSubQuestions[option];
    if (active === null) return true;
    return active.includes(subName);
  };

  const isAllChecked = (option) => {
    if (!(option in selectedSubQuestions)) return false;
    return selectedSubQuestions[option] === null;
  };

  // --- Sorting: active chips to front when collapsed ---
  const sortedOptions = [...options].sort((a, b) => {
    return Number(isChipActive(b)) - Number(isChipActive(a));
  });

  const visibleOptions = expanded
    ? options
    : sortedOptions.slice(0, MAX_VISIBLE);
  const hiddenCount = options.length - MAX_VISIBLE;
  const showToggle = hiddenCount > 0;

  const hasAnySelection =
    selectedOptions.length > 0 ||
    Object.keys(selectedSubQuestions).length > 0;

  const popoverSubs = popoverOption ? getSubQuestions(popoverOption) : null;

  return (
    <Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ marginBottom: "12px" }}
      >
        Välj statistik att visa
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {visibleOptions.map((option) => {
          const hasSubs = !!getSubQuestions(option);
          const active = isChipActive(option);
          const partial = isPartiallySelected(option);

          return (
            <Chip
              key={option}
              label={
                hasSubs ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                    }}
                  >
                    <span>{getChipLabel(option)}</span>
                    <ArrowDropDownIcon
                      fontSize="small"
                      onClick={(e) => handleDropdownClick(e, option)}
                      sx={{
                        ml: 0.25,
                        mr: -0.75,
                        cursor: "pointer",
                        borderRadius: "50%",
                        "&:hover": {
                          backgroundColor: active
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(0,0,0,0.1)",
                        },
                      }}
                    />
                  </Box>
                ) : (
                  getChipLabel(option)
                )
              }
              onClick={() => handleToggle(option)}
              variant={active ? "filled" : "outlined"}
              color={partial ? "secondary" : active ? "primary" : "default"}
              sx={{
                transition: "all 0.2s ease",
                fontWeight: active ? 600 : 400,
                "&:hover": {
                  transform: "scale(1.02)",
                },
              }}
            />
          );
        })}
        {showToggle && (
          <Chip
            label={expanded ? "Visa färre" : `Visa fler (+${hiddenCount})`}
            onClick={() => setExpanded(!expanded)}
            variant="outlined"
            color="info"
            icon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              transition: "all 0.2s ease",
              fontStyle: "italic",
              "&:hover": {
                transform: "scale(1.02)",
                backgroundColor: "action.hover",
              },
            }}
          />
        )}
        {hasAnySelection && (
          <Chip
            label="Rensa alla"
            onClick={() => {
              onToggle([]);
              if (onClearAllSubQuestions) onClearAllSubQuestions();
            }}
            variant="outlined"
            color="error"
            icon={<ClearIcon />}
            sx={{
              transition: "all 0.2s ease",
              fontStyle: "italic",
              "&:hover": {
                transform: "scale(1.02)",
                backgroundColor: "error.light",
                borderColor: "error.main",
                color: "error.contrastText",
              },
            }}
          />
        )}
      </Box>

      {/* Sub-question popover */}
      <Popover
        open={Boolean(popoverAnchor) && Boolean(popoverSubs)}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: { minWidth: 200, maxWidth: 320, maxHeight: 400 },
          },
        }}
      >
        {popoverSubs && popoverOption && (
          <List dense disablePadding>
            <ListItem disablePadding>
              <ListItemButton onClick={handleSelectAll} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    checked={isAllChecked(popoverOption)}
                    indeterminate={isPartiallySelected(popoverOption)}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary="Alla"
                  slotProps={{
                    primary: { variant: "body2", fontWeight: 600 },
                  }}
                />
              </ListItemButton>
            </ListItem>
            <Divider />
            {popoverSubs.map((subId) => (
              <ListItem key={subId} disablePadding>
                <ListItemButton
                  onClick={() => handleSubQuestionCheck(subId)}
                  sx={{ py: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      checked={isSubQuestionChecked(popoverOption, subId)}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={getDisplayText(subId)}
                    slotProps={{ primary: { variant: "body2" } }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </Box>
  );
}

StatisticChipSelector.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
  subQuestionMap: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
  selectedSubQuestions: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
  onSubQuestionToggle: PropTypes.func,
  onClearAllSubQuestions: PropTypes.func,
  idToDisplayText: PropTypes.objectOf(PropTypes.string),
};
