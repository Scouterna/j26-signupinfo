import PropTypes from "prop-types";
import { IconButton } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export default function ExpandCollapseButton({ isExpanded, ...props }) {
  return (
    <IconButton
      size="small"
      aria-label={isExpanded ? "Komprimera" : "Expandera"}
      {...props}
    >
      {isExpanded ? <ExpandLess /> : <ExpandMore />}
    </IconButton>
  );
}

ExpandCollapseButton.propTypes = {
  /** Whether the section is currently expanded */
  isExpanded: PropTypes.bool.isRequired,
  /** Click handler for the button */
  onClick: PropTypes.func,
};
