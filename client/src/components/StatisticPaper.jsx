import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Paper,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";

import StatisticSelector from "./StatisticSelector.jsx";
import StatisticBox from "./StatisticBox.jsx";
import ExpandCollapseButton from "./ExpandCollapseButton.jsx";
import ScoutGroupTable from "./ScoutGroupTable.jsx";
import StatRow from "./StatRow.jsx";

/**
 * Renders grouped answer values with expandable scout group lists.
 * Used for perGroup type subQuestions (single-answer questions).
 * @param {boolean} useStatRow - When true, use StatRow with percentage bars (no-papers styling)
 * @param {function} onSelectByAnswer - When provided, enables "Välj dessa kårer" for each answer
 */
function GroupedAnswerValues({
  groupedByAnswer,
  useStatRow = false,
  onSelectByAnswer,
}) {
  const [expandedAnswers, setExpandedAnswers] = useState({});

  const toggleExpanded = (answerName) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [answerName]: !prev[answerName],
    }));
  };

  // Sort answers by count (descending), then alphabetically
  const sortedEntries = Object.entries(groupedByAnswer).sort((a, b) => {
    const countDiff = b[1].count - a[1].count;
    if (countDiff !== 0) return countDiff;
    return a[0].localeCompare(b[0], "sv");
  });

  const total = sortedEntries.reduce((sum, [, { count }]) => sum + count, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {sortedEntries.map(([answerName, { count, scoutGroups, scoutGroupIds }]) => {
        const isExpanded = expandedAnswers[answerName] || false;
        const canSelectByAnswer =
          onSelectByAnswer &&
          scoutGroupIds &&
          Array.isArray(scoutGroupIds) &&
          scoutGroupIds.length > 0;

        return (
          <Box key={answerName}>
            {useStatRow ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <ExpandCollapseButton
                  isExpanded={isExpanded}
                  onClick={() => toggleExpanded(answerName)}
                  sx={{ marginRight: "4px", marginLeft: "-8px", flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <StatRow
                    label={answerName || "(tomt)"}
                    value={count}
                    total={total}
                  />
                </Box>
                {canSelectByAnswer && (
                  <Tooltip title="Välj dessa kårer">
                    <IconButton
                      size="small"
                      onClick={() => onSelectByAnswer(scoutGroupIds, answerName)}
                      aria-label="Välj dessa kårer"
                      sx={{ flexShrink: 0 }}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 8px",
                  backgroundColor: "white",
                  borderRadius: "4px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <ExpandCollapseButton
                    isExpanded={isExpanded}
                    onClick={() => toggleExpanded(answerName)}
                    sx={{ marginRight: "4px", marginLeft: "-8px" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      flex: 1,
                      marginRight: "8px",
                    }}
                  >
                    {answerName || "(tomt)"}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="body2" fontWeight="600" sx={{ flexShrink: 0 }}>
                    {count}
                  </Typography>
                  {canSelectByAnswer && (
                    <Tooltip title="Välj dessa kårer">
                      <IconButton
                        size="small"
                        onClick={() => onSelectByAnswer(scoutGroupIds, answerName)}
                        aria-label="Välj dessa kårer"
                      >
                        <FilterListIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            )}
            {/* Expanded scout group list */}
            {isExpanded && (
              <Box sx={{ marginLeft: "32px", marginTop: "4px" }}>
                {scoutGroups.map((groupName, index) => (
                  <Box
                    key={index}
                    sx={{
                      padding: "4px 8px",
                      backgroundColor: useStatRow
                        ? "rgba(0, 0, 0, 0.02)"
                        : "#f0f0f0",
                      borderRadius: "4px",
                      marginTop: "2px",
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
                      {groupName}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

GroupedAnswerValues.propTypes = {
  groupedByAnswer: PropTypes.objectOf(
    PropTypes.shape({
      count: PropTypes.number.isRequired,
      scoutGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
      scoutGroupIds: PropTypes.arrayOf(PropTypes.number),
    })
  ).isRequired,
  useStatRow: PropTypes.bool,
  onSelectByAnswer: PropTypes.func,
};

/**
 * Renders values for a sub-question section.
 * @param {boolean} useStatRow - When true, use StatRow with percentage bars (no-papers styling)
 * @param {function} onSelectByAnswer - When provided, enables "Välj dessa kårer" for perGroup answers
 */
function SubQuestionValues({ subQuestion, useStatRow = false, onSelectByAnswer }) {
  const { type, values, groupedByAnswer } = subQuestion;
  const [expandedFreeText, setExpandedFreeText] = useState({});

  const toggleFreeTextExpanded = (key) => {
    setExpandedFreeText((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // For perGroup type with groupedByAnswer, use the grouped view
  if (type === "perGroup" && groupedByAnswer) {
    return (
      <GroupedAnswerValues
        groupedByAnswer={groupedByAnswer}
        useStatRow={useStatRow}
        onSelectByAnswer={onSelectByAnswer}
      />
    );
  }

  // Default rendering for answers type (and legacy perGroup without groupedByAnswer)
  const entries = Object.entries(values);
  const total = entries.reduce(
    (sum, [, v]) => sum + (Number.isFinite(v.count) ? v.count : 0),
    0
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {entries.map(([key, value]) => {
        const isPerGroup = type === "perGroup";
        const leftLabel = isPerGroup ? value.scoutGroupName : value.name;
        const rightValue = isPerGroup ? value.name : value.count;
        const count = Number.isFinite(value.count) ? value.count : 0;
        const hasFreeText = value.freeTextAnswers && value.freeTextAnswers.length > 0;
        const isFreeTextExpanded = expandedFreeText[key] || false;

        return (
          <Box key={key}>
            {useStatRow && !isPerGroup && Number.isFinite(value.count) ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {hasFreeText && (
                  <ExpandCollapseButton
                    isExpanded={isFreeTextExpanded}
                    onClick={() => toggleFreeTextExpanded(key)}
                    sx={{ marginRight: "4px", marginLeft: "-8px", flexShrink: 0 }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <StatRow label={leftLabel} value={count} total={total} />
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: useStatRow ? "4px 0" : "4px 8px",
                  backgroundColor: useStatRow ? "transparent" : "white",
                  borderRadius: "4px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  {hasFreeText && (
                    <ExpandCollapseButton
                      isExpanded={isFreeTextExpanded}
                      onClick={() => toggleFreeTextExpanded(key)}
                      sx={{ marginRight: "4px", marginLeft: "-8px" }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      flex: 1,
                      marginRight: "8px",
                    }}
                  >
                    {leftLabel}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="600" sx={{ flexShrink: 0 }}>
                  {rightValue}
                </Typography>
              </Box>
            )}
            {/* Free text answers - collapsible */}
            {hasFreeText && isFreeTextExpanded && (
              <Box sx={{ marginLeft: "32px", marginTop: "4px" }}>
                {value.freeTextAnswers.map((item, index) => {
                  const text =
                    typeof item === "string" ? item : item?.text ?? "";
                  const numAnswers =
                    typeof item === "object" && item?.num_answers != null
                      ? item.num_answers
                      : 1;
                  return (
                    <Box
                      key={index}
                      sx={{
                        padding: "4px 8px",
                        backgroundColor: "rgba(0, 0, 0, 0.02)",
                        borderRadius: "6px",
                        marginTop: "2px",
                        borderLeft: "3px solid",
                        borderLeftColor: "primary.light",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            flex: 1,
                          }}
                        >
                          {text}
                        </Typography>
                        {numAnswers > 1 && (
                          <Typography
                            variant="caption"
                            fontWeight="600"
                            sx={{ marginLeft: "12px", color: "text.secondary" }}
                          >
                            {numAnswers}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

SubQuestionValues.propTypes = {
  subQuestion: PropTypes.shape({
    type: PropTypes.oneOf(["answers", "perGroup"]).isRequired,
    values: PropTypes.object.isRequired,
    groupedByAnswer: PropTypes.objectOf(
      PropTypes.shape({
        count: PropTypes.number.isRequired,
        scoutGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
        scoutGroupIds: PropTypes.arrayOf(PropTypes.number),
      })
    ),
  }).isRequired,
  useStatRow: PropTypes.bool,
  onSelectByAnswer: PropTypes.func,
};

export { SubQuestionValues, GroupedAnswerValues };

export default function StatisticPaper({
  numScoutGroupsSelected,
  totalParticipants,
  statistics,
  selectedStatistics,
  setSelectedStatistics,
  getStatisticData,
  selectedScoutGroups,
}) {
  const [viewMode, setViewMode] = useState("statistics"); // "statistics" or "table"

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

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
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
        overflow: "auto",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" component="h2" fontWeight="600">
          {viewMode === "statistics" ? "Statistik" : "Kåröversikt"}
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
          size="small"
        >
          <ToggleButton value="statistics" aria-label="statistics view">
            <BarChartIcon sx={{ mr: 0.5 }} />
            Statistik
          </ToggleButton>
          <ToggleButton value="table" aria-label="table view">
            <TableChartIcon sx={{ mr: 0.5 }} />
            Tabell
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Container for StatisticBoxes and Selector */}
      <Box sx={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <StatisticBox
          title="Antal valda kårer"
          value={numScoutGroupsSelected}
        />
        <StatisticBox title="Antal deltagare" value={totalParticipants} />
        {viewMode === "statistics" && (
          <StatisticSelector
            title="Vald statistik"
            value={selectedStatistics}
            options={statistics}
            onChange={handleStatisticChange}
          />
        )}
      </Box>

      {/* Statistics view */}
      {viewMode === "statistics" && (
        <>
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
                const { subQuestions } = statData;
                // Sort sub-questions: those with free text answers go to the bottom
                const subQuestionEntries = Object.entries(subQuestions || {}).sort(
                  ([, a], [, b]) => {
                    const aHasFreeText = Object.values(a.values || {}).some(
                      (v) => v.freeTextAnswers && v.freeTextAnswers.length > 0
                    );
                    const bHasFreeText = Object.values(b.values || {}).some(
                      (v) => v.freeTextAnswers && v.freeTextAnswers.length > 0
                    );
                    // Items without free text come first (false < true)
                    return aHasFreeText - bHasFreeText;
                  }
                );

                return (
                  <Box
                    key={statName}
                    sx={{
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "#fafafa",
                      minWidth: "250px",
                      flex: "1 1 auto",
                      maxWidth: "400px",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="600"
                      sx={{ marginBottom: "12px" }}
                    >
                      {statName}
                    </Typography>

                    {subQuestionEntries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Ingen data tillgänglig
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {subQuestionEntries.map(([subQuestionName, subQuestion]) => {
                          // "_direct" means direct values without a sub-question header
                          const showHeader = subQuestionName !== "_direct";

                          return (
                            <Box key={subQuestionName}>
                              {showHeader && (
                                <Typography
                                  variant="body2"
                                  fontWeight="500"
                                  color="text.secondary"
                                  sx={{ marginBottom: "6px" }}
                                >
                                  {subQuestionName}
                                </Typography>
                              )}
                              <SubQuestionValues subQuestion={subQuestion} />
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedScoutGroups.length > 0 ? (
            <ScoutGroupTable scoutGroups={selectedScoutGroups} />
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              Välj kårer i sidopanelen för att visa tabellen
            </Typography>
          )}
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
  selectedScoutGroups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      num_participants: PropTypes.number,
      stats: PropTypes.object,
    })
  ).isRequired,
};
