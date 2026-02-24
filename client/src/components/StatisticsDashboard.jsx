import { useState, useCallback, useMemo } from "react";
import { Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleIcon from "@mui/icons-material/People";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import PropTypes from "prop-types";

import HeroMetric from "./HeroMetric.jsx";
import StatisticChipSelector from "./StatisticChipSelector.jsx";
import ScoutGroupTable from "./ScoutGroupTable.jsx";
import {
  SubQuestionValues,
  GroupedAnswerValues,
} from "./StatisticPaper.jsx";

/**
 * Build synthetic stat data for "Deltagare" (num_participants) from selected scout groups.
 * Maps to the same structure as other stats so SubQuestionValues/GroupedAnswerValues can render it.
 */
function buildNumParticipantsStatData(selectedScoutGroups, totalParticipants) {
  const groupedByAnswer = {};
  if (selectedScoutGroups.length === 0) {
    groupedByAnswer["Totalt"] = { count: totalParticipants, scoutGroups: [] };
  } else {
    for (const g of selectedScoutGroups) {
      const count = g.num_participants ?? 0;
      const label = g.name ?? String(g.id);
      groupedByAnswer[label] = {
        count,
        scoutGroups: [{ id: g.id, name: g.name }],
      };
    }
  }
  return {
    subQuestions: {
      _direct: { groupedByAnswer },
    },
  };
}

export default function StatisticsDashboard({
  numScoutGroupsSelected,
  totalParticipants,
  statistics,
  statisticSubQuestions = {},
  sectionIdToText = {},
  questionIdToText = {},
  selectedStatistics,
  setSelectedStatistics,
  getStatisticData,
  selectedScoutGroups,
  onReplaceSelection,
}) {
  const [viewMode, setViewMode] = useState("statistics");
  const [selectedSubQuestions, setSelectedSubQuestions] = useState({});

  // undefined = remove entry (deselect), null = all sub-questions, [...] = specific subset
  const handleSubQuestionToggle = useCallback((statName, subQuestionNames) => {
    setSelectedSubQuestions((prev) => {
      const next = { ...prev };
      if (subQuestionNames === undefined) {
        delete next[statName];
      } else {
        next[statName] = subQuestionNames;
      }
      return next;
    });
  }, []);

  const handleClearAllSubQuestions = useCallback(() => {
    setSelectedSubQuestions({});
  }, []);

  const idToDisplayText = useMemo(
    () => ({ ...sectionIdToText, ...questionIdToText }),
    [sectionIdToText, questionIdToText]
  );

  // Combine non-sub stats from selectedStatistics + sub-category stats from selectedSubQuestions
  const effectiveSelectedStats = useMemo(() => {
    const nonSubSelected = selectedStatistics.filter(
      (s) => !(s in statisticSubQuestions)
    );
    const subSelected = Object.keys(selectedSubQuestions);
    return [...nonSubSelected, ...subSelected];
  }, [selectedStatistics, selectedSubQuestions, statisticSubQuestions]);

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        minHeight: 0, // Fixes overflow issues when a child like ScoutGroupTable tries to use 100% height of parent
      }}
    >
      {/* Page Title + View Toggle */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h5" component="h1" fontWeight="600">
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

      {/* Hero Metrics Section */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <HeroMetric
          icon={<GroupsIcon fontSize="large" />}
          label="Valda kårer"
          value={numScoutGroupsSelected}
          emphasis="primary"
        />
        <HeroMetric
          icon={<PeopleIcon fontSize="large" />}
          label="Deltagare"
          value={totalParticipants}
          emphasis="secondary"
        />
      </Box>

      {/* Statistic Chip Selector - shown for both statistics and table view */}
      <Box
        sx={{
          padding: "16px 20px",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          borderRadius: "12px",
        }}
      >
        <StatisticChipSelector
          options={statistics}
          selectedOptions={selectedStatistics}
          onToggle={setSelectedStatistics}
          subQuestionMap={statisticSubQuestions}
          selectedSubQuestions={selectedSubQuestions}
          onSubQuestionToggle={handleSubQuestionToggle}
          onClearAllSubQuestions={handleClearAllSubQuestions}
          idToDisplayText={idToDisplayText}
        />
      </Box>

      {/* Statistics view */}
      {viewMode === "statistics" && (
        <>
          {/* Selected Statistics Cards - StatisticPaper logic, StatisticCard styling */}
          {effectiveSelectedStats.length > 0 ? (
            <Box
              sx={{
                columnWidth: "300px",
                columnGap: "16px",
              }}
            >
              {effectiveSelectedStats.map((statName) => {
                const statData =
                  statName === "num_participants"
                    ? buildNumParticipantsStatData(
                        selectedScoutGroups,
                        totalParticipants
                      )
                    : getStatisticData(statName);
                const { subQuestions } = statData;
                const allEntries = Object.entries(
                  subQuestions || {}
                ).sort(([, a], [, b]) => {
                  const aHasFreeText = Object.values(a.values || {}).some(
                    (v) =>
                      v.freeTextAnswers && v.freeTextAnswers.length > 0
                  );
                  const bHasFreeText = Object.values(b.values || {}).some(
                    (v) =>
                      v.freeTextAnswers && v.freeTextAnswers.length > 0
                  );
                  return aHasFreeText - bHasFreeText;
                });

                // For sub-category stats, filter by selected sub-questions
                // null = show all, [...] = show subset, undefined = not in map (non-sub stat, show all)
                const activeSubQs = selectedSubQuestions[statName];
                const subQuestionEntries =
                  Array.isArray(activeSubQs)
                    ? allEntries.filter(
                        ([name]) =>
                          name === "_direct" || activeSubQs.includes(name)
                      )
                    : allEntries;

                return (
                  <Box
                    key={statName}
                    sx={{
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid",
                      borderColor: "divider",
                      breakInside: "avoid",
                      marginBottom: "16px",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="600"
                      sx={{ marginBottom: "16px" }}
                    >
                      {sectionIdToText[statName] ?? statName}
                    </Typography>

                    {subQuestionEntries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Ingen data tillgänglig
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {subQuestionEntries.map(
                          ([subQuestionName, subQuestion]) => {
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
                                    {questionIdToText[subQuestionName] ?? subQuestionName}
                                  </Typography>
                                )}
                                <SubQuestionValues
                                  subQuestion={subQuestion}
                                  useStatRow
                                  onSelectByAnswer={onReplaceSelection}
                                  idToDisplayText={questionIdToText}
                                />
                              </Box>
                            );
                          }
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          ) : (
            /* Empty state */
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                backgroundColor: "rgba(0, 0, 0, 0.02)",
                borderRadius: "12px",
                border: "2px dashed",
                borderColor: "divider",
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Välj statistik ovan för att visa detaljerad data
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        selectedScoutGroups.length > 0 ? (
          <ScoutGroupTable
            scoutGroups={selectedScoutGroups}
            selectedStatistics={selectedStatistics}
            statisticSubQuestions={statisticSubQuestions}
            selectedSubQuestions={selectedSubQuestions}
            sectionIdToText={sectionIdToText}
            questionIdToText={questionIdToText}
          />
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px",
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              borderRadius: "12px",
              border: "2px dashed",
              borderColor: "divider",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Välj kårer i sidopanelen för att visa tabellen
            </Typography>
          </Box>
        )
      )}
    </Box>
  );
}

StatisticsDashboard.propTypes = {
  numScoutGroupsSelected: PropTypes.number.isRequired,
  totalParticipants: PropTypes.number.isRequired,
  statistics: PropTypes.arrayOf(PropTypes.string).isRequired,
  statisticSubQuestions: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
  sectionIdToText: PropTypes.objectOf(PropTypes.string),
  questionIdToText: PropTypes.objectOf(PropTypes.string),
  selectedStatistics: PropTypes.arrayOf(PropTypes.string).isRequired,
  setSelectedStatistics: PropTypes.func.isRequired,
  getStatisticData: PropTypes.func.isRequired,
  selectedScoutGroups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      num_participants: PropTypes.number,
      stats: PropTypes.object,
    })
  ).isRequired,
  onReplaceSelection: PropTypes.func,
};
