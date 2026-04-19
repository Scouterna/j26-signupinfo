import { useMemo } from "react";
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
import { getSelectedScoutGroups } from "./utils/scoutGroupUtils.js";
import ScoutGroupSelector from "./components/ScoutGroupSelector.jsx";
import DrawerToggleButton from "./components/DrawerToggleButton.jsx";
import StatisticsDashboard from "./components/StatisticsDashboard.jsx";
import { DRAWER_WIDTH } from "./constants/layout.js";
import ProjectConfigContext from "./context/ProjectConfigContext.jsx";
import GroupSelectionContext from "./context/GroupSelectionContext.jsx";
import ScoutGroupSelectorContext from "./context/ScoutGroupSelectorContext.jsx";

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
    sectionQuestions,
    questionChoices,
    questionTypes,
    scoutGroups,
    groupIdToName,
    isLoading: projectLoading,
    error: projectError,
  } = useProjectQueries();

  const { scoutGroups: detailedScoutGroups, loading: dataLoading, error: dataError, refetch } = useApiData(projectId);

  const selectorState = useScoutGroupSelector(scoutGroups);
  const { selectedScoutGroupIds, replaceSelectionWithIds } = selectorState;

  const {
    totalParticipants,
    getStatisticData,
    error: summaryError,
  } = useGroupSummary(projectId, selectedScoutGroupIds);

  const selectedScoutGroups = useMemo(
    () => getSelectedScoutGroups(detailedScoutGroups || [], selectedScoutGroupIds),
    [detailedScoutGroups, selectedScoutGroupIds],
  );

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
    const isUnauthorized = error.status === 401;
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <Box sx={{ textAlign: "center", maxWidth: 400, px: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            {isUnauthorized ? "Inte inloggad" : "Något gick fel"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isUnauthorized
              ? "Du behöver logga in för att se den här sidan."
              : error.message || "Kunde inte ladda data. Försök igen senare."}
          </Typography>
          {!isUnauthorized && (
            <Button variant="contained" sx={{ mt: 2 }} onClick={refetch}>
              Försök igen
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  // No data state (shouldn't happen but handle gracefully)
  if (!detailedScoutGroups) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <Typography variant="body1">Ingen data tillgänglig</Typography>
      </Box>
    );
  }

  // No groups configured
  if (scoutGroups.length === 0) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <Typography variant="body1">Inga kårer tillgängliga</Typography>
      </Box>
    );
  }

  const isSingleGroup = scoutGroups.length === 1;

  const projectConfig = {
    projectId,
    statistics,
    statisticSubQuestions,
    sectionIdToText,
    questionIdToText,
    booleanQuestionIds,
    sectionQuestions,
    questionChoices,
    questionTypes,
    groupIdToName,
  };

  const groupSelection = {
    selectedGroupIds: selectedScoutGroupIds,
    onReplaceSelection: replaceSelectionWithIds,
  };

  return (
    <ProjectConfigContext.Provider value={projectConfig}>
      <GroupSelectionContext.Provider value={groupSelection}>
        <ScoutGroupSelectorContext.Provider value={selectorState}>
        <Box sx={{ display: "flex", height: "100%" }}>
          <CssBaseline />

          {/* Mobile app bar with drawer toggle */}
          {!isSingleGroup && !isLargeScreen && (
            <AppBar
              position="fixed"
              sx={{
                bgcolor: "background.paper",
                color: "text.primary",
              }}
              elevation={1}
            >
              <Toolbar>
                <DrawerToggleButton />
                <Typography variant="h6" noWrap component="div">
                  Anmälningsstatistik
                </Typography>
              </Toolbar>
            </AppBar>
          )}

          {/* Scout group selector drawer */}
          {!isSingleGroup && <ScoutGroupSelector />}

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
              width: isSingleGroup
                ? "100%"
                : { xs: "100%", lg: `calc(100% - ${DRAWER_WIDTH}px)` },
              mt: isSingleGroup ? 0 : { xs: "64px", lg: 0 },
              height: { lg: "100vh" },
              boxSizing: "border-box",
              overflow: "auto",
            }}
          >
            <StatisticsDashboard
              numScoutGroupsSelected={selectedScoutGroupIds.size}
              totalParticipants={totalParticipants}
              getStatisticData={getStatisticData}
              selectedScoutGroups={selectedScoutGroups}
              isSingleGroup={isSingleGroup}
            />
          </Box>
        </Box>
        </ScoutGroupSelectorContext.Provider>
      </GroupSelectionContext.Provider>
    </ProjectConfigContext.Provider>
  );
}
