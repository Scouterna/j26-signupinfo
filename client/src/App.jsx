import { useState, useMemo } from "react";
import {
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  CircularProgress,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import useProjectQueries from "./hooks/useProjectQueries.js";
import useScoutGroupSelector from "./hooks/useScoutGroupSelector.js";
import useApiData from "./hooks/useApiData.js";
import useGroupSummary from "./hooks/useGroupSummary.js";
import useUrlHashState from "./hooks/useUrlHashState.js";
import { getSelectedScoutGroups } from "./hooks/useScoutGroupData.js";
import ScoutGroupSelector, {
  DrawerToggleButton,
} from "./components/ScoutGroupSelector.jsx";
import StatisticsDashboard from "./components/StatisticsDashboard.jsx";

const DRAWER_WIDTH = 340;
const EMPTY_DATA = { villages: [] };

export default function App() {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));

  const {
    projectId,
    statistics,
    statisticSubQuestions,
    sectionIdToText,
    questionIdToText,
    booleanQuestionIds,
    villagesData,
    groupIdToName,
    isLoading: projectLoading,
    error: projectError,
  } = useProjectQueries();

  const { data, loading: dataLoading, error: dataError, refetch } = useApiData(projectId);

  const { viewMode, isFullscreen, setViewMode, setIsFullscreen } = useUrlHashState();

  const selectorState = useScoutGroupSelector(villagesData);
  const { selectedScoutGroupIds, replaceSelectionWithIds, isDrawerOpen, toggleDrawer } =
    selectorState;

  const {
    totalParticipants,
    getStatisticData,
    error: summaryError,
  } = useGroupSummary(projectId, selectedScoutGroupIds);

  const statsData = data || EMPTY_DATA;
  const selectedScoutGroups = useMemo(
    () => getSelectedScoutGroups(statsData.villages, selectedScoutGroupIds),
    [statsData.villages, selectedScoutGroupIds],
  );

  const [selectedStatistics, setSelectedStatistics] = useState(/** @type {string[]} */ ([]));

  const loading = projectLoading || dataLoading;
  const error = projectError || dataError || summaryError;

  // Loading state
  if (loading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Laddar data...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <Box sx={{ textAlign: "center", maxWidth: 400, px: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            Något gick fel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {error.message || "Kunde inte ladda data. Försök igen senare."}
          </Typography>
          <Button variant="contained" onClick={refetch}>
            Försök igen
          </Button>
        </Box>
      </Box>
    );
  }

  // No data state (shouldn't happen but handle gracefully)
  if (!data) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <Typography variant="body1">Ingen data tillgänglig</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      <CssBaseline />

      {/* Mobile app bar with drawer toggle */}
      {!isLargeScreen && (
        <AppBar
          position="fixed"
          sx={{
            bgcolor: "background.paper",
            color: "text.primary",
          }}
          elevation={1}
        >
          <Toolbar>
            <DrawerToggleButton
              onClick={toggleDrawer}
              selectedCount={selectedScoutGroupIds.size}
            />
            <Typography variant="h6" noWrap component="div">
              Anmälningsstatistik
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Scout group selector drawer */}
      <ScoutGroupSelector {...selectorState} />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
          p: { xs: 2, lg: 4 },
          width: { xs: "100%", lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: "64px", lg: 0 },
          height: { lg: "100vh" },
          boxSizing: "border-box",
          overflow: "auto",
        }}
      >
        <StatisticsDashboard
          numScoutGroupsSelected={selectedScoutGroupIds.size}
          totalParticipants={totalParticipants}
          statistics={statistics}
          statisticSubQuestions={statisticSubQuestions}
          sectionIdToText={sectionIdToText}
          questionIdToText={questionIdToText}
          booleanQuestionIds={booleanQuestionIds}
          selectedStatistics={selectedStatistics}
          setSelectedStatistics={setSelectedStatistics}
          getStatisticData={getStatisticData}
          selectedScoutGroups={selectedScoutGroups}
          onReplaceSelection={replaceSelectionWithIds}
          projectId={projectId}
          selectedGroupIds={selectedScoutGroupIds}
          groupIdToName={groupIdToName}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
        />
      </Box>
    </Box>
  );
}
