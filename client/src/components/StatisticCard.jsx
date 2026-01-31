import { Box, Typography, Paper } from "@mui/material";
import PropTypes from "prop-types";
import StatRow from "./StatRow.jsx";
import ExpandableAnswers from "./ExpandableAnswers.jsx";

export default function StatisticCard({ title, data }) {
  // Calculate total for percentage bars
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, item]) => {
    const count = Number.isFinite(item.count) ? item.count : 0;
    return sum + count;
  }, 0);

  return (
    <Paper
      elevation={0}
      sx={{
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        minWidth: "280px",
        flex: "1 1 300px",
        maxWidth: "400px",
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight="600"
        sx={{ marginBottom: "16px" }}
      >
        {title}
      </Typography>
      
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {entries.map(([key, item]) => {
          const hasNumericCount = Number.isFinite(item.count);
          const label = hasNumericCount 
            ? item.name 
            : (item.scoutGroupName ?? "scoutgroup");
          const value = hasNumericCount ? item.count : 0;
          const displayName = hasNumericCount ? item.name : item.name;

          return (
            <Box key={key}>
              <StatRow
                label={label}
                value={value}
                total={total}
              />
              {item.free_text_answers && item.free_text_answers.length > 0 && (
                <ExpandableAnswers
                  answers={item.free_text_answers}
                  parentLabel={displayName}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

StatisticCard.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
};
