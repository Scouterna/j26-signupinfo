import { IconButton } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

/**
 * @param {object} props
 * @param {boolean} props.isExpanded
 * @param {import('react').MouseEventHandler<HTMLButtonElement>} [props.onClick]
 * @param {import('@mui/system').SxProps} [props.sx]
 */
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
