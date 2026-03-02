import { Box, Typography, alpha, useTheme } from "@mui/material";

/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.icon]
 * @param {string} props.label
 * @param {string | number} props.value
 * @param {"primary" | "secondary"} [props.emphasis]
 */
export default function HeroMetric({ icon, label, value, emphasis = "primary" }) {
  const theme = useTheme();
  const color = theme.palette[emphasis].main;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "20px 24px",
        backgroundColor: alpha(color, 0.08),
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
            color: `${emphasis}.main`,
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
