import { useState, useCallback, useMemo } from "react";
import { Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleIcon from "@mui/icons-material/People";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";

import HeroMetric from "./HeroMetric.jsx";
import StatisticChipSelector from "./StatisticChipSelector.jsx";
import ScoutGroupTable from "./ScoutGroupTable.jsx";
import StatisticCard from "./StatisticCard.jsx";
import useUrlHashState from "../hooks/useUrlHashState.js";
import { useProjectConfig } from "../context/ProjectConfigContext.jsx";

/**
 * @typedef {{ id: number | string, name: string, num_participants?: number, stats?: Record<string, any> }} ScoutGroupItem
 */

/**
 * @param {object} props
 * @param {number} props.numScoutGroupsSelected
 * @param {number} props.totalParticipants
 * @param {(sectionId: string) => Record<string, Record<string, number> | number>} props.getStatisticData
 * @param {ScoutGroupItem[]} props.selectedScoutGroups
 */
export default function StatisticsDashboard({
  numScoutGroupsSelected,
  totalParticipants,
  getStatisticData,
  selectedScoutGroups,
}) {
  const { statistics, statisticSubQuestions } = useProjectConfig();

  const { viewMode, isFullscreen, setViewMode, setIsFullscreen } = useUrlHashState();

  const [selectedStatistics, setSelectedStatistics] = useState(
    /** @type {string[]} */ ([])
  );
  const [selectedSubQuestions, setSelectedSubQuestions] = useState(
    /** @type {Record<string, string[] | null>} */ ({})
  );

  const handleSubQuestionToggle = useCallback(
    (/** @type {string} */ statName, /** @type {string[] | null | undefined} */ subQuestionNames) => {
      setSelectedSubQuestions((prev) => {
        const next = { ...prev };
        if (subQuestionNames === undefined) {
          delete next[statName];
        } else {
          next[statName] = subQuestionNames;
        }
        return next;
      });
    },
    []
  );

  const handleClearAllSubQuestions = useCallback(() => {
    setSelectedSubQuestions({});
  }, []);

  const effectiveSelectedStats = useMemo(() => {
    const nonSubSelected = selectedStatistics.filter(
      (s) => !(s in statisticSubQuestions)
    );
    const subSelected = Object.keys(selectedSubQuestions);
    return [...nonSubSelected, ...subSelected];
  }, [selectedStatistics, selectedSubQuestions, statisticSubQuestions]);

  const handleViewModeChange = (
    /** @type {any} */ _event,
    /** @type {string | null} */ newMode
  ) => {
    if (newMode !== null) {
      setViewMode(/** @type {"statistics"|"table"} */ (newMode));
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

      {/* Hero Metrics */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
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
          selectedSubQuestions={selectedSubQuestions}
          onSubQuestionToggle={handleSubQuestionToggle}
          onClearAllSubQuestions={handleClearAllSubQuestions}
        />
      </Box>

      {/* Statistics view */}
      {viewMode === "statistics" && (
        <>
          {effectiveSelectedStats.length > 0 ? (
            <Box
              sx={{
                columnWidth: "340px", // ← card width: increase to make cards wider
                columnGap: "16px",
              }}
            >
              {effectiveSelectedStats.map((statName) => (
                <StatisticCard
                  key={statName}
                  statName={statName}
                  activeSubQs={selectedSubQuestions[statName]}
                  getStatisticData={getStatisticData}
                  selectedScoutGroups={selectedScoutGroups}
                  totalParticipants={totalParticipants}
                />
              ))}
            </Box>
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
                Välj statistik ovan för att visa detaljerad data
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Table view */}
      {viewMode === "table" &&
        (selectedScoutGroups.length > 0 ? (
          <ScoutGroupTable
            scoutGroups={selectedScoutGroups}
            selectedStatistics={selectedStatistics}
            selectedSubQuestions={selectedSubQuestions}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
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
        ))}
    </Box>
  );
}
