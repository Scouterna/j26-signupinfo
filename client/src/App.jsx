import { CssBaseline } from "@mui/material";
import useScoutGroupSelector from "./hooks/useScoutGroupSelector.js";
import testData from "../testdata/testdata.json";
import ScoutGroupSelector from "./components/ScoutGroupSelector.jsx";

// --- Main Application Component ---
export default function App() {
  // All sidebar logic is now handled by the custom hook.
  const sidebarLogic = useScoutGroupSelector(testData);

  return (
    <div style={{ height: "100vh" }}>
      <CssBaseline />
      <main
        style={{
          display: "flex",
          flexDirection: "row",
          padding: "32px",
          width: "100%",
          height: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div style={{ flex: "0 0 340px", marginRight: "32px", height: "100%" }}>
          <ScoutGroupSelector {...sidebarLogic} />
        </div>
      </main>
    </div>
  );
}
