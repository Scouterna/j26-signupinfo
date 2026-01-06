import { Box, Paper, Typography, Chip } from "@mui/material";
import React from "react";
import PropTypes from "prop-types";

import StatisticSelector from "./StatisticSelector.jsx";

import StatisticBox from "./StatisticBox.jsx";

export default function StatisticPaper({
  numScoutGroupsSelected,
  totalParticipants,
  statistics,
  selectedStatistics,
  setSelectedStatistics,
}) {
  const handleStatisticChange = (event) => {
    const {
      target: { value },
    } = event;
    setSelectedStatistics(typeof value === "string" ? value.split(",") : value);
  };

  const handleChipDelete = (statToDelete) => () => {
    setSelectedStatistics((prevStats) =>
      prevStats.filter((stat) => stat !== statToDelete)
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        height: "100%",
        gap: "16px",
      }}
    >
      <Typography variant="h5" component="h2" fontWeight="600">
        Statistik
      </Typography>

      {/* Container for StatisticBoxes and Selector */}
      <Box sx={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatisticBox
          title="Antal valda kårer"
          value={numScoutGroupsSelected}
        />
        <StatisticBox title="Antal deltagare" value={totalParticipants} />
        <StatisticSelector
          title="Vald statistik"
          value={selectedStatistics}
          options={statistics}
          onChange={handleStatisticChange}
        />
      </Box>

      {/* Display selected statistics as external Chips below the selector */}
      {selectedStatistics.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            paddingTop: "8px",
          }}
        >
          {selectedStatistics.map((stat) => (
            <Chip
              key={stat}
              label={stat}
              onDelete={handleChipDelete(stat)}
              color="primary"
              variant="outlined"
              size="medium"
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}

StatisticPaper.propTypes = {
  numScoutGroupsSelected: PropTypes.number.isRequired,
  totalParticipants: PropTypes.number.isRequired,
  statistics: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedStatistics: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedStatistics: PropTypes.func.isRequired,
};
