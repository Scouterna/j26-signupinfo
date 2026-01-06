import { CssBaseline, Box } from "@mui/material";
import useScoutGroupSelector from "./hooks/useScoutGroupSelector.js";
import testData from "../testdata/testdata.json";
import ScoutGroupSelector from "./components/ScoutGroupSelector.jsx";
import StatisticPaper from "./components/StatisticPaper.jsx";

export default function App() {
  const sidebarLogic = useScoutGroupSelector(testData);
  const {
    isCollapsed,
    selectedScoutGroupIds,
    totalParticipants,
    statistics,
    selectedStatistics,
    setSelectedStatistics,
  } = sidebarLogic;

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
          />
        </Box>
      </Box>
    </Box>
  );
}
