import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";

export default function HeroMetric({ icon, label, value, emphasis = "primary" }) {
  const bgColor = emphasis === "primary" 
    ? "rgba(25, 118, 210, 0.08)" 
    : "rgba(156, 39, 176, 0.08)";
  
  const iconColor = emphasis === "primary" 
    ? "primary.main" 
    : "secondary.main";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "20px 24px",
        backgroundColor: bgColor,
        borderRadius: "12px",
        flex: "1 1 auto",
        minWidth: "200px",
      }}
    >
      {icon && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: iconColor,
            fontSize: "2rem",
          }}
        >
          {icon}
        </Box>
      )}
      <Box>
        <Typography
          variant="h4"
          component="p"
          fontWeight="700"
          sx={{ lineHeight: 1.2 }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ marginTop: "4px" }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

HeroMetric.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  emphasis: PropTypes.oneOf(["primary", "secondary"]),
};
