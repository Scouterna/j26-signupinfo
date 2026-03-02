import { Box, Typography } from "@mui/material";

/**
 * @param {object} props
 * @param {string} props.label
 * @param {number} props.value
 * @param {number} props.total
 * @param {boolean} [props.showPercentage]
 */
export default function StatRow({ label, value, total, showPercentage = false }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const displayValue = showPercentage 
    ? `${Math.round(percentage)}%` 
    : value;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        padding: "8px 0",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          wordBreak: "break-word",
        }}
      >
        {label}
      </Typography>
      
      {/* Mini bar chart */}
      <Box
        sx={{
          flex: "0 0 60px", // ← bar width: increase for a bigger bar
          alignSelf: "center",
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
          alignSelf: "center",
          textAlign: "right",
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  );
}
