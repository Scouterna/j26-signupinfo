import { IconButton, Tooltip } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { exportTableToCsv } from "../utils/exportTableToCsv.js";

/**
 * Turns a display string into a filename-safe slug: folds common accented
 * letters to ASCII (å/ä → a, ö → o, …), lowercases, and collapses runs of other
 * characters into single hyphens. Keeps the project name usable in a filename
 * and consistent with the ASCII-lowercase prefixes ("karoversikt", "personer").
 * @param {string} value
 */
function slugifyForFilename(value) {
  return String(value)
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reusable "download table as CSV" icon button for SmartTable / TanStack tables.
 * Owns the date-stamped filename so every table exports consistently
 * (e.g. `karoversikt-jamboree26-2026-07-11.csv`).
 *
 * @param {object} props
 * @param {import('@tanstack/react-table').Table<any>} props.table
 * @param {string} props.filenamePrefix  basename before the date, e.g. "personer"
 * @param {string} [props.projectName]  current project, folded into the filename
 * @param {"small" | "medium"} [props.size]
 * @param {import('@mui/material').IconButtonProps["color"]} [props.color]
 */
export default function TableDownloadButton({
  table,
  filenamePrefix,
  projectName,
  size = "small",
  color,
}) {
  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const parts = [filenamePrefix, projectName && slugifyForFilename(projectName), date];
    exportTableToCsv(table, `${parts.filter(Boolean).join("-")}.csv`);
  };

  return (
    <Tooltip title="Ladda ner som Excel (CSV)">
      <IconButton
        size={size}
        color={color}
        onClick={handleExport}
        aria-label="Ladda ner tabell som CSV"
      >
        <FileDownloadIcon fontSize={size} />
      </IconButton>
    </Tooltip>
  );
}
