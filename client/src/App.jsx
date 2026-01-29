import { CssBaseline, Box, CircularProgress, Typography, Button } from "@mui/material";
import useScoutGroupSelector from "./hooks/useScoutGroupSelector.js";
import useApiData from "./hooks/useApiData.js";
import ScoutGroupSelector from "./components/ScoutGroupSelector.jsx";
import StatisticPaper from "./components/StatisticPaper.jsx";

export default function App() {
  const { data, loading, error, refetch } = useApiData();
  const sidebarLogic = useScoutGroupSelector(data);
  const {
    isCollapsed,
    selectedScoutGroupIds,
    selectedScoutGroups,
    totalParticipants,
    statistics,
    selectedStatistics,
    setSelectedStatistics,
    getStatisticData,
  } = sidebarLogic;

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
    <Box sx={{ height: "100vh" }}>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          padding: { xs: "16px", lg: "32px" },
          width: "100%",
          height: "100vh",
          boxSizing: "border-box",
          gap: { xs: "16px", lg: "32px" },
          overflow: "auto",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            height: {
              xs: isCollapsed ? "fit-content" : "40vh",
              lg: isCollapsed ? "auto" : "100%",
            },
            maxHeight: { xs: "40vh", lg: "100%" },
            width: {
              xs: "100%",
              lg: isCollapsed ? "fit-content" : "340px",
            },
            transition: "all 0.3s ease",
          }}
        >
          <ScoutGroupSelector {...sidebarLogic} />
        </Box>
        <Box
          sx={{
            flex: { xs: "1 1 auto", lg: "1 1 auto" },
            height: { xs: "auto", lg: "100%" },
            minHeight: { xs: "200px", lg: "100%" },
            transition: "all 0.3s ease",
          }}
        >
          <StatisticPaper
            numScoutGroupsSelected={selectedScoutGroupIds.size}
            totalParticipants={totalParticipants}
            statistics={statistics}
            selectedStatistics={selectedStatistics}
            setSelectedStatistics={setSelectedStatistics}
            getStatisticData={getStatisticData}
            selectedScoutGroups={selectedScoutGroups}
          />
        </Box>
      </Box>
    </Box>
  );
}
