import { useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Typography,
} from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SmartTable } from "./smart-table/SmartTable";
import { useProjectConfig } from "../context/ProjectConfigContext.jsx";

const PATH_SEPARATOR = "§";
/** @param {...string} parts */
const joinPath = (...parts) => parts.join(PATH_SEPARATOR);

/**
 * @typedef {{ id: number | string, name: string, num_participants?: number, stats?: Record<string, any> }} ScoutGroupItem
 * @typedef {{ type: "number" } | { type: "string", uniqueValues: string[] }} ColumnMeta
 */

/**
 * Scans stats data for a manual section (not in the questions schema) and returns
 * its column IDs. Values that are objects become one column per key (choice counts);
 * scalar values become a single column.
 * @param {string} sectionId
 * @param {ScoutGroupItem[]} scoutGroups
 * @returns {Set<string>}
 */
function getManualSectionColumnIds(sectionId, scoutGroups) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const group of scoutGroups) {
    const sectionData = group.stats?.[sectionId];
    if (!sectionData || typeof sectionData !== "object") continue;
    for (const [key, value] of Object.entries(sectionData)) {
      if (value == null) continue;
      if (typeof value === "object" && !Array.isArray(value)) {
        for (const answerKey of Object.keys(value)) {
          ids.add(joinPath(sectionId, key, answerKey));
        }
      } else {
        ids.add(joinPath(sectionId, key));
      }
    }
  }
  return ids;
}

/**
 * @param {string[]} selectedStatistics
 * @param {Record<string, string[] | null>} selectedSubQuestions
 * @param {Record<string, string[]>} sectionQuestions
 * @param {ScoutGroupItem[]} scoutGroups
 * @returns {Set<string>}
 */
function getColumnIds(selectedStatistics, selectedSubQuestions, sectionQuestions, scoutGroups) {
  const ids = new Set(["name"]);

  if (selectedStatistics.includes("num_participants")) {
    ids.add("num_participants");
  }

  /** @param {string} sectionId @param {string[] | null | undefined} activeSubQs */
  const addSectionColumns = (sectionId, activeSubQs) => {
    if (!sectionQuestions[sectionId]) {
      for (const id of getManualSectionColumnIds(sectionId, scoutGroups)) ids.add(id);
      return;
    }

    const qIds = Array.isArray(activeSubQs) ? activeSubQs : (sectionQuestions[sectionId] ?? []);

    // Single pass over groups: collect choice keys for all questions at once
    /** @type {Map<string, Set<string>>} */
    const choiceKeysMap = new Map();
    for (const group of scoutGroups) {
      const sectionData = group.stats?.[sectionId];
      if (!sectionData) continue;
      for (const qId of qIds) {
        const val = sectionData[qId];
        if (val != null && typeof val === "object" && !Array.isArray(val)) {
          let keys = choiceKeysMap.get(qId);
          if (!keys) { keys = new Set(); choiceKeysMap.set(qId, keys); }
          for (const k of Object.keys(val)) keys.add(k);
        }
      }
    }

    for (const qId of qIds) {
      const choiceKeys = choiceKeysMap.get(qId);
      if (choiceKeys != null && choiceKeys.size > 0) {
        for (const cId of choiceKeys) ids.add(joinPath(sectionId, qId, cId));
      } else {
        ids.add(joinPath(sectionId, qId));
      }
    }
  };

  for (const sectionId of selectedStatistics) {
    if (sectionId === "num_participants") continue;
    addSectionColumns(sectionId, undefined);
  }

  for (const [sectionId, activeSubQs] of Object.entries(selectedSubQuestions)) {
    addSectionColumns(sectionId, activeSubQs);
  }

  return ids;
}

/**
 * Resolves a value from a scout group's stats using pre-split path segments.
 * @param {Record<string, any> | undefined} stats
 * @param {string[]} parts
 * @param {Record<string, string>} [questionIdToText]
 * @returns {string | number}
 */
function resolveValue(stats, parts, questionIdToText) {
  if (!stats) return "";

  let current = stats;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = current[part];
  }

  if (current == null) return "";
  if (typeof current === "boolean") return current ? 1 : 0;
  if (typeof current === "number") return questionIdToText?.[String(current)] ?? current;
  if (typeof current === "string") return questionIdToText?.[current] ?? current;
  if (Array.isArray(current)) return current.join("\n");
  return "";
}

/**
 * For each stat column, determines type (number vs string) and filter options
 * using the questions schema rather than scanning actual data values.
 *
 * Rules:
 * - 3-segment path (sectionId§questionId§choiceId): always numeric
 * - 2-segment path (sectionId§questionId):
 *   - type "number" / "boolean" / no type (manual stat) → numeric
 *   - type "choice" → string with filter options from questionChoices + questionIdToText
 *   - type "text" / "leader_select" / other → string, no filter
 *
 * @param {Set<string>} columnIds
 * @param {Record<string, string>} questionTypes
 * @param {Record<string, string[]>} questionChoices
 * @param {Record<string, string>} questionIdToText
 * @returns {Map<string, ColumnMeta>}
 */
function getColumnMeta(columnIds, questionTypes, questionChoices, questionIdToText) {
  /** @type {Map<string, ColumnMeta>} */
  const meta = new Map();

  for (const columnId of columnIds) {
    if (columnId === "name" || columnId === "num_participants") continue;

    const parts = columnId.split(PATH_SEPARATOR);

    if (parts.length === 3) {
      meta.set(columnId, { type: "number" });
      continue;
    }

    const qId = parts[1];
    const qType = questionTypes[qId];

    if (qType === "choice") {
      const uniqueValues = (questionChoices[qId] ?? [])
        .map((id) => questionIdToText[id] ?? id)
        .sort((a, b) => a.localeCompare(b, "sv"));
      meta.set(columnId, { type: "string", uniqueValues });
    } else if (!qType || qType === "number" || qType === "boolean") {
      meta.set(columnId, { type: "number" });
    } else {
      meta.set(columnId, { type: "string", uniqueValues: [] });
    }
  }

  return meta;
}

/**
 * Transforms scout groups into row data for the table.
 * Coerces string values to numbers for columns that are known to be numeric,
 * so TanStack Table sorts them correctly.
 * @param {ScoutGroupItem[]} scoutGroups
 * @param {Set<string>} selectedColumns
 * @param {Map<string, ColumnMeta>} columnMeta
 * @param {Record<string, string>} [questionIdToText]
 */
function transformToRows(scoutGroups, selectedColumns, columnMeta, questionIdToText) {
  // Pre-compute column accessors once, outside the per-row loop
  /** @type {{ columnId: string, parts: string[], isNumeric: boolean | undefined }[]} */
  const statColumns = [];
  for (const columnId of selectedColumns) {
    if (columnId === "name" || columnId === "num_participants") continue;
    statColumns.push({
      columnId,
      parts: columnId.split(PATH_SEPARATOR),
      isNumeric: columnMeta.get(columnId)?.type === "number",
    });
  }

  return scoutGroups.map((group) => {
    /** @type {Record<string, any>} */
    const row = {
      id: group.id,
      name: group.name,
      num_participants: group.num_participants || 0,
    };

    for (const { columnId, parts, isNumeric } of statColumns) {
      let value = resolveValue(group.stats, parts, questionIdToText);
      if (isNumeric && typeof value === "string" && value !== "") {
        const num = Number(value);
        if (!isNaN(num)) value = num;
      }
      row[columnId] = value;
    }

    return row;
  });
}

/**
 * Custom filter function for multi-select filtering.
 * @param {import('@tanstack/react-table').Row<any>} row
 * @param {string} columnId
 * @param {any} filterValue
 */
function multiSelectFilterFn(row, columnId, filterValue) {
  if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) {
    return true;
  }

  const value = row.getValue(columnId);
  const strValue = value == null ? "" : String(value);

  return Array.isArray(filterValue) ? filterValue.includes(strValue) : strValue === filterValue;
}

/**
 * Creates column definitions for TanStack Table.
 * @param {Set<string>} selectedColumns
 * @param {Map<string, ColumnMeta>} columnMeta
 * @param {Record<string, string>} questionIdToText
 */
function createColumns(selectedColumns, columnMeta, questionIdToText) {
  /** @type {any[]} */
  const columns = [
    { accessorKey: "name", header: "Kår", size: 200, minSize: 150 },
  ];

  for (const columnId of selectedColumns) {
    if (columnId === "name") continue;

    if (columnId === "num_participants") {
      columns.push({ accessorKey: "num_participants", header: "Deltagare", size: 200 });
      continue;
    }

    const lastSegment = columnId.split(PATH_SEPARATOR).pop() ?? columnId;
    const colMeta = columnMeta.get(columnId);

    /** @type {any} */
    const colDef = {
      accessorKey: columnId,
      header: questionIdToText[lastSegment] ?? lastSegment,
      size: 200,
      ...(colMeta?.type === "number" && { sortingFn: "basic" }),
    };

    if (colMeta && "uniqueValues" in colMeta && colMeta.uniqueValues?.length) {
      colDef.meta = {
        dataType: {
          type: "choice",
          options: colMeta.uniqueValues.map((v) => ({ value: v, label: v })),
        },
      };
      colDef.filterFn = multiSelectFilterFn;
    }

    columns.push(colDef);
  }

  return columns;
}

/**
 * @param {object} props
 * @param {ScoutGroupItem[]} props.scoutGroups
 * @param {string[]} [props.selectedStatistics]
 * @param {Record<string, string[] | null>} [props.selectedSubQuestions]
 * @param {boolean} props.isFullscreen
 * @param {(value: boolean) => void} props.setIsFullscreen
 */
export default function ScoutGroupTable({
  scoutGroups,
  selectedStatistics = [],
  selectedSubQuestions = {},
  isFullscreen,
  setIsFullscreen,
}) {
  const { sectionQuestions, questionIdToText, questionTypes, questionChoices } =
    useProjectConfig();

  const chipDrivenColumns = useMemo(
    () => getColumnIds(selectedStatistics, selectedSubQuestions, sectionQuestions, scoutGroups),
    [selectedStatistics, selectedSubQuestions, sectionQuestions, scoutGroups]
  );

  const columnMeta = useMemo(
    () => getColumnMeta(chipDrivenColumns, questionTypes, questionChoices, questionIdToText),
    [chipDrivenColumns, questionTypes, questionChoices, questionIdToText]
  );

  const rows = useMemo(
    () => transformToRows(scoutGroups, chipDrivenColumns, columnMeta, questionIdToText),
    [scoutGroups, chipDrivenColumns, columnMeta, questionIdToText]
  );

  const columns = useMemo(
    () => createColumns(chipDrivenColumns, columnMeta, questionIdToText),
    [chipDrivenColumns, columnMeta, questionIdToText]
  );

  const [columnFilters, setColumnFilters] = useState(/** @type {import('@tanstack/react-table').ColumnFiltersState} */ ([]));
  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  const tableContent = (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
      <SmartTable table={table} />
    </Box>
  );

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, height: "100%", minHeight: 0 }}>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          border: 1,
          borderColor: "grey.300",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            px: 1,
            py: 0.5,
            borderBottom: 1,
            borderColor: "grey.200",
            backgroundColor: "action.hover",
          }}
        >
          <Tooltip title="Visa tabell i helskärm">
            <IconButton
              size="small"
              onClick={() => setIsFullscreen(true)}
              aria-label="Visa tabell i helskärm"
            >
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {tableContent}
      </Box>

      <Dialog
        fullScreen
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        sx={{ "& .MuiDialog-paper": { display: "flex", flexDirection: "column" } }}
      >
        <AppBar position="static" sx={{ flexShrink: 0, bgcolor: "#546e7a" }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Tabell – kårer och statistik
            </Typography>
            <Tooltip title="Avsluta helskärm">
              <IconButton
                color="inherit"
                onClick={() => setIsFullscreen(false)}
                aria-label="Avsluta helskärm"
              >
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <DialogContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: 0,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {tableContent}
        </DialogContent>
      </Dialog>
    </Box>
  );
}