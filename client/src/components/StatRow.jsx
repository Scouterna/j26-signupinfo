import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";

export default function StatRow({ label, value, total, showPercentage = false }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const displayValue = showPercentage 
    ? `${Math.round(percentage)}%` 
    : value;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "8px 0",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          flex: "0 0 120px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={label}
      >
        {label}
      </Typography>
      
      {/* Mini bar chart */}
      <Box
        sx={{
          flex: 1,
          height: "8px",
          backgroundColor: "rgba(0, 0, 0, 0.06)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${Math.min(percentage, 100)}%`,
            height: "100%",
            backgroundColor: "primary.main",
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />
      </Box>
      
      <Typography
        variant="body2"
        fontWeight="600"
        sx={{
          flex: "0 0 50px",
          textAlign: "right",
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  );
}

StatRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  showPercentage: PropTypes.bool,
};
