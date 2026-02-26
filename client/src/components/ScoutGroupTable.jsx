import { useMemo, useState, useEffect, useRef } from "react";
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

    if (type === "nestedLeaf") {
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
 * @returns {Map<string, ColumnMeta>}
 */
function getColumnMeta(scoutGroups, hierarchy) {
  const columnIds = getAllColumnIdsFromHierarchy(hierarchy);
  /** @type {Map<string, ColumnMeta>} */
  const meta = new Map();

  columnIds.forEach((columnId) => {
    const values = scoutGroups
      .map((g) => getValueFromPath(g.stats, columnId))
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
 * @param {Record<string, any> | undefined} stats
 * @param {string} columnId
 * @returns {string | number}
 */
function getValueFromPath(stats, columnId) {
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
  if (typeof current === "number") return current;
  if (typeof current === "string") return current;
  if (Array.isArray(current)) return current.join("\n");
  return "";
}

/**
 * Transforms scout groups into row data for the table.
 * @param {ScoutGroupItem[]} scoutGroups
 * @param {Set<string>} selectedColumns
 */
function transformToRows(scoutGroups, selectedColumns) {
  return scoutGroups.map((group) => {
    /** @type {Record<string, any>} */
    const row = {
      id: group.id,
      name: group.name,
      num_participants: group.num_participants || 0,
    };

    selectedColumns.forEach((columnId) => {
      if (columnId !== "name" && columnId !== "num_participants") {
        row[columnId] = getValueFromPath(group.stats, columnId);
      }
    });

    return row;
  });
}

/**
 * Multi-select dropdown component for categorical filters.
 * @param {object} props
 * @param {string[]} props.options
 * @param {string[]} props.value
 * @param {(selected: string[]) => void} props.onChange
 */
function MultiSelectDropdown({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    /** @param {MouseEvent} event */
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (/** @type {string} */ optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const displayText =
    value.length === 0
      ? "Alla"
      : value.length === options.length
      ? "Alla valda"
      : value.length === 1
      ? value[0]
      : `${value.length} valda`;

  return (
    <div ref={dropdownRef} className="scout-multi-select-dropdown">
      <button
        type="button"
        className="scout-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="scout-dropdown-text">{displayText}</span>
        <span className="scout-dropdown-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="scout-dropdown-menu">
          {options.map((option) => (
            <label key={option} className="scout-dropdown-item">
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
            </label>
          ))}
          {value.length > 0 && (
            <button
              type="button"
              className="scout-clear-button"
              onClick={() => onChange([])}
            >
              Rensa alla
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Debounced input component for text and number filters.
 * @param {object} props
 * @param {string | number} props.value
 * @param {(value: string) => void} props.onChange
 * @param {number} [props.debounce]
 * @param {string} [props.type]
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 */
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 300,
  ...props
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(/** @type {string} */ (value));
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange]);

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

/**
 * Filter component that renders the appropriate filter UI based on column meta.
 * @param {object} props
 * @param {import('@tanstack/react-table').Column<any, any>} props.column
 * @param {Map<string, ColumnMeta>} [props.columnMeta]
 */
function Filter({ column, columnMeta }) {
  const columnFilterValue = column.getFilterValue();
  const { filterVariant } = /** @type {{ filterVariant?: string }} */ (column.columnDef.meta ?? {});
  const meta = columnMeta?.get(column.id);

  if (filterVariant === "range") {
    return (
      <div className="scout-filter-range">
        <DebouncedInput
          type="number"
          value={/** @type {any[]} */ (columnFilterValue)?.[0] ?? ""}
          onChange={(value) =>
            column.setFilterValue((/** @type {any[]} */ old) => [value, old?.[1]])
          }
          placeholder="Min"
          className="scout-filter-input scout-filter-input-small"
        />
        <DebouncedInput
          type="number"
          value={/** @type {any[]} */ (columnFilterValue)?.[1] ?? ""}
          onChange={(value) =>
            column.setFilterValue((/** @type {any[]} */ old) => [old?.[0], value])
          }
          placeholder="Max"
          className="scout-filter-input scout-filter-input-small"
        />
      </div>
    );
  }

  if (filterVariant === "select" && meta && "uniqueValues" in meta && meta.uniqueValues?.length) {
    return (
      <MultiSelectDropdown
        options={meta.uniqueValues}
        value={Array.isArray(columnFilterValue) ? columnFilterValue : []}
        onChange={(selected) =>
          column.setFilterValue(selected.length ? selected : undefined)
        }
      />
    );
  }

  return (
    <DebouncedInput
      type="text"
      value={/** @type {string} */ (columnFilterValue ?? "")}
      onChange={(value) => column.setFilterValue(value)}
      placeholder="Sök..."
      className="scout-filter-input"
    />
  );
}

/**
 * Custom filter function for range (min/max) filtering.
 * @param {import('@tanstack/react-table').Row<any>} row
 * @param {string} columnId
 * @param {any} filterValue
 */
function rangeFilterFn(row, columnId, filterValue) {
  const value = row.getValue(columnId);
  const [min, max] = filterValue ?? [];

  if (value === "" || value === null || value === undefined) {
    return false;
  }

  const numValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numValue)) return false;

  if (min !== "" && min !== undefined && min !== null) {
    if (numValue < Number(min)) return false;
  }
  if (max !== "" && max !== undefined && max !== null) {
    if (numValue > Number(max)) return false;
  }
  return true;
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
      meta: { filterVariant: "text" },
      size: 200,
      minSize: 150,
    },
  ];
  if (selectedSet.has("num_participants")) {
    columns.push({
      accessorKey: "num_participants",
      header: "Deltagare",
      meta: { filterVariant: "range" },
      filterFn: rangeFilterFn,
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

    const headerName = columnIdToName.get(columnId) ?? getDisplayName(columnId.split(PATH_SEPARATOR).pop(), sectionIdToText, questionIdToText) ?? columnId;
    const meta = columnMeta.get(columnId);
    const isNumeric = meta?.type === "number";

    /** @type {any} */
    const colDef = {
      accessorKey: columnId,
      header: headerName,
      size: 200,
    };

    if (isNumeric) {
      colDef.meta = { filterVariant: "range" };
      colDef.filterFn = rangeFilterFn;
    } else if (meta && "uniqueValues" in meta && meta.uniqueValues?.length) {
      colDef.meta = { filterVariant: "select" };
      colDef.filterFn = multiSelectFilterFn;
    } else {
      colDef.meta = { filterVariant: "text" };
    }

    columns.push(colDef);
  });

  return columns;
}

/**
 * @param {object} props
 * @param {ScoutGroupItem[]} props.scoutGroups
 * @param {string[]} [props.selectedStatistics]
 * @param {Record<string, string[]>} [props.statisticSubQuestions]
 * @param {Record<string, string[] | null>} [props.selectedSubQuestions]
 * @param {Record<string, string>} [props.sectionIdToText]
 * @param {Record<string, string>} [props.questionIdToText]
 */
export default function ScoutGroupTable({
  scoutGroups,
  selectedStatistics = [],
  statisticSubQuestions = {},
  selectedSubQuestions = {},
  sectionIdToText = {},
  questionIdToText = {},
}) {
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

  const selectedColumns = chipDrivenColumns;

  const columnMeta = useMemo(
    () => getColumnMeta(scoutGroups, hierarchy),
    [scoutGroups, hierarchy]
  );

  const rows = useMemo(
    () => transformToRows(scoutGroups, selectedColumns),
    [scoutGroups, selectedColumns]
  );

  const columns = useMemo(
    () => createColumns(selectedColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText),
    [selectedColumns, hierarchy, columnMeta, sectionIdToText, questionIdToText]
  );

  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([{ id: "name", desc: false }]);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
