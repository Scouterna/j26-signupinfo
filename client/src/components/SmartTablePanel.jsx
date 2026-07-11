import { Box, IconButton, Tooltip } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { SmartTable } from "./smart-table/SmartTable";
import TableDownloadButton from "./TableDownloadButton.jsx";

/**
 * Bordered panel: a toolbar (CSV download + optional fullscreen toggle) above a
 * SmartTable. Shared by the Kåröversikt and Personer tables so both get the same
 * download affordance without duplicating the toolbar markup.
 *
 * @param {object} props
 * @param {import('@tanstack/react-table').Table<any>} props.table
 * @param {string} props.filenamePrefix  passed through to the download button
 * @param {string} [props.projectName]  passed through to the download button
 * @param {() => void} [props.onFullscreen]  when set, renders a fullscreen button
 * @param {import('@mui/material').SxProps} [props.sx]  extra styles for the outer box
 */
export default function SmartTablePanel({
  table,
  filenamePrefix,
  projectName,
  onFullscreen,
  sx,
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        border: 1,
        borderColor: "grey.300",
        borderRadius: 1,
        overflow: "hidden",
        minHeight: 0,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: "grey.200",
          backgroundColor: "action.hover",
        }}
      >
        <TableDownloadButton
          table={table}
          filenamePrefix={filenamePrefix}
          projectName={projectName}
        />
        {onFullscreen && (
          <Tooltip title="Visa tabell i helskärm">
            <IconButton
              size="small"
              onClick={onFullscreen}
              aria-label="Visa tabell i helskärm"
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <SmartTable table={table} />
      </Box>
    </Box>
  );
}
