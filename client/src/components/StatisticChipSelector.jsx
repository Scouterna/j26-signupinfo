import { useState } from "react";
import { Box, Chip, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ClearIcon from "@mui/icons-material/Clear";
import PropTypes from "prop-types";

const MAX_VISIBLE = 8;

export default function StatisticChipSelector({
  options,
  selectedOptions,
  onToggle,
}) {
  const [expanded, setExpanded] = useState(false);

  const isSelected = (option) => selectedOptions.includes(option);

  const handleToggle = (option) => {
    if (isSelected(option)) {
      onToggle(selectedOptions.filter((s) => s !== option));
    } else {
      onToggle([...selectedOptions, option]);
    }
  };

  // Sort selected chips to front when collapsed
  const sortedOptions = [...options].sort((a, b) => {
    const aSelected = selectedOptions.includes(a);
    const bSelected = selectedOptions.includes(b);
    return bSelected - aSelected;
  });

  const visibleOptions = expanded
    ? options
    : sortedOptions.slice(0, MAX_VISIBLE);
  const hiddenCount = options.length - MAX_VISIBLE;
  const showToggle = hiddenCount > 0;

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
        {visibleOptions.map((option) => (
          <Chip
            key={option}
            label={option}
            onClick={() => handleToggle(option)}
            variant={isSelected(option) ? "filled" : "outlined"}
            color={isSelected(option) ? "primary" : "default"}
            sx={{
              transition: "all 0.2s ease",
              fontWeight: isSelected(option) ? 600 : 400,
              "&:hover": {
                transform: "scale(1.02)",
              },
            }}
          />
        ))}
        {showToggle && (
          <Chip
            label={expanded ? "Visa färre" : `Visa fler (+${hiddenCount})`}
            onClick={() => setExpanded(!expanded)}
            variant="outlined"
            color="default"
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
        {selectedOptions.length > 0 && (
          <Chip
            label="Rensa alla"
            onClick={() => onToggle([])}
            variant="outlined"
            color="default"
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
    </Box>
  );
}

StatisticChipSelector.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
};
