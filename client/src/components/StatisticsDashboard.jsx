import { useState, useCallback, useMemo } from "react";
import { Box, Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PeopleIcon from "@mui/icons-material/People";
import PersonIcon from "@mui/icons-material/Person";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";

import HeroMetric from "./HeroMetric.jsx";
import StatisticChipSelector from "./StatisticChipSelector.jsx";
import ScoutGroupTable from "./ScoutGroupTable.jsx";
import StatisticCard from "./StatisticCard.jsx";
import ProjectSwitcher from "./ProjectSwitcher.jsx";
import PeopleView from "./PeopleView.jsx";
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
 * @param {boolean} [props.isSingleGroup]
 * @param {Array<{ id: number, name: string }>} [props.projects]
 * @param {number|null} [props.projectId]
 * @param {(projectId: number) => void} [props.onProjectChange]
 */
export default function StatisticsDashboard({
  numScoutGroupsSelected,
  totalParticipants,
  getStatisticData,
  selectedScoutGroups,
  isSingleGroup = false,
  projects = [],
  projectId = null,
  onProjectChange,
}) {
  const { statistics, statisticSubQuestions, groupIdToName, projectId: configProjectId } = useProjectConfig();

  const scoutGroupsForPicker = useMemo(
    () =>
      Object.entries(groupIdToName)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name, "sv")),
    [groupIdToName]
  );

  const { viewMode: rawViewMode, isFullscreen, setViewMode, setIsFullscreen } = useUrlHashState();
  // Single-group projects drop the Tabell view (no cross-group comparison to
  // make). Fall back to Statistik if the URL hash from a prior multi-group
  // session resolves to "table".
  const viewMode = isSingleGroup && rawViewMode === "table" ? "statistics" : rawViewMode;

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
      setViewMode(/** @type {"statistics"|"table"|"people"} */ (newMode));
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
          {viewMode === "statistics"
            ? "Statistik"
            : viewMode === "people"
            ? "Personer"
            : "Kåröversikt"}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
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
            {!isSingleGroup && (
              <ToggleButton value="table" aria-label="table view">
                <TableChartIcon sx={{ mr: 0.5 }} />
                Tabell
              </ToggleButton>
            )}
            <ToggleButton value="people" aria-label="people view">
              <PersonIcon sx={{ mr: 0.5 }} />
              Personer
            </ToggleButton>
          </ToggleButtonGroup>
          <ProjectSwitcher
            projects={projects}
            value={projectId}
            onChange={onProjectChange ?? (() => {})}
          />
        </Box>
      </Box>

      {viewMode !== "people" && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {!isSingleGroup && (
            <HeroMetric
              icon={<GroupsIcon fontSize="large" />}
              label="Valda kårer"
              value={numScoutGroupsSelected}
              emphasis="primary"
            />
          )}
          <HeroMetric
            icon={<PeopleIcon fontSize="large" />}
            label="Deltagare"
            value={totalParticipants}
            emphasis="secondary"
          />
        </Box>
      )}

      {/* Statistic Chip Selector — shared across all views */}
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

      {/* People view */}
      {viewMode === "people" && (
        <PeopleView
          scoutGroups={scoutGroupsForPicker}
          projectId={configProjectId}
          selectedStatistics={selectedStatistics}
          selectedSubQuestions={selectedSubQuestions}
          isSingleGroup={isSingleGroup}
        />
      )}

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
