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
  getStatisticData,
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

      {/* Display all selected statistics in boxes */}
      {selectedStatistics.length > 0 && (
        <Box
          sx={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: "8px" }}
        >
          {selectedStatistics.map((statName) => {
            const statData = getStatisticData(statName);
            return (
              <Box
                key={statName}
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "12px",
                  backgroundColor: "#fafafa",
                  minWidth: "200px",
                  flex: "1 1 auto",
                  maxWidth: "300px",
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="600"
                  sx={{ marginBottom: "8px" }}
                >
                  {statName}
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: "6px" }}
                >
                  {Object.entries(statData).map(([key, value]) => {
                    const hasNumericCount = Number.isFinite(value.count);
                    const leftLabel = hasNumericCount
                      ? value.name
                      : value.scoutGroupName ?? "scoutgroup";
                    const rightValue = hasNumericCount
                      ? value.count
                      : value.name;
                    return (
                      <Box key={key}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 8px",
                            backgroundColor: "white",
                            borderRadius: "4px",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                            }}
                          >
                            {leftLabel}
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {rightValue}
                          </Typography>
                        </Box>
                        {value.free_text_answers &&
                          value.free_text_answers.length > 0 && (
                            <Box sx={{ marginLeft: "16px", marginTop: "4px" }}>
                              {value.free_text_answers.map((answer, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "4px 8px",
                                    backgroundColor: "#f5f5f5",
                                    borderRadius: "4px",
                                    marginTop: "2px",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      overflowWrap: "anywhere",
                                      wordBreak: "break-word",
                                      whiteSpace: "normal",
                                    }}
                                  >
                                    {answer.text}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    fontWeight="500"
                                  >
                                    {answer.num_answers}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
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
  getStatisticData: PropTypes.func.isRequired,
};
