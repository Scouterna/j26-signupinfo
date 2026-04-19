import { Box, IconButton, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useGroupSelection } from "../context/GroupSelectionContext.jsx";
import { useScoutGroupSelectorContext } from "../context/ScoutGroupSelectorContext.jsx";

export default function DrawerToggleButton() {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));
  const { selectedGroupIds } = useGroupSelection();
  const { toggleDrawer } = useScoutGroupSelectorContext();

  if (isLargeScreen) return null;

  const selectedCount = selectedGroupIds.size;

  return (
    <IconButton
      color="inherit"
      aria-label="Öppna meny"
      onClick={toggleDrawer}
      sx={{ mr: 2, position: "relative" }}
    >
      <MenuIcon />
      {selectedCount > 0 && (
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            borderRadius: "50%",
            width: 18,
            height: 18,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selectedCount > 9 ? "9+" : selectedCount}
        </Box>
      )}
    </IconButton>
  );
}
