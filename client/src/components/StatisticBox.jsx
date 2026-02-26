import { Box, Typography } from "@mui/material";

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string | number} props.value
 */
export default function StatisticBox({ title, value }) {
  return (
    <Box
      sx={{
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderRadius: "8px",
        flex: "1 1 auto",
        minWidth: "180px",
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="h5"
        component="p"
        fontWeight="600"
        sx={{
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          whiteSpace: "normal",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
