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
 * @typedef {{ name: string, type: "leaf", columnId: string }} LeafNode
 * @typedef {{ name: string, type: "branch", children: LeafNode[] }} BranchNode
 * @typedef {{ name: string, children: Map<string, LeafNode | BranchNode> | (LeafNode | BranchNode)[] }} CategoryNode
 * @typedef {{ type: "number" } | { type: "string", uniqueValues: string[] }} ColumnMeta
 */

/**
 * Builds a hierarchical tree structure from all scout groups' stats.
 * @param {ScoutGroupItem[]} scoutGroups
 */
function buildStatsHierarchy(scoutGroups) {
  /** @type {Map<string, { type: string, leafName: string, categoryName: string, subQuestionName?: string }>} */
  const pathsMap = new Map();

  scoutGroups.forEach((group) => {
    if (!group.stats || typeof group.stats !== "object") return;

    Object.entries(group.stats).forEach(([categoryName, categoryData]) => {
      if (!categoryData || typeof categoryData !== "object") return;

      Object.entries(categoryData).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        if (typeof value === "object" && !Array.isArray(value)) {
          Object.keys(value).forEach((answerKey) => {
            const columnId = [categoryName, key, answerKey].join(PATH_SEPARATOR);
            if (!pathsMap.has(columnId)) {
              pathsMap.set(columnId, {
                type: "nestedLeaf",
                leafName: answerKey,
                categoryName,
                subQuestionName: key,
              });
            }
          });
        } else {
          const columnId = [categoryName, key].join(PATH_SEPARATOR);
          if (!pathsMap.has(columnId)) {
            pathsMap.set(columnId, {
              type: "directLeaf",
              leafName: key,
              categoryName,
            });
          }
        }
      });
    });
  });

  /** @type {Map<string, { name: string, children: Map<string, any> }>} */
  const categoriesMap = new Map();

  pathsMap.forEach((info, columnId) => {
    const { categoryName, subQuestionName, leafName, type } = info;

    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, {
        name: categoryName,
        children: new Map(),
      });
    }

    const category = categoriesMap.get(categoryName);
    if (!category) return;

    if (type === "nestedLeaf") {
      if (!subQuestionName) return;
      if (!category.children.has(subQuestionName)) {
        category.children.set(subQuestionName, {
          name: subQuestionName,
          type: "branch",
          children: [],
        });
      }
      category.children.get(subQuestionName).children.push({
        name: leafName,
        type: "leaf",
        columnId,
      });
    } else {
      category.children.set(columnId, {
        name: leafName,
        type: "leaf",
        columnId,
      });
    }
  });

  const hierarchy = Array.from(categoriesMap.values())
    .map((category) => ({
      ...category,
      children: Array.from(category.children.values())
        .map((child) => {
          if (child.type === "branch") {
            return {
              ...child,
              children: child.children.sort((/** @type {any} */ a, /** @type {any} */ b) =>
                a.name.localeCompare(b.name, "sv")
              ),
            };
          }
          return child;
        })
        .sort((/** @type {any} */ a, /** @type {any} */ b) => a.name.localeCompare(b.name, "sv")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return hierarchy;
}

/**
 * Gets all leaf column IDs from a hierarchy node.
 * @param {{ children?: any[] }} node
 * @returns {string[]}
 */
function getAllLeafIds(node) {
  /** @type {string[]} */
  const ids = [];
  if (node.children) {
    node.children.forEach((/** @type {any} */ child) => {
      if (child.type === "leaf") {
        ids.push(child.columnId);
      } else if (child.type === "branch") {
        ids.push(...getAllLeafIds(child));
      }
    });
  }
  return ids;
}

/**
 * Gets all leaf column IDs from the full hierarchy.
 * @param {any[]} hierarchy
 * @returns {string[]}
 */
function getAllColumnIdsFromHierarchy(hierarchy) {
  /** @type {string[]} */
  const ids = [];
  hierarchy.forEach((category) => {
    ids.push(...getAllLeafIds(category));
  });
  return ids;
}

/**
 * Resolves a category name to the stat name used in chip selector.
 * @param {string} categoryName
 * @param {Record<string, string>} sectionIdToText
 */
function resolveCategoryToStatName(categoryName, sectionIdToText) {
  if (!sectionIdToText || typeof sectionIdToText !== "object") return categoryName;
  for (const [id, text] of Object.entries(sectionIdToText)) {
    if (text === categoryName) return id;
  }
  return categoryName;
}

/**
 * Resolves a sub-question name to question ID for matching.
 * @param {string} subName
 * @param {Record<string, string>} questionIdToText
 */
function resolveSubQuestionToId(subName, questionIdToText) {
  if (!questionIdToText || typeof questionIdToText !== "object") return subName;
  for (const [id, text] of Object.entries(questionIdToText)) {
    if (text === subName) return id;
  }
  return subName;
}

/**
 * Gets column IDs that match the chip selector selection.
 * @param {any[]} hierarchy
 * @param {string[]} selectedStatistics
 * @param {Record<string, string[] | null>} selectedSubQuestions
 * @param {Record<string, string[]>} statisticSubQuestions
 * @param {Record<string, string>} sectionIdToText
 * @param {Record<string, string>} questionIdToText
 * @returns {Set<string>}
 */
function getColumnIdsFromChipSelection(
  hierarchy,
  selectedStatistics,
  selectedSubQuestions,
  statisticSubQuestions,
  sectionIdToText,
  questionIdToText
) {
  const ids = new Set(["name"]);
  if (selectedStatistics.includes("num_participants")) {
    ids.add("num_participants");
  }
  const hasSubQuestions = (/** @type {string} */ statName) => statName in statisticSubQuestions;

  hierarchy.forEach((category) => {
    const rawStatName = category.name;
    const statName = resolveCategoryToStatName(rawStatName, sectionIdToText);
    const isSimpleStat =
      (selectedStatistics.includes(statName) || selectedStatistics.includes(rawStatName)) &&
      !hasSubQuestions(statName) &&
      !hasSubQuestions(rawStatName);
    const isSubStat = statName in selectedSubQuestions || rawStatName in selectedSubQuestions;
    const effectiveStatName = statName in selectedSubQuestions ? statName : rawStatName;

    if (!isSimpleStat && !isSubStat) return;

    if (isSimpleStat) {
      getAllLeafIds(category).forEach((id) => ids.add(id));
      return;
    }

    const activeSubQs = selectedSubQuestions[effectiveStatName];
    const includeChild = (/** @type {string} */ subName) => {
      if (activeSubQs === null) return true;
      if (!Array.isArray(activeSubQs)) return false;
      const resolvedId = resolveSubQuestionToId(subName, questionIdToText);
      return activeSubQs.includes(subName) || activeSubQs.includes(resolvedId);
    };

    category.children.forEach((/** @type {any} */ child) => {
      if (child.type === "leaf") {
        if (includeChild(child.name)) ids.add(child.columnId);
      } else if (child.type === "branch") {
        if (includeChild(child.name)) {
          getAllLeafIds(child).forEach((id) => ids.add(id));
        }
      }
    });
  });

  return ids;
}

/**
 * For each stat column, determines type (number vs string) and unique string values.
 * @param {ScoutGroupItem[]} scoutGroups
 * @param {any[]} hierarchy
 * @param {Record<string, string>} [questionIdToText]
 * @returns {Map<string, ColumnMeta>}
 */
function getColumnMeta(scoutGroups, hierarchy, questionIdToText) {
  const columnIds = getAllColumnIdsFromHierarchy(hierarchy);
  /** @type {Map<string, ColumnMeta>} */
  const meta = new Map();

  columnIds.forEach((columnId) => {
    const values = scoutGroups
      .map((g) => getValueFromPath(g.stats, columnId, questionIdToText))
      .filter((v) => v !== "" && v !== null && v !== undefined);

    const allNumeric =
      values.length > 0 && values.every((v) => typeof v === "number");

    if (allNumeric) {
      meta.set(columnId, { type: "number" });
    } else {
      const uniqueValues = [
        ...new Set(
          values.map((v) => (typeof v === "string" ? v : String(v)))
        ),
      ].sort((a, b) => a.localeCompare(b, "sv"));
      meta.set(columnId, { type: "string", uniqueValues });
    }
  });

  return meta;
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
 * Transforms scout groups into row data for the table.
 * @param {ScoutGroupItem[]} scoutGroups
 * @param {Set<string>} selectedColumns
 * @param {Record<string, string>} [questionIdToText]
 */
function transformToRows(scoutGroups, selectedColumns, questionIdToText) {
  return scoutGroups.map((group) => {
    /** @type {Record<string, any>} */
    const row = {
      id: group.id,
      name: group.name,
      num_participants: group.num_participants || 0,
    };

    selectedColumns.forEach((columnId) => {
      if (columnId !== "name" && columnId !== "num_participants") {
        row[columnId] = getValueFromPath(group.stats, columnId, questionIdToText);
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
 * Resolves an ID to display text using the provided maps.
 * @param {string} id
 * @param {Record<string, string>} [sectionIdToText]
 * @param {Record<string, string>} [questionIdToText]
 */
function getDisplayName(id, sectionIdToText, questionIdToText) {
  return sectionIdToText?.[id] ?? questionIdToText?.[id] ?? id;
}

/**
 * Creates column definitions for TanStack Table.
 * @param {Set<string>} selectedColumns
 * @param {any[]} hierarchy
 * @param {Map<string, ColumnMeta>} columnMeta
 * @param {Record<string, string>} sectionIdToText
 * @param {Record<string, string>} questionIdToText
 */
function createColumns(selectedColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText) {
  const selectedSet = new Set(selectedColumns);
  /** @type {any[]} */
  const columns = [
    {
      accessorKey: "name",
      header: "Kår",
      size: 200,
      minSize: 150,
    },
  ];
  if (selectedSet.has("num_participants")) {
    columns.push({
      accessorKey: "num_participants",
      header: "Deltagare",
      size: 200,
    });
  }

  /** @type {Map<string, string>} */
  const columnIdToName = new Map();
  hierarchy.forEach((category) => {
    category.children.forEach((/** @type {any} */ child) => {
      if (child.type === "leaf") {
        const displayName = getDisplayName(child.name, sectionIdToText, questionIdToText);
        columnIdToName.set(child.columnId, displayName);
      } else if (child.type === "branch") {
        child.children.forEach((/** @type {any} */ leaf) => {
          const displayName = getDisplayName(leaf.name, sectionIdToText, questionIdToText);
          columnIdToName.set(leaf.columnId, displayName);
        });
      }
    });
  });

  selectedColumns.forEach((columnId) => {
    if (columnId === "name" || columnId === "num_participants") return;

    const headerName = columnIdToName.get(columnId) ?? getDisplayName(columnId.split(PATH_SEPARATOR).pop() ?? columnId, sectionIdToText, questionIdToText) ?? columnId;
    const colMeta = columnMeta.get(columnId);

    /** @type {any} */
    const colDef = {
      accessorKey: columnId,
      header: headerName,
      size: 200,
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
  const { statisticSubQuestions = {}, sectionIdToText = {}, questionIdToText = {} } =
    useProjectConfig();
  const hierarchy = useMemo(
    () => buildStatsHierarchy(scoutGroups),
    [scoutGroups]
  );

  const chipDrivenColumns = useMemo(
    () =>
      getColumnIdsFromChipSelection(
        hierarchy,
        selectedStatistics,
        selectedSubQuestions,
        statisticSubQuestions,
        sectionIdToText,
        questionIdToText
      ),
    [
      hierarchy,
      selectedStatistics,
      selectedSubQuestions,
      statisticSubQuestions,
      sectionIdToText,
      questionIdToText,
    ]
  );

  const columnMeta = useMemo(
    () => getColumnMeta(scoutGroups, hierarchy, questionIdToText),
    [scoutGroups, hierarchy, questionIdToText]
  );

  const rows = useMemo(
    () => transformToRows(scoutGroups, chipDrivenColumns, questionIdToText),
    [scoutGroups, chipDrivenColumns, questionIdToText]
  );

  const columns = useMemo(
    () => createColumns(chipDrivenColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText),
    [chipDrivenColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText]
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
