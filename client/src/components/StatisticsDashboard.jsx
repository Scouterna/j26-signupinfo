import { useState, useCallback, useMemo } from "react";
import { Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleIcon from "@mui/icons-material/People";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";

import HeroMetric from "./HeroMetric.jsx";
import StatisticChipSelector from "./StatisticChipSelector.jsx";
import ScoutGroupTable from "./ScoutGroupTable.jsx";
import { SubQuestionValues } from "./StatisticPaper.jsx";
import QuestionStats from "./QuestionStats.jsx";
import StatRow from "./StatRow.jsx";

/**
 * @typedef {{ id: number | string, name: string, num_participants?: number, stats?: Record<string, any> }} ScoutGroupItem
 */

/**
 * Build counts and pre-resolved groups for "Deltagare" (num_participants).
 * @param {ScoutGroupItem[]} selectedScoutGroups
 * @param {number} totalParticipants
 * @returns {{ counts: Record<string, number>, groups: Record<string, { id: number|string, name: string }[]> }}
 */
function buildNumParticipantsStatData(selectedScoutGroups, totalParticipants) {
  /** @type {Record<string, number>} */
  const counts = {};
  /** @type {Record<string, { id: number|string, name: string }[]>} */
  const groups = {};

  if (selectedScoutGroups.length === 0) {
    counts["Totalt"] = totalParticipants;
    groups["Totalt"] = [];
  } else {
    for (const g of selectedScoutGroups) {
      const label = g.name ?? String(g.id);
      counts[label] = g.num_participants ?? 0;
      groups[label] = [{ id: g.id, name: g.name }];
    }
  }
  return { counts, groups };
}

/**
 * @param {object} props
 * @param {number} props.numScoutGroupsSelected
 * @param {number} props.totalParticipants
 * @param {string[]} props.statistics
 * @param {Record<string, string[]>} [props.statisticSubQuestions]
 * @param {Record<string, string>} [props.sectionIdToText]
 * @param {Record<string, string>} [props.questionIdToText]
 * @param {Set<string>} [props.booleanQuestionIds]
 * @param {string[]} props.selectedStatistics
 * @param {(stats: string[]) => void} props.setSelectedStatistics
 * @param {(sectionId: string) => Record<string, Record<string, number> | number>} props.getStatisticData
 * @param {ScoutGroupItem[]} props.selectedScoutGroups
 * @param {((ids: number[], answerName: string) => void)} [props.onReplaceSelection]
 * @param {number|null} [props.projectId]
 * @param {Set<number>} [props.selectedGroupIds]
 * @param {Record<number, string>} [props.groupIdToName]
 */
export default function StatisticsDashboard({
  numScoutGroupsSelected,
  totalParticipants,
  statistics,
  statisticSubQuestions = {},
  sectionIdToText = {},
  questionIdToText = {},
  booleanQuestionIds = new Set(),
  selectedStatistics,
  setSelectedStatistics,
  getStatisticData,
  selectedScoutGroups,
  onReplaceSelection,
  projectId = null,
  selectedGroupIds = new Set(),
  groupIdToName = {},
}) {
  const [viewMode, setViewMode] = useState("statistics");
  const [selectedSubQuestions, setSelectedSubQuestions] = useState(
    /** @type {Record<string, string[] | null>} */ ({})
  );

  const handleSubQuestionToggle = useCallback((/** @type {string} */ statName, /** @type {string[] | null | undefined} */ subQuestionNames) => {
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

  const effectiveSelectedStats = useMemo(() => {
    const nonSubSelected = selectedStatistics.filter(
      (s) => !(s in statisticSubQuestions)
    );
    const subSelected = Object.keys(selectedSubQuestions);
    return [...nonSubSelected, ...subSelected];
  }, [selectedStatistics, selectedSubQuestions, statisticSubQuestions]);

  const handleViewModeChange = (/** @type {any} */ _event, /** @type {string | null} */ newMode) => {
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
        minHeight: 0,
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

      {/* Statistic Chip Selector */}
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
          {/* Selected Statistics Cards */}
          {effectiveSelectedStats.length > 0 ? (
            <Box
              sx={{
                columnWidth: "300px",
                columnGap: "16px",
              }}
            >
              {effectiveSelectedStats.map((statName) => {
                const isNumParticipants = statName === "num_participants";

                const activeSubQs = selectedSubQuestions[statName];

                let questionEntries;
                if (isNumParticipants) {
                  const { counts, groups } = buildNumParticipantsStatData(
                    selectedScoutGroups,
                    totalParticipants,
                  );
                  questionEntries = [["_direct", { counts, groups }]];
                } else {
                  const sectionData = getStatisticData(statName);
                  questionEntries = Object.entries(sectionData);
                  if (Array.isArray(activeSubQs)) {
                    questionEntries = questionEntries.filter(([qId]) =>
                      activeSubQs.includes(qId)
                    );
                  }
                }

                // Total for inline numeric StatRows (shared across all number-valued questions in section)
                const numericTotal = isNumParticipants
                  ? 0
                  : questionEntries.reduce(
                      (sum, [, v]) => (typeof v === "number" ? sum + v : sum),
                      0,
                    );

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

                    {questionEntries.length === 0 ? (
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
                        {questionEntries.map(([questionId, questionData]) => {
                          const isNumeric = typeof questionData === "number";
                          const isTextAnswers = Array.isArray(questionData);
                          const isBooleanQuestion = isNumeric && booleanQuestionIds.has(questionId);
                          const showHeader = questionId !== "_direct" && !isNumeric;
                          // For boolean questions the question label becomes the row label by
                          // overriding "checked" (the API answer key) with the question text.
                          const effectiveIdToDisplayText = isBooleanQuestion
                            ? { ...idToDisplayText, checked: questionIdToText[questionId] ?? questionId }
                            : idToDisplayText;
                          // Convert free-text answer arrays to a frequency count map for display.
                          const effectiveAnswerCounts = isTextAnswers
                            ? questionData.reduce((acc, text) => {
                                const key = text || "(tomt)";
                                acc[key] = (acc[key] || 0) + 1;
                                return acc;
                              }, {})
                            : questionData;
                          return (
                            <Box key={questionId}>
                              {showHeader && (
                                <Typography
                                  variant="body2"
                                  fontWeight="500"
                                  color="text.secondary"
                                  sx={{ marginBottom: "6px" }}
                                >
                                  {questionIdToText[questionId] ?? questionId}
                                </Typography>
                              )}
                              {isNumParticipants ? (
                                <SubQuestionValues
                                  answerCounts={questionData.counts}
                                  groups={questionData.groups}
                                  isLoadingGroups={false}
                                  onRequestGroups={() => {}}
                                  onSelectByAnswer={onReplaceSelection}
                                  idToDisplayText={questionIdToText}
                                />
                              ) : (isNumeric && !isBooleanQuestion) ? (
                                <StatRow
                                  label={questionIdToText[questionId] ?? questionId}
                                  value={questionData}
                                  total={numericTotal}
                                />
                              ) : (
                                <QuestionStats
                                  questionId={questionId}
                                  answerCounts={isBooleanQuestion ? { checked: questionData } : effectiveAnswerCounts}
                                  projectId={projectId}
                                  selectedGroupIds={selectedGroupIds}
                                  groupIdToName={groupIdToName}
                                  onSelectByAnswer={isTextAnswers ? undefined : onReplaceSelection}
                                  idToDisplayText={effectiveIdToDisplayText}
                                />
                              )}
                            </Box>
                          );
                        })}
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
