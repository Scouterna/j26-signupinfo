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

/**
 * @typedef {{ id: number | string, name: string, num_participants?: number, stats?: Record<string, any> }} ScoutGroupItem
 * @typedef {{ type: "number" } | { type: "string", uniqueValues: string[] }} ColumnMeta
 */

/**
 * Derives the set of column IDs from the chip selection and the questions schema.
 * Uses sectionQuestions for section→question mapping, but inspects actual stats
 * values to determine per-choice vs scalar column structure.
 * For sections not in sectionQuestions (manual stats like Kön/Avgift), falls back
 * to scanning the stats data of the provided scout groups.
 *
 * @param {string[]} selectedStatistics
 * @param {Record<string, string[] | null>} selectedSubQuestions
 * @param {Record<string, string[]>} sectionQuestions
 * @param {ScoutGroupItem[]} scoutGroups
 * @returns {Set<string>}
 */
function getColumnIds(selectedStatistics, selectedSubQuestions, sectionQuestions, scoutGroups) {
  const ids = new Set(/** @type {string[]} */ (["name"]));

  if (selectedStatistics.includes("num_participants")) {
    ids.add("num_participants");
  }

  /**
   * Adds column IDs for a section, optionally filtered to specific question IDs.
   * Uses the questions schema for section→question mapping, but inspects actual
   * stats values to determine whether a question stores aggregated choice counts
   * (object → one column per choice key) or a scalar (one column per question).
   * Falls back to a full stats scan for manual sections not in the questions schema.
   * @param {string} sectionId
   * @param {string[] | null | undefined} activeSubQs - null = all, array = filtered, undefined = all
   */
  const addSectionColumns = (sectionId, activeSubQs) => {
    const allQIds = sectionQuestions[sectionId];

    if (!allQIds) {
      // Manual stat not in questions endpoint — scan stats data for this section only
      scoutGroups.forEach((group) => {
        const sectionData = group.stats?.[sectionId];
        if (!sectionData || typeof sectionData !== "object") return;
        Object.entries(sectionData).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          if (typeof value === "object" && !Array.isArray(value)) {
            Object.keys(value).forEach((answerKey) => {
              ids.add([sectionId, key, answerKey].join(PATH_SEPARATOR));
            });
          } else {
            ids.add([sectionId, key].join(PATH_SEPARATOR));
          }
        });
      });
      return;
    }

    const qIds = Array.isArray(activeSubQs)
      ? allQIds.filter((q) => activeSubQs.includes(q))
      : allQIds;

    for (const qId of qIds) {
      // Inspect actual stats data to determine value shape: object = per-choice counts,
      // scalar = single answer. Only collect choice keys that appear in the data.
      /** @type {Set<string> | null} */
      let choiceKeysInData = null;
      for (const group of scoutGroups) {
        const val = group.stats?.[sectionId]?.[qId];
        if (val !== null && val !== undefined) {
          if (typeof val === "object" && !Array.isArray(val)) {
            choiceKeysInData = choiceKeysInData ?? new Set();
            Object.keys(val).forEach((k) => /** @type {Set<string>} */ (choiceKeysInData).add(k));
          }
          break;
        }
      }

      if (choiceKeysInData !== null) {
        // Collect any additional choice keys from all groups (not just the first)
        scoutGroups.forEach((group) => {
          const val = group.stats?.[sectionId]?.[qId];
          if (val && typeof val === "object" && !Array.isArray(val)) {
            Object.keys(val).forEach((k) => /** @type {Set<string>} */ (choiceKeysInData).add(k));
          }
        });
        choiceKeysInData.forEach((cId) => ids.add([sectionId, qId, cId].join(PATH_SEPARATOR)));
      } else {
        ids.add([sectionId, qId].join(PATH_SEPARATOR));
      }
    }
  };

  // Simple stats: sections without sub-questions, selected via selectedStatistics
  for (const sectionId of selectedStatistics) {
    if (sectionId === "num_participants") continue;
    addSectionColumns(sectionId, undefined);
  }

  // Sub-question stats: sections with sub-questions, selected via selectedSubQuestions
  for (const [sectionId, activeSubQs] of Object.entries(selectedSubQuestions)) {
    addSectionColumns(sectionId, activeSubQs);
  }

  return ids;
}

/**
 * Gets the value from a scout group's stats using a column ID path.
 * Resolves string IDs to display names via questionIdToText when provided.
 * @param {Record<string, any> | undefined} stats
 * @param {string} columnId
 * @param {Record<string, string>} [questionIdToText]
 * @returns {string | number}
 */
function getValueFromPath(stats, columnId, questionIdToText) {
  if (!stats) return "";
  const parts = columnId.split(PATH_SEPARATOR);

  /** @type {any} */
  let current = stats;
  for (const part of parts) {
    if (current === null || current === undefined) return "";
    if (typeof current !== "object") return "";
    current = current[part];
  }

  if (current === null || current === undefined) return "";
  if (typeof current === "boolean") return current ? 1 : 0;
  if (typeof current === "number") {
    const resolved = questionIdToText?.[String(current)];
    return resolved !== undefined ? resolved : current;
  }
  if (typeof current === "string") {
    return questionIdToText?.[current] ?? current;
  }
  if (Array.isArray(current)) return current.join("\n");
  return "";
}

/**
 * For each stat column, determines type (number vs string) and filter options
 * using the questions schema rather than scanning actual data values.
 *
 * Rules:
 * - 3-segment path (sectionId§questionId§choiceId): participant choice question aggregated
 *   as counts per choice option by the stats endpoint — always numeric
 * - 2-segment path (sectionId§questionId):
 *   - type "number" / "boolean" / no type (manual stat) → numeric
 *   - type "choice" → string with filter options from questionChoices + questionIdToText
 *   - type "text" / "leader_select" / "other_unsupported_by_api" → string, no filter
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

  columnIds.forEach((columnId) => {
    if (columnId === "name" || columnId === "num_participants") return;

    const parts = columnId.split(PATH_SEPARATOR);

    if (parts.length === 3) {
      meta.set(columnId, { type: "number" });
      return;
    }

    const qId = parts[1];
    const qType = questionTypes[qId];

    if (qType === "number" || qType === "boolean" || !qType) {
      // boolean → stored as 1/0 by getValueFromPath
      // no qType → manual stat column (Kön, Avgift, etc.), always numeric
      meta.set(columnId, { type: "number" });
    } else if (qType === "choice") {
      const uniqueValues = (questionChoices[qId] ?? [])
        .map((id) => questionIdToText[id] ?? id)
        .sort((a, b) => a.localeCompare(b, "sv"));
      meta.set(columnId, { type: "string", uniqueValues });
    } else {
      // text, leader_select, other_unsupported_by_api → free-form string, no filter
      meta.set(columnId, { type: "string", uniqueValues: [] });
    }
  });

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
  return scoutGroups.map((group) => {
    /** @type {Record<string, any>} */
    const row = {
      id: group.id,
      name: group.name,
      num_participants: group.num_participants || 0,
    };

    selectedColumns.forEach((columnId) => {
      if (columnId !== "name" && columnId !== "num_participants") {
        let value = getValueFromPath(group.stats, columnId, questionIdToText);
        if (columnMeta.get(columnId)?.type === "number" && typeof value === "string" && value !== "") {
          const parsed = Number(value);
          if (!isNaN(parsed)) value = parsed;
        }
        row[columnId] = value;
      }
    });

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
  const strValue = value === null || value === undefined ? "" : String(value);

  if (!Array.isArray(filterValue)) {
    return strValue === filterValue;
  }

  return filterValue.includes(strValue);
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
    {
      accessorKey: "name",
      header: "Kår",
      size: 200,
      minSize: 150,
    },
  ];

  if (selectedColumns.has("num_participants")) {
    columns.push({
      accessorKey: "num_participants",
      header: "Deltagare",
      size: 200,
    });
  }

  selectedColumns.forEach((columnId) => {
    if (columnId === "name" || columnId === "num_participants") return;

    const lastSegment = columnId.split(PATH_SEPARATOR).pop() ?? columnId;
    const headerName = questionIdToText[lastSegment] ?? lastSegment;
    const colMeta = columnMeta.get(columnId);

    /** @type {any} */
    const colDef = {
      accessorKey: columnId,
      header: headerName,
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
  });

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
    () =>
      getColumnIds(
        selectedStatistics,
        selectedSubQuestions,
        sectionQuestions,
        scoutGroups
      ),
    [
      selectedStatistics,
      selectedSubQuestions,
      sectionQuestions,
      scoutGroups,
    ]
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
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  const tableContent = (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <SmartTable table={table} />
    </Box>
  );

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        minHeight: 0,
      }}
    >
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
        sx={{
          "& .MuiDialog-paper": {
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <AppBar
          position="static"
          sx={{
            flexShrink: 0,
            bgcolor: "#546e7a",
          }}
        >
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
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {tableContent}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
